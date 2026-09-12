const User = require('../models/User');
require('../models/MasterData');
const AppError = require('../utils/AppError');
const Assignment = require('../models/Assignment');
const Paper = require('../models/Paper');
const PaperApproval = require('../models/PaperApproval');
const emailService = require('./emailService');

exports.getPendingPrincipals = async () => {
  // Find all users who are Principals and are either pending, approved, or rejected
  const principals = await User.find({
    role: 'PRINCIPAL',
    $or: [
      { isSetupComplete: true },
      { approvalStatus: { $in: ['APPROVED', 'REJECTED'] } }
    ]
  })
  .populate('collegeId', 'collegeCode collegeName')
  .select('regdNo fullName email profileImage collegeId approvalStatus isApproved createdAt updatedAt')
  .lean();

  return principals;
};

exports.approvePrincipal = async (principalId, note) => {
  const principal = await User.findById(principalId);
  if (!principal) {
    throw new AppError('Principal not found.', 404);
  }
  principal.isApproved = true;
  principal.approvalStatus = 'APPROVED';
  await principal.save();

  // Send status email
  if (principal.email) {
    emailService.sendPrincipalRegistrationStatusEmail({
      to: principal.email,
      principalName: principal.fullName,
      status: 'APPROVED',
      note: note
    }).catch(err => console.error('Failed to send principal approval email:', err));
  }

  return principal;
};

exports.rejectPrincipal = async (principalId, note) => {
  const principal = await User.findById(principalId);
  if (!principal) {
    throw new AppError('Principal not found.', 404);
  }
  // Clear principal setup fields completely so they can re-register
  principal.isSetupComplete = false;
  principal.faceDescriptor = [];
  principal.profileImage = null;
  principal.isApproved = false;
  principal.approvalStatus = 'REJECTED';
  principal.password = undefined;
  await principal.save();

  // Send status email
  if (principal.email) {
    emailService.sendPrincipalRegistrationStatusEmail({
      to: principal.email,
      principalName: principal.fullName,
      status: 'REJECTED',
      note: note
    }).catch(err => console.error('Failed to send principal rejection email:', err));
  }

  return { message: 'Principal registration rejected and reset successfully.' };
};

exports.getEvaluatedRecords = async () => {
  const pendingRecords = await Assignment.find({
    status: 'Evaluated',
    bosApprovalStatus: 'PENDING'
  })
  .populate({
    path: 'studentId',
    select: 'fullName regdNo currentSemester academicYear collegeId profileImage',
    populate: { path: 'collegeId', select: 'collegeName' }
  })
  .populate('subjectId', 'subCode subName')
  .populate('evaluatorId', 'fullName')
  .lean();

  const regular = pendingRecords.filter(r => !r.mode || r.mode === 'Regular');
  const supply = pendingRecords.filter(r => r.mode === 'Supply');

  return { regular, supply };
};

exports.approveRecord = async (recordId) => {
  const assignment = await Assignment.findById(recordId);
  if (!assignment) {
    throw new AppError('Record not found.', 404);
  }
  assignment.isApprovedByBOS = true;
  assignment.bosApprovalStatus = 'APPROVED';
  await assignment.save();
  return assignment;
};

exports.approveAllRecords = async (mode) => {
  const query = { 
    $or: [
      { status: 'Evaluated' },
      { isAbsent: true }
    ],
    bosApprovalStatus: { $ne: 'APPROVED' }
  };
  if (mode === 'Supply') {
    query.mode = 'Supply';
  } else {
    query.mode = { $ne: 'Supply' };
  }
  await Assignment.updateMany(query, {
    isApprovedByBOS: true,
    bosApprovalStatus: 'APPROVED'
  });
  return { success: true };
};

