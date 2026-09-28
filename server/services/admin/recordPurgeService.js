const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Assignment = require('../../models/Assignment');
const User = require('../../models/User');
const { Subject, Paper } = require('../../models/MasterData');
const PaperApproval = require('../../models/PaperApproval');

/**
 * Permanently purge assignment database records and delete uploaded PDF files from server disk.
 * Returns count of deleted records and reclaimed disk space in Megabytes (MB).
 */
exports.purgeAssignmentRecords = async ({ semester, collegeId, status, mode, search, resetEvaluators, retainBacklogCandidates = true }) => {
  const query = {};
  if (status && status !== 'all') query.status = status;
  if (mode && mode !== 'all') query.mode = mode;

  if (collegeId && collegeId !== 'all' && collegeId !== 'undefined' && mongoose.Types.ObjectId.isValid(collegeId)) {
    const studentsInCollege = await User.find({ collegeId }).select('_id').lean();
    query.studentId = { $in: studentsInCollege.map(s => s._id) };
  }

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

  // Find target assignments to delete or clean
  const targetAssignments = await Assignment.find(query)
    .select('_id filePath score isAbsent status maxMarks subjectId studentId')
    .populate('subjectId', 'subPassMarks maxMarks')
    .lean();

  if (targetAssignments.length === 0) {
    return { deletedCount: 0, freedSpaceMB: 0, message: 'No records found matching purge criteria.' };
  }

  let totalBytesFreed = 0;
  let deletedFilesCount = 0;

  // Unlink stored PDF files from filesystem for all target assignments
  for (const asg of targetAssignments) {
    if (asg.filePath) {
      try {
        const fullDiskPath = path.resolve(__dirname, '../../..', asg.filePath.replace(/^\//, ''));
        if (fs.existsSync(fullDiskPath)) {
          const stats = fs.statSync(fullDiskPath);
          totalBytesFreed += stats.size || 0;
          fs.unlinkSync(fullDiskPath);
          deletedFilesCount++;
        }
      } catch (err) {
        console.error(`Failed to delete disk file ${asg.filePath}:`, err);
      }
    }
  }

  const passedAssignmentIds = [];
  const backlogCandidateIds = [];

  for (const asg of targetAssignments) {
    const passMark = asg.subjectId?.subPassMarks != null 
      ? asg.subjectId.subPassMarks 
      : ((asg.maxMarks || asg.subjectId?.maxMarks || 100) * 0.4);

    const isPassed = asg.status === 'Evaluated' && !asg.isAbsent && asg.score != null && asg.score >= passMark;

    if (retainBacklogCandidates && !isPassed) {
      backlogCandidateIds.push(asg._id);
    } else {
      passedAssignmentIds.push(asg._id);
    }
  }

  // Completely remove passed records from MongoDB
  let deletedCount = 0;
  if (passedAssignmentIds.length > 0) {
    const deleteResult = await Assignment.deleteMany({ _id: { $in: passedAssignmentIds } });
    deletedCount = deleteResult.deletedCount || passedAssignmentIds.length;
  }

  // For backlog candidates: clear filePath so disk storage is freed, but keep evaluation history
  if (backlogCandidateIds.length > 0) {
    await Assignment.updateMany(
      { _id: { $in: backlogCandidateIds } },
      { $set: { filePath: null } }
    );
  }

  // Clean up associated PaperApprovals
  try {
    const paperApprovalQuery = {};
    if (semester && semester !== 'all' && semester !== 'undefined') {
      const semPapers = await Paper.find({ semester: String(semester) }).select('_id').lean();
      if (semPapers.length > 0) {
        paperApprovalQuery.paperId = { $in: semPapers.map(p => p._id) };
      }
    }
    await PaperApproval.deleteMany(paperApprovalQuery);
  } catch (paErr) {
    console.error('Error cleaning up PaperApprovals during purge:', paErr);
  }

  // If requested or all records purged, reset evaluator subject allocations for fresh semester start
  let evaluatorsReset = false;
  if (resetEvaluators) {
    try {
      await User.updateMany(
        { role: 'EVALUATOR' },
        { $set: { subjects: [], groupSubjects: [] } }
      );
      evaluatorsReset = true;
    } catch (evalErr) {
      console.error('Error resetting evaluator allocations during purge:', evalErr);
    }
  }

  const freedSpaceMB = (totalBytesFreed / (1024 * 1024)).toFixed(2);

  return {
    deletedCount,
    retainedBacklogCount: backlogCandidateIds.length,
    deletedFilesCount,
    freedSpaceMB: Number(freedSpaceMB),
    evaluatorsReset,
    message: retainBacklogCandidates 
      ? `Successfully purged ${deletedCount} passed records (${backlogCandidateIds.length} backlog candidates retained) and reclaimed ${freedSpaceMB} MB disk space.`
      : `Successfully purged all ${deletedCount} records and reclaimed ${freedSpaceMB} MB disk space.`
  };
};
