const Assignment = require('../models/Assignment');
const User = require('../models/User');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const stringSimilarity = require('string-similarity');
const AppError = require('../utils/AppError');

exports.getMyAssignments = async (user) => {
  const studentId = user._id;

  const assignments = await Assignment.find({ studentId })
    .populate({
      path: 'studentId',
      select: 'fullName regdNo currentSemester',
      populate: [
        { path: 'collegeId', select: 'collegeName' },
        { path: 'courseId', select: 'courseName' },
        { path: 'groupId', select: 'groupName' }
      ]
    })
    .populate('subjectId')
    .lean();

  const activeSemester = user.currentSemester || '';
  const filtered = assignments.filter(assignment => {
    const subSemester = assignment.subjectId?.semester || '';
    
    if (subSemester === activeSemester) {
      return true;
    }
    
    if (assignment.mode === 'Supply' && assignment.status !== 'Evaluated') {
      return true;
    }
    
    return false;
  });

  return filtered;
};

exports.submitAssignment = async ({ assignmentId, file, user, note, extractedText: clientExtractedText }) => {
  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  const fileUrl = `/uploads/${file.filename || file.originalname}`;

  const assignment = await Assignment.findOne({ _id: assignmentId, studentId: user._id }).populate('subjectId');
  if (!assignment) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new AppError('Assignment not found', 404);
  }

  const isGroupSubject = !!assignment.groupSubjectName;
  const semester = String(assignment.subjectId?.semester);
  const isEligibleFor5MB = isGroupSubject && (semester === '3' || semester === '4');
  
  const MAX_SIZE = isEligibleFor5MB ? 5 * 1024 * 1024 : 3 * 1024 * 1024;
  
  if (file.size > MAX_SIZE) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new AppError(`File size exceeds the limit. ${isEligibleFor5MB ? 'Max 5MB allowed for this group subject.' : 'Max 3MB allowed for this subject.'}`, 400);
  }

  if (assignment.status === 'Evaluated') {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new AppError('Evaluation has already completed. You cannot change this record.', 400);
  }

  if (assignment.deadline) {
    const deadlineDate = new Date(assignment.deadline);
    deadlineDate.setHours(23, 59, 59, 999);
    if (new Date() > deadlineDate) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new AppError('The submission deadline has passed. You can no longer upload records.', 400);
    }
  }

  let serverExtractedText = '';
  try {
    const dataBuffer = fs.readFileSync(file.path);

    // Inspect Certificate Page (Pages 1 & 2) for digitally superimposed signature overlays or digital annotations
    const { inspectPdfSignatureLiveness } = require('../utils/pdfInspector');
    const inspectionResult = await inspectPdfSignatureLiveness(dataBuffer);
    if (inspectionResult.isDigitallySignedImageOverlay) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new AppError(inspectionResult.reason || 'Digitally pasted signature image overlay detected on Certificate Page. Please scan and upload the physical paper record signed by your Principal.', 400);
    }
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(dataBuffer, { max: 2 });
    const extractedUpper = (pdfData.text || '').toUpperCase();
    const cleanExtracted = extractedUpper.replace(/[^A-Z0-9]/g, '');
    
    // 1. Verify Regd No
    const regdNo = user.regdNo ? user.regdNo.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
    if (regdNo && !cleanExtracted.includes(regdNo)) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new AppError(`Document Verification Failed: We could not find your Registration Number (${user.regdNo}) on the certificate page. Please ensure you are uploading your own record.`, 400);
    }
    
    // 2. Verify Subject Code or Name
    const subCode = assignment.subjectId?.subCode ? assignment.subjectId.subCode.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
    const subName = assignment.groupSubjectName || assignment.subjectId?.subName || '';
    
    let subjectMatched = false;
    
    if (subCode && subCode.length > 2 && cleanExtracted.includes(subCode)) {
      subjectMatched = true;
    } else if (subName) {
      const words = subName.toUpperCase().split(/[\s\W]+/).filter(w => w.length > 3);
      if (words.length > 0) {
        let matchedWords = 0;
        for (const w of words) {
           if (extractedUpper.includes(w)) matchedWords++;
        }
        if (matchedWords / words.length >= 0.5) {
           subjectMatched = true;
        }
      } else {
        // If no long words, fallback to matching the raw string (ignoring spaces/symbols)
        const cleanSubName = subName.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (cleanSubName && cleanExtracted.includes(cleanSubName)) {
          subjectMatched = true;
        }
      }
    }
    
    if (!subjectMatched) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new AppError(`Document Verification Failed: We could not find the Subject Code or Name for this assignment on the certificate pages. Please ensure you are uploading the correct subject record.`, 400);
    }
  } catch (parseError) {
    if (parseError.statusCode) throw parseError;
    console.error('PDF Parse Error:', parseError);
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new AppError('Document Verification Failed: We could not process this file. Please ensure you are uploading a valid, standard PDF file and not a corrupted document.', 400);
  }

  assignment.status = 'Submitted';
  assignment.filePath = fileUrl;
  assignment.submittedAt = new Date();
  if (note) assignment.studentNote = note;
  
  assignment.extractedText = 'QR_VERIFIED_SUCCESS';

  // Auto-routing to assigned evaluators
  if (!assignment.evaluatorId) {
    let evalQuery = { role: 'EVALUATOR' };
    if (assignment.groupSubjectName) {
      evalQuery.groupSubjects = assignment.groupSubjectName;
    } else if (assignment.subjectId) {
      evalQuery.subjects = assignment.subjectId._id || assignment.subjectId;
    }
    
    const assignedEvaluators = await User.find(evalQuery).select('_id');
    if (assignedEvaluators.length > 0) {
      // Pick random evaluator for basic load balancing
      const randomIdx = Math.floor(Math.random() * assignedEvaluators.length);
      assignment.evaluatorId = assignedEvaluators[randomIdx]._id;
    }
  }

  await assignment.save();

  return { message: 'Record verified and submitted successfully', assignment };
};
