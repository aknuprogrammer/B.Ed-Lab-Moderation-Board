const archiverMod = require('archiver');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const Assignment = require('../models/Assignment');

/**
 * Robust factory instantiation helper for archiver across v7 / v8+ CommonJS module exports
 */
function createArchiver(format, options) {
  if (format === 'zip' && archiverMod.ZipArchive) {
    return new archiverMod.ZipArchive(options);
  }
  if (format === 'tar' && archiverMod.TarArchive) {
    return new archiverMod.TarArchive(options);
  }
  if (typeof archiverMod === 'function') {
    return archiverMod(format, options);
  }
  if (typeof archiverMod.create === 'function') {
    return archiverMod.create(format, options);
  }
  if (typeof archiverMod.default === 'function') {
    return archiverMod.default(format, options);
  }
  throw new Error('Unsupported archiver module structure');
}

/**
 * Generate a Zip stream containing ONLY student submitted record PDFs organized into college-wise folders.
 * Un-submitted / pending records without student PDF uploads are completely excluded.
 */
exports.streamBulkRecordsZip = async ({ semester, collegeId, courseId, mode, status }, res) => {
  // Prevent response timeouts for large zip streams (set 30-min timeout)
  if (res.socket) {
    res.socket.setTimeout(30 * 60 * 1000);
  }

  const query = {};
  if (mode && mode !== 'all') query.mode = mode;
  if (status && status !== 'all') query.status = status;

  // 1. Fetch matching assignments with populated student, college, course, subject, and evaluator info
  const assignments = await Assignment.find(query)
    .populate({
      path: 'studentId',
      select: 'fullName regdNo currentSemester collegeId courseId',
      populate: [
        { path: 'collegeId', select: 'collegeCode collegeName' },
        { path: 'courseId', select: 'courseCode courseName' }
      ]
    })
    .populate('subjectId', 'subCode subName subPassMarks maxMarks semester')
    .populate('evaluatorId', 'fullName regdNo')
    .lean();

  // 2. Perform safe, bulletproof in-memory filtering for collegeId, courseId, semester, and SUBMITTED status ONLY
  const filteredAssignments = assignments.filter(asg => {
    if (!asg || !asg.studentId) return false;

    // EXPLICIT REQUIREMENT: Only include records that have been submitted by students (must have filePath or status !== 'Pending')
    if (!asg.filePath && asg.status === 'Pending') {
      return false;
    }

    // Filter by collegeId if provided
    if (collegeId && collegeId !== 'all' && collegeId !== 'undefined' && mongoose.Types.ObjectId.isValid(collegeId)) {
      const studentCollId = asg.studentId.collegeId?._id 
        ? String(asg.studentId.collegeId._id) 
        : (asg.studentId.collegeId ? String(asg.studentId.collegeId) : '');
      if (studentCollId !== String(collegeId)) return false;
    }

    // Filter by courseId if provided
    if (courseId && courseId !== 'all' && courseId !== 'undefined' && mongoose.Types.ObjectId.isValid(courseId)) {
      const studentCourseId = asg.studentId.courseId?._id 
        ? String(asg.studentId.courseId._id) 
        : (asg.studentId.courseId ? String(asg.studentId.courseId) : '');
      if (studentCourseId !== String(courseId)) return false;
    }

    // Filter by semester if provided
    if (semester && semester !== 'all' && semester !== 'undefined') {
      const subSem = String(asg.subjectId?.semester || '').trim();
      const stuSem = String(asg.studentId?.currentSemester || '').trim();
      const targetSem = String(semester).trim();
      if (subSem !== targetSem && stuSem !== targetSem) return false;
    }

    return true;
  });

  // 3. Prepare ZIP file entries ONLY for submitted student records
  const zipEntries = [];

  for (const asg of filteredAssignments) {
    const student = asg.studentId || {};
    const college = student.collegeId || {};
    const subject = asg.subjectId || {};
    const evaluator = asg.evaluatorId || {};

    const collegeFolder = college.collegeCode && college.collegeName
      ? `${college.collegeCode} - ${college.collegeName}`.replace(/[/\\?%*:|"<>]/g, '_')
      : 'Unassigned College';

    const regdNo = student.regdNo || 'UNKNOWN';
    const subCode = subject.subCode || 'SUB';
    const score = asg.score != null ? asg.score : 'NA';
    const maxMarks = asg.maxMarks || subject.maxMarks || 50;
    const passMark = subject.subPassMarks != null ? subject.subPassMarks : (maxMarks * 0.4);

    let passFailStatus = 'UNEVALUATED';
    if (asg.status === 'Evaluated' && asg.score != null) {
      passFailStatus = asg.score >= passMark ? 'PASS' : 'FAIL';
    }

    const safeFileName = `${regdNo}_${subCode}_Score-${score}_${passFailStatus}.pdf`.replace(/[/\\?%*:|"<>]/g, '_');
    const zipPath = `${collegeFolder}/${safeFileName}`;

    let pdfBuffer = null;
    const info = {
      regdNo,
      studentName: student.fullName || '',
      subCode,
      subName: subject.subName || asg.groupSubjectName || '',
      score,
      maxMarks,
      passFailStatus,
      evaluatorName: evaluator.fullName || 'Evaluator'
    };

    if (asg.filePath) {
      try {
        const fileNameOnly = path.basename(asg.filePath);
        const serverUploadPath = path.resolve(__dirname, '../uploads', fileNameOnly);
        const altUploadPath = path.resolve(__dirname, '..', asg.filePath.replace(/^\//, ''));
        
        let targetDiskPath = null;
        if (fs.existsSync(serverUploadPath)) {
          targetDiskPath = serverUploadPath;
        } else if (fs.existsSync(altUploadPath)) {
          targetDiskPath = altUploadPath;
        }

        if (targetDiskPath) {
          const rawBuffer = fs.readFileSync(targetDiskPath);
          try {
            pdfBuffer = await stampPdfHeader(rawBuffer, info);
          } catch (stampErr) {
            console.error('Error stamping header, using raw PDF:', stampErr);
            pdfBuffer = rawBuffer;
          }
        }
      } catch (e) {
        console.error('Error reading student uploaded PDF:', e);
      }
    }

    // ONLY append if student has submitted a valid PDF file
    if (pdfBuffer) {
      const finalBuffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
      zipEntries.push({ name: zipPath, buffer: finalBuffer });
    }
  }

  // 4. Set response headers ONLY after all database queries and PDF processing succeeded
  const zipFilename = `Submitted_Student_Records_${semester && semester !== 'all' ? 'Sem' + semester : 'All'}_${Date.now()}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

  const archive = createArchiver('zip', { zlib: { level: 5 } });

  archive.on('error', (err) => {
    console.error('Archive generation error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Zip generation failed' });
    }
  });

  archive.pipe(res);

  for (const entry of zipEntries) {
    archive.append(entry.buffer, { name: entry.name });
  }

  if (zipEntries.length === 0) {
    const readmeContent = `NO SUBMITTED STUDENT RECORDS FOUND FOR THE SELECTED CRITERIA.\nGenerated At: ${new Date().toISOString()}`;
    archive.append(Buffer.from(readmeContent), { name: 'README.txt' });
  }

  await archive.finalize();
};

/**
 * Overlay evaluation marks & Pass/Fail status banner on page 1 of the PDF using pdf-lib
 */
async function stampPdfHeader(pdfBuffer, info) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  if (pages.length === 0) return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const bannerHeight = 24;
  firstPage.drawRectangle({
    x: 10,
    y: height - bannerHeight - 10,
    width: width - 20,
    height: bannerHeight,
    color: info.passFailStatus === 'PASS' ? rgb(0.9, 0.98, 0.93) : (info.passFailStatus === 'FAIL' ? rgb(1, 0.92, 0.92) : rgb(0.95, 0.95, 0.95)),
    borderColor: info.passFailStatus === 'PASS' ? rgb(0.09, 0.63, 0.35) : (info.passFailStatus === 'FAIL' ? rgb(0.88, 0.22, 0.22) : rgb(0.4, 0.4, 0.4)),
    borderWidth: 1,
  });

  const bannerText = `EVALUATED SCORE: ${info.score} / ${info.maxMarks}  |  RESULT: ${info.passFailStatus}  |  EVALUATOR: ${info.evaluatorName}`;
  firstPage.drawText(bannerText, {
    x: 18,
    y: height - bannerHeight + 6,
    size: 9,
    font,
    color: info.passFailStatus === 'PASS' ? rgb(0.05, 0.45, 0.25) : (info.passFailStatus === 'FAIL' ? rgb(0.7, 0.1, 0.1) : rgb(0.2, 0.2, 0.2)),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
