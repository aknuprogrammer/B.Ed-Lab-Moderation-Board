const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const { Subject } = require('../models/MasterData');

/**
 * Generate a Zip stream containing student record PDFs organized into college-wise folders.
 * Optimized for high-scale performance (20,000+ records across all colleges) using MongoDB cursors.
 */
exports.streamBulkRecordsZip = async ({ semester, collegeId, mode, status }, res) => {
  // Prevent response timeouts for large zip streams (set 30-min timeout)
  if (res.socket) {
    res.socket.setTimeout(30 * 60 * 1000);
  }

  const query = {};
  if (mode && mode !== 'all') query.mode = mode;
  if (status && status !== 'all') query.status = status;

  // DB-level filtering for collegeId (only if valid ObjectId)
  if (collegeId && collegeId !== 'all' && collegeId !== 'undefined' && mongoose.Types.ObjectId.isValid(collegeId)) {
    const studentsInCollege = await User.find({ collegeId }).select('_id').lean();
    query.studentId = { $in: studentsInCollege.map(s => s._id) };
  }

  // DB-level filtering for semester
  if (semester && semester !== 'all' && semester !== 'undefined') {
    const semSubjects = await Subject.find({ semester: String(semester) }).select('_id').lean();
    const semSubjectIds = semSubjects.map(s => s._id);
    const semStudents = await User.find({ currentSemester: String(semester) }).select('_id').lean();
    const semStudentIds = semStudents.map(s => s._id);

    const semConditions = [];
    if (semSubjectIds.length > 0) semConditions.push({ subjectId: { $in: semSubjectIds } });
    if (semStudentIds.length > 0) semConditions.push({ studentId: { $in: semStudentIds } });

    if (semConditions.length > 0) {
      if (query.studentId) {
        query.$and = [{ studentId: query.studentId }, { $or: semConditions }];
        delete query.studentId;
      } else {
        query.$or = semConditions;
      }
    }
  }

  const zipFilename = `All_Colleges_Student_Records_${semester && semester !== 'all' ? 'Sem' + semester : 'All'}_${Date.now()}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

  const archive = archiver('zip', { zlib: { level: 5 } });

  archive.on('error', (err) => {
    console.error('Archive generation error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Zip generation failed' });
    }
  });

  archive.pipe(res);

  // Stream records with cursor to maintain low, steady memory usage (~30MB)
  const cursor = Assignment.find(query)
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
    .lean()
    .cursor();

  let processedCount = 0;

  for await (const asg of cursor) {
    if (!asg || !asg.studentId) continue;

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
      const serverUploadPath = path.resolve(__dirname, '..', asg.filePath.replace(/^\//, ''));
      if (fs.existsSync(serverUploadPath)) {
        try {
          const rawBuffer = fs.readFileSync(serverUploadPath);
          pdfBuffer = await stampPdfHeader(rawBuffer, info);
        } catch (e) {
          console.error('Error stamping uploaded PDF:', e);
          try {
            pdfBuffer = fs.readFileSync(serverUploadPath);
          } catch (readErr) {
            pdfBuffer = null;
          }
        }
      }
    }

    // Fallback: Generate an official 1-page Evaluation Summary PDF if PDF file on disk is not present
    if (!pdfBuffer) {
      try {
        pdfBuffer = await generateSummaryPdf(info);
      } catch (genErr) {
        console.error('Error generating summary PDF fallback:', genErr);
      }
    }

    if (pdfBuffer) {
      archive.append(pdfBuffer, { name: zipPath });
      processedCount++;
    }
  }

  // If no records found at all, append an informative README file so ZIP stream finishes cleanly
  if (processedCount === 0) {
    const readmeContent = `NO STUDENT RECORDS FOUND FOR THE SELECTED CRITERIA.\nGenerated At: ${new Date().toISOString()}`;
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
  if (pages.length === 0) return pdfBuffer;

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

  return await pdfDoc.save();
}

/**
 * Generate an official 1-page summary PDF fallback when student PDF file is absent
 */
async function generateSummaryPdf(info) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();

  page.drawText('ADIKAVI NANNAYA UNIVERSITY', {
    x: 50, y: height - 50, size: 16, font: fontBold, color: rgb(0.08, 0.35, 0.45)
  });
  page.drawText('LAB EVALUATION RECORD SUMMARY SHEET', {
    x: 50, y: height - 72, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2)
  });

  page.drawRectangle({
    x: 50, y: height - 120, width: width - 100, height: 32,
    color: info.passFailStatus === 'PASS' ? rgb(0.9, 0.98, 0.93) : rgb(1, 0.92, 0.92),
    borderColor: info.passFailStatus === 'PASS' ? rgb(0.09, 0.63, 0.35) : rgb(0.88, 0.22, 0.22),
    borderWidth: 1
  });

  page.drawText(`RESULT: ${info.passFailStatus}   |   EVALUATED MARKS: ${info.score} / ${info.maxMarks}`, {
    x: 65, y: height - 108, size: 11, font: fontBold,
    color: info.passFailStatus === 'PASS' ? rgb(0.05, 0.45, 0.25) : rgb(0.7, 0.1, 0.1)
  });

  const details = [
    ['Registration No:', info.regdNo],
    ['Student Name:', info.studentName],
    ['Subject Code:', info.subCode],
    ['Subject Name:', info.subName],
    ['Evaluator Name:', info.evaluatorName]
  ];

  let y = height - 165;
  for (const [label, val] of details) {
    page.drawText(label, { x: 50, y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(String(val || 'N/A'), { x: 170, y, size: 10, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    y -= 25;
  }

  return await pdfDoc.save();
}