exports.getEvaluatedPapers = async () => {
  // 1. Fetch all papers populated with subjects
  const papers = await Paper.find({}).populate('subjectIds').lean();
  
  // 2. Fetch all assignments populated with student & subject
  const assignments = await Assignment.find({})
    .populate({
      path: 'studentId',
      select: 'regdNo fullName currentSemester collegeId',
      populate: { path: 'collegeId', select: 'collegeName' }
    })
    .populate('subjectId', 'subCode subName subPassMarks maxMarks semester')
    .lean();

  // 3. Fetch existing paper approvals
  const approvals = await PaperApproval.find({ approvalStatus: 'APPROVED' }).lean();
  const approvalsSet = new Set(approvals.map(a => `${a.studentId.toString()}_${a.paperId.toString()}_${a.mode}`));

  // 4. Group assignments by student
  const studentMap = {};
  assignments.forEach(asg => {
    const student = asg.studentId;
    if (!student) return;
    const regdNo = student.regdNo;
    if (!studentMap[regdNo]) {
      studentMap[regdNo] = {
        _id: student._id,
        fullName: student.fullName,
        regdNo: regdNo,
        semester: student.currentSemester || "",
        academicYear: student.academicYear || "",
        profileImage: student.profileImage || null,
        collegeName: student.collegeId?.collegeName || "ADIKAVI NANNAYA UNIVERSITY",
        assignments: []
      };
    }
    studentMap[regdNo].assignments.push(asg);
  });

  const pendingRegular = [];
  const pendingSupply = [];

  // 5. Check each student's paper completion
  Object.values(studentMap).forEach(student => {
    const studentAssignments = student.assignments;
    const regularMap = new Map(studentAssignments.filter(a => !a.mode || a.mode === 'Regular').map(a => [a.subjectId?._id?.toString() || a.subjectId?.toString() || '', a]));
    const supplyMap = new Map(studentAssignments.filter(a => a.mode === 'Supply').map(a => [a.subjectId?._id?.toString() || a.subjectId?.toString() || '', a]));

    const buildPaperData = (paper, assignmentMap, mode, fallbackMap = null) => {
      let obtainedScore = 0;
      let paperMaxMarks = 0;
      let evaluatedCount = 0;
      const totalSubjectsCount = paper.subjectIds?.length || 0;
      let hasFailedSubject = false;
      let absentOrMissingCount = 0;

      (paper.subjectIds || []).forEach(sub => {
        const subId = sub._id || sub;
        let assignment = assignmentMap.get(subId.toString());

        if (!assignment && fallbackMap) {
          const fallbackAssignment = fallbackMap.get(subId.toString());
          if (fallbackAssignment) {
            assignment = fallbackAssignment;
          }
        }

        paperMaxMarks += sub.maxMarks || 0;

        if (assignment && assignment.status === 'Evaluated' && !assignment.isAbsent && assignment.score != null) {
          evaluatedCount++;
          obtainedScore += assignment.score || 0;
          const passMark = sub.subPassMarks != null ? sub.subPassMarks : (sub.maxMarks ? sub.maxMarks * 0.4 : 0);
          if (assignment.score < passMark) {
            hasFailedSubject = true;
          }
        } else {
          absentOrMissingCount++;
        }
      });

      let resultStatus = 'PENDING';
      if (absentOrMissingCount === totalSubjectsCount) {
        resultStatus = 'ABSENT';
      } else if (hasFailedSubject || absentOrMissingCount > 0 || obtainedScore < (paper.passMarks || 0)) {
        resultStatus = 'FAIL';
      } else {
        resultStatus = 'PASS';
      }

      return {
        studentId: student._id,
        fullName: student.fullName,
        regdNo: student.regdNo,
        semester: paper.semester || student.semester,
        collegeName: student.collegeName,
        profileImage: student.profileImage,
        paperId: paper._id,
        paperName: paper.paperName || paper.paperCode || "Paper",
        paperCode: paper.paperCode,
        obtainedScore: (absentOrMissingCount === totalSubjectsCount) ? 'ABS' : obtainedScore,
        maxMarks: paperMaxMarks,
        passMarks: paper.passMarks || 0,
        isPassed: resultStatus === 'PASS',
        resultStatus,
        mode
      };
    };

    papers.forEach(paper => {
      // Check Regular
      const hasRegular = paper.subjectIds?.some(sub => regularMap.has(sub._id ? sub._id.toString() : sub.toString()));
      if (hasRegular) {
        const paperScore = buildPaperData(paper, regularMap, 'Regular');
        if (paperScore) {
          const key = `${student._id.toString()}_${paper._id.toString()}_Regular`;
          if (!approvalsSet.has(key)) {
            pendingRegular.push(paperScore);
          }
        }
      }

      // Check Supply
      const hasSupply = paper.subjectIds?.some(sub => supplyMap.has(sub._id ? sub._id.toString() : sub.toString()));
      if (hasSupply) {
        const paperScore = buildPaperData(paper, supplyMap, 'Supply', regularMap);
        if (paperScore) {
          const key = `${student._id.toString()}_${paper._id.toString()}_Supply`;
          if (!approvalsSet.has(key)) {
            pendingSupply.push(paperScore);
          }
        }
      }
    });
  });

  return {
    regular: pendingRegular,
    supply: pendingSupply
  };
};

exports.approvePaper = async (studentId, paperId, mode) => {
  const approval = await PaperApproval.findOneAndUpdate(
    { studentId, paperId, mode },
    { isApprovedByBOS: true, approvalStatus: 'APPROVED' },
    { new: true, upsert: true }
  );
  return approval;
};

exports.approveAllPapers = async (mode) => {
  const pending = await exports.getEvaluatedPapers();
  const list = mode === 'Supply' ? pending.supply : pending.regular;

  if (!list || list.length === 0) return { success: true };

  const ops = list.map(item => ({
    updateOne: {
      filter: { studentId: item.studentId, paperId: item.paperId, mode: item.mode },
      update: { $set: { isApprovedByBOS: true, approvalStatus: 'APPROVED' } },
      upsert: true
    }
  }));

  await PaperApproval.bulkWrite(ops);
  return { success: true };
};
