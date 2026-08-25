const mongoose = require('mongoose');
const Assignment = require('../../models/Assignment');
const User = require('../../models/User');
const { Subject, Group } = require('../../models/MasterData');

/**
 * Fetch Student Evaluation Report records optimized for high scale (20,000+ records).
 */
exports.getEvaluationReport = async ({ collegeId, courseId, semester, status, evaluatorAssigned, search, mode }) => {
  const query = {};
  if (status && status !== 'all') query.status = status;
  if (mode && mode !== 'all') query.mode = mode;

  if (evaluatorAssigned === 'assigned') {
    query.evaluatorId = { $ne: null };
  } else if (evaluatorAssigned === 'unassigned') {
    query.evaluatorId = null;
  }

  // DB-level filtering for College or Course or Search term on Students
  const studentQuery = { role: 'STUDENT' };
  let applyStudentQuery = false;

  if (collegeId && collegeId !== 'all' && collegeId !== 'undefined' && mongoose.Types.ObjectId.isValid(collegeId)) {
    studentQuery.collegeId = collegeId;
    applyStudentQuery = true;
  }

  if (courseId && courseId !== 'all' && courseId !== 'undefined' && mongoose.Types.ObjectId.isValid(courseId)) {
    const groupsInCourse = await Group.find({ courseId }).select('_id').lean();
    if (groupsInCourse.length > 0) {
      studentQuery.groupId = { $in: groupsInCourse.map(g => g._id) };
    } else {
      studentQuery.groupId = null;
    }
    applyStudentQuery = true;
  }

  if (applyStudentQuery) {
    const matchingStudents = await User.find(studentQuery).select('_id').lean();
    query.studentId = { $in: matchingStudents.map(s => s._id) };
  }

  // DB-level filtering for Semester
  if (semester && semester !== 'all' && semester !== 'undefined') {
    const semSubjects = await Subject.find({ semester: String(semester) }).select('_id').lean();
    const semSubjectIds = semSubjects.map(s => s._id);

    const semStudents = await User.find({ currentSemester: String(semester) }).select('_id').lean();
    const semStudentIds = semStudents.map(s => s._id);

    const semOrConditions = [];
    if (semSubjectIds.length > 0) semOrConditions.push({ subjectId: { $in: semSubjectIds } });
    if (semStudentIds.length > 0) semOrConditions.push({ studentId: { $in: semStudentIds } });

    if (semOrConditions.length > 0) {
      if (query.studentId) {
        query.$and = [{ studentId: query.studentId }, { $or: semOrConditions }];
        delete query.studentId;
      } else {
        query.$or = semOrConditions;
      }
    }
  }

  // If search query is provided, match registration number or name at DB level
  if (search && search.trim()) {
    const q = search.trim();
    const searchStudents = await User.find({
      role: 'STUDENT',
      $or: [
        { regdNo: { $regex: q, $options: 'i' } },
        { fullName: { $regex: q, $options: 'i' } }
      ]
    }).select('_id').lean();

    const searchSubjects = await Subject.find({
      $or: [
        { subCode: { $regex: q, $options: 'i' } },
        { subName: { $regex: q, $options: 'i' } }
      ]
    }).select('_id').lean();

    const searchEvaluators = await User.find({
      role: 'EVALUATOR',
      $or: [
        { regdNo: { $regex: q, $options: 'i' } },
        { fullName: { $regex: q, $options: 'i' } }
      ]
    }).select('_id').lean();

    const searchConditions = [
      { studentId: { $in: searchStudents.map(s => s._id) } },
      { subjectId: { $in: searchSubjects.map(s => s._id) } },
      { evaluatorId: { $in: searchEvaluators.map(e => e._id) } },
      { groupSubjectName: { $regex: q, $options: 'i' } }
    ];

    if (query.$and) {
      query.$and.push({ $or: searchConditions });
    } else {
      query.$and = [{ $or: searchConditions }];
    }
  }

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
    .populate('evaluatorId', 'fullName regdNo email')
    .sort({ createdAt: -1 })
    .lean();

  return assignments.map(a => {
    const student = a.studentId || {};
    const college = student.collegeId || {};
    const course = student.courseId || {};
    const subject = a.subjectId || {};
    const evaluator = a.evaluatorId || {};

    const maxMarks = a.maxMarks || subject.maxMarks || 50;
    const passMark = subject.subPassMarks != null ? subject.subPassMarks : (maxMarks * 0.4);

    let resultStatus = 'PENDING';
    let scoreDisplay = a.score != null ? a.score : 'N/A';

    if (a.isAbsent) {
      resultStatus = 'FAIL';
      scoreDisplay = 'ABS';
    } else if (a.status === 'Evaluated' && a.score != null) {
      resultStatus = a.score >= passMark ? 'PASS' : 'FAIL';
    } else if (a.status === 'Submitted') {
      resultStatus = 'UNDER EVALUATION';
    }

    return {
      _id: a._id,
      regdNo: student.regdNo || 'N/A',
      studentName: student.fullName || 'N/A',
      collegeCode: college.collegeCode || 'N/A',
      collegeName: college.collegeName || 'N/A',
      courseCode: course.courseCode || 'N/A',
      courseName: course.courseName || 'N/A',
      semester: subject.semester || student.currentSemester || 'N/A',
      subjectCode: subject.subCode || 'N/A',
      subjectName: subject.subName || a.groupSubjectName || 'N/A',
      mode: a.mode || 'Regular',
      status: a.status,
      score: scoreDisplay,
      maxMarks,
      passMark,
      resultStatus,
      evaluatorName: evaluator.fullName || (a.evaluatorId ? 'Assigned' : 'Unassigned'),
      evaluatorEmail: evaluator.regdNo || evaluator.email || 'N/A',
      submittedAt: a.submittedAt || null,
      updatedAt: a.updatedAt || a.createdAt,
      collegeIdStr: college._id ? String(college._id) : '',
      courseIdStr: course._id ? String(course._id) : '',
      hasFile: !!a.filePath,
      isAbsent: !!a.isAbsent
    };
  });
};
