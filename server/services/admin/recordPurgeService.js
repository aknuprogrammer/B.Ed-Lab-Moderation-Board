const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Assignment = require('../../models/Assignment');
const User = require('../../models/User');
const { Subject } = require('../../models/MasterData');

/**
 * Permanently purge assignment database records and delete uploaded PDF files from server disk.
 * Returns count of deleted records and reclaimed disk space in Megabytes (MB).
 */
exports.purgeAssignmentRecords = async ({ semester, collegeId, status, mode, search }) => {
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

  // Find target assignments to delete
  const targetAssignments = await Assignment.find(query).select('_id filePath').lean();
  if (targetAssignments.length === 0) {
    return { deletedCount: 0, freedSpaceMB: 0, message: 'No records found matching purge criteria.' };
  }

  let totalBytesFreed = 0;
  let deletedFilesCount = 0;

  // Unlink stored PDF files from filesystem
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

  const targetIds = targetAssignments.map(a => a._id);
  const deleteResult = await Assignment.deleteMany({ _id: { $in: targetIds } });

  const freedSpaceMB = (totalBytesFreed / (1024 * 1024)).toFixed(2);

  return {
    deletedCount: deleteResult.deletedCount || targetAssignments.length,
    deletedFilesCount,
    freedSpaceMB: Number(freedSpaceMB),
    message: `Successfully purged ${deleteResult.deletedCount || targetAssignments.length} records and reclaimed ${freedSpaceMB} MB disk space.`
  };
};
