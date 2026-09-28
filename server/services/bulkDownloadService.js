const archiverMod = require('archiver');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
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
 * Generate a Zip stream containing student submitted record PDFs organized into college-wise folders.
 * Fully dynamic: supports any semester (Semester 1, 2, 3, 4, etc.), collegeId, courseId, status, and mode.
 * Streams files directly from disk without memory buffering or timeouts.
 * Skips any missing or unreadable files on disk without breaking the bulk download stream.
 */
exports.streamBulkRecordsZip = async ({ semester, collegeId, courseId, mode, status }, res, req) => {
  // 1. Prevent request and response timeouts for large zip streams (unlimited)
  if (req) {
    req.setTimeout(0);
    if (req.socket) {
      req.socket.setTimeout(0);
      req.socket.setKeepAlive(true, 10000);
    }
  }
  if (res) {
    res.setTimeout(0);
    if (res.socket) {
      res.socket.setTimeout(0);
      res.socket.setKeepAlive(true, 10000);
    }
  }

  // 2. Ensure CORS and streaming headers are set immediately
  const origin = req?.headers?.origin || 'https://educationmod.aknu.edu.in';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx proxy buffering completely
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  const query = {
    status: { $in: ['Submitted', 'Evaluated'] },
    filePath: { $exists: true, $ne: null }
  };
  if (mode && mode !== 'all') query.mode = mode;
  if (status && status !== 'all') query.status = status;

  // 3. Fetch matching assignments with populated student, college, course, and subject info
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

  // 4. Perform safe in-memory filtering for collegeId, courseId, and semester
  const filteredAssignments = assignments.filter(asg => {
    if (!asg || !asg.studentId) return false;
    if (!asg.filePath) return false;

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

  // 5. Construct descriptive filename
  let collegeTag = 'All';
  if (collegeId && collegeId !== 'all' && filteredAssignments.length > 0) {
    const coll = filteredAssignments[0].studentId?.collegeId;
    if (coll?.collegeCode) {
      collegeTag = coll.collegeCode;
    }
  }
  const zipFilename = `Submitted_Student_Records_${collegeTag}_${semester && semester !== 'all' ? 'Sem' + semester : 'All'}_${Date.now()}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

  // 6. Initialize Archiver with ZIP64 enabled (crucial for > 4GB or > 65k entries) and fast compression
  const archive = createArchiver('zip', {
    forceZip64: true,
    zlib: { level: 1 }
  });

  let isAborted = false;
  const abortHandler = () => {
    isAborted = true;
    try {
      archive.abort();
    } catch (_) {}
  };
  req?.on('close', abortHandler);
  res.on('close', abortHandler);

  archive.on('warning', (err) => {
    console.warn('[BulkDownload] Archiver warning:', err.message);
  });

  archive.on('error', (err) => {
    console.error('[BulkDownload] Archive generation error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Zip generation failed', error: err.message });
    } else {
      res.end();
    }
  });

  archive.pipe(res);

  let addedCount = 0;
  const skippedRecords = [];
  const usedZipPaths = new Set();

  // 7. Stream each available PDF directly from disk to the archive, skipping missing ones
  for (const asg of filteredAssignments) {
    if (isAborted) break;

    const student = asg.studentId || {};
    const college = student.collegeId || {};
    const subject = asg.subjectId || {};

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

    if (asg.filePath) {
      try {
        const fileNameOnly = path.basename(asg.filePath);
        const candidatePaths = [
          path.resolve(__dirname, '../uploads', fileNameOnly),
          path.resolve(process.cwd(), 'uploads', fileNameOnly),
          path.resolve(__dirname, '..', asg.filePath.replace(/^\//, '')),
          path.resolve(process.cwd(), asg.filePath.replace(/^\//, ''))
        ];

        let targetDiskPath = null;
        for (const cand of candidatePaths) {
          try {
            if (fs.existsSync(cand)) {
              const stat = fs.statSync(cand);
              if (stat.isFile() && stat.size > 0) {
                targetDiskPath = cand;
                break;
              }
            }
          } catch (_) {}
        }

        // If the physical file is not found on disk, SKIP IT SILENTLY and record in skipped list
        if (!targetDiskPath) {
          skippedRecords.push({
            regdNo,
            studentName: student.fullName || 'Unknown',
            college: college.collegeCode || 'Unknown',
            subjectCode: subCode,
            filePath: asg.filePath
          });
          continue;
        }

        // Generate unique zip path
        const baseFileName = `${regdNo}_${subCode}_Score-${score}_${passFailStatus}`.replace(/[/\\?%*:|"<>]/g, '_');
        let finalZipPath = `${collegeFolder}/${baseFileName}.pdf`;
        let counter = 1;
        while (usedZipPaths.has(finalZipPath)) {
          finalZipPath = `${collegeFolder}/${baseFileName}_(${counter}).pdf`;
          counter++;
        }
        usedZipPaths.add(finalZipPath);

        // Add file to ZIP stream
        archive.file(targetDiskPath, { name: finalZipPath });
        addedCount++;
      } catch (e) {
        console.warn(`[BulkDownload] Skipping problematic record for ${regdNo}:`, e.message);
      }
    }
  }

  // 8. If any records were skipped because files were missing from disk, include an explanatory text file
  if (skippedRecords.length > 0) {
    const reportHeader = `SKIPPED RECORDS SUMMARY (${skippedRecords.length} records missing from disk storage)\n` +
      `Generated At: ${new Date().toISOString()}\n` +
      `Note: The following records were submitted in the system but their physical PDF files were not found on the server disk.\n` +
      `All other available records (${addedCount} files) were successfully included in this ZIP.\n` +
      `----------------------------------------------------------------------------------------------------\n` +
      `Roll No       | College | Subject   | Student Name                   | File Path\n` +
      `----------------------------------------------------------------------------------------------------\n`;
    const reportRows = skippedRecords.map(r => 
      `${(r.regdNo || '').padEnd(14)}| ${(r.college || '').padEnd(8)}| ${(r.subjectCode || '').padEnd(10)}| ${(r.studentName || '').padEnd(31)}| ${r.filePath}`
    ).join('\n');
    
    archive.append(Buffer.from(reportHeader + reportRows), { name: '_SKIPPED_RECORDS_REPORT.txt' });
  }

  // 9. If literally 0 files were found on disk, include a README so the ZIP is still a valid archive
  if (addedCount === 0) {
    const readmeContent = `NO ACCESSIBLE SUBMITTED STUDENT RECORD PDFS FOUND ON SERVER DISK FOR THE SELECTED CRITERIA.\n` +
      `Matching DB Records: ${filteredAssignments.length}\n` +
      `Missing from Disk: ${skippedRecords.length}\n` +
      `Generated At: ${new Date().toISOString()}`;
    archive.append(Buffer.from(readmeContent), { name: 'README.txt' });
  }

  // 10. Finalize the archive stream
  await archive.finalize();
};
