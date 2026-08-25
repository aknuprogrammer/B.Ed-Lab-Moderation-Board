const Assignment = require('../../models/Assignment');
const User = require('../../models/User');
const { College, Course, Subject, Group } = require('../../models/MasterData');
const Paper = require('../../models/Paper');
const emailService = require('../emailService');
const AppError = require('../../utils/AppError');

const getSemLevel = (sem) => {
  if (!sem) return 1;
  const s = String(sem).trim().toUpperCase();
  if (s === '1-1' || s === '1' || s === 'I' || s.includes('SEM 1') || s.includes('SEMESTER 1') || s.includes('SEMESTER I')) return 1;
  if (s === '1-2' || s === '2' || s === 'II' || s.includes('SEM 2') || s.includes('SEMESTER 2') || s.includes('SEMESTER II')) return 2;
  if (s === '2-1' || s === '3' || s === 'III' || s.includes('SEM 3') || s.includes('SEMESTER 3') || s.includes('SEMESTER III')) return 3;
  if (s === '2-2' || s === '4' || s === 'IV' || s.includes('SEM 4') || s.includes('SEMESTER 4') || s.includes('SEMESTER IV')) return 4;
  const num = parseInt(s, 10);
  return isNaN(num) ? 1 : num;
};

exports.getAssignmentFilters = async () => {
  const colleges = await College.find().select('collegeCode collegeName');
  const courses = await Course.find().select('courseCode courseName');

  const subjectSems = await Subject.distinct('semester');
  const userSems = await User.distinct('currentSemester', { role: 'STUDENT' });
  const semesters = [...new Set([...subjectSems, ...userSems])].filter(Boolean).sort();

  const groups = await Group.find().select('groupCode groupName');

  return { colleges, courses, semesters, groups };
};

exports.getAssignmentData = async ({ collegeCode, courseCode, semester, groupCode, mode }) => {
  let students = [];
  let subjects = [];

  const studentQuery = { role: 'STUDENT' };
  let shouldFetchStudents = false;

  if (collegeCode) {
    const college = await College.findOne({ collegeCode });
    if (college) studentQuery.collegeId = college._id;
    shouldFetchStudents = true;
  }

  if (courseCode || groupCode) {
    const groupQuery = {};
    if (groupCode) groupQuery.groupCode = groupCode;
    if (courseCode) {
      const course = await Course.findOne({ courseCode });
      if (course) groupQuery.courseId = course._id;
    }
    const groups = await Group.find(groupQuery);
    if (groups.length > 0) {
      studentQuery.groupId = { $in: groups.map(g => g._id) };
    } else {
      studentQuery.groupId = null;
    }
    shouldFetchStudents = true;
  }

  if (semester) {
    shouldFetchStudents = true;
  }

  if (shouldFetchStudents) {
    if (mode === 'Backlog') {
      const BacklogFee = require('../../models/BacklogFee');
      const feeQuery = {};
      if (semester) feeQuery.semester = semester;

      const fees = await BacklogFee.find(feeQuery).lean();
      const backlogRegdNos = [...new Set(fees.map(f => f.regdNo))];

      const backlogQuery = { ...studentQuery, regdNo: { $in: backlogRegdNos } };
      delete backlogQuery.currentSemester;

      students = await User.find(backlogQuery).select('fullName regdNo _id groupId currentSemester').populate('groupId');
    } else {
      const fetchedStudents = await User.find(studentQuery).select('fullName regdNo _id groupId currentSemester').populate('groupId');
      if (semester) {
        const reqSemLevel = getSemLevel(semester);
        students = fetchedStudents.filter(s => getSemLevel(s.currentSemester) === reqSemLevel);
      } else {
        students = fetchedStudents;
      }
    }
  }

  if (semester) {
    subjects = await Subject.find({ semester }).sort({ createdAt: -1 }).lean();

    if (mode === 'Backlog' && students.length > 0) {
      const backlogSubjectIds = new Set();
      const studentIds = students.map(s => s._id);
      const subjectIds = subjects.map(s => s._id);

      const pastAssignments = await Assignment.find({
        studentId: { $in: studentIds },
        subjectId: { $in: subjectIds }
      }).lean();

      const latestAssignments = {};
      pastAssignments.forEach(a => {
        const key = `${a.studentId.toString()}_${a.subjectId.toString()}`;
        if (!latestAssignments[key] || new Date(a.createdAt) > new Date(latestAssignments[key].createdAt)) {
          latestAssignments[key] = a;
        }
      });

      for (const student of students) {
        for (const sub of subjects) {
          const key = `${student._id.toString()}_${sub._id.toString()}`;
          const assignment = latestAssignments[key];

          if (!assignment) {
            backlogSubjectIds.add(sub._id.toString());
          } else if (assignment.status === 'Evaluated') {
            if (assignment.isAbsent) {
              backlogSubjectIds.add(sub._id.toString());
            } else {
              const passMark = sub.subPassMarks != null ? sub.subPassMarks : (sub.maxMarks ? sub.maxMarks * 0.4 : 0);
              if (assignment.score < passMark) {
                backlogSubjectIds.add(sub._id.toString());
              }
            }
          }
        }
      }

      subjects = subjects.filter(sub => backlogSubjectIds.has(sub._id.toString()));
    }
  } else {
    subjects = [];
  }

  const uniqueGroups = new Map();
  students.forEach(s => {
    if (s.groupId) {
      uniqueGroups.set(s.groupId._id.toString(), s.groupId);
    }
  });

  const displaySubjects = [];

  const regularSubjects = subjects.filter(s => s.studentChoice !== 'C' && s.studentChoice !== 'c');
  const choiceSubjects = subjects.filter(s => s.studentChoice === 'C' || s.studentChoice === 'c');
  choiceSubjects.sort((a, b) => a.subCode.localeCompare(b.subCode));

  for (const sub of regularSubjects) {
    displaySubjects.push({ ...sub, isGroupSubject: false });
  }

  for (let i = 0; i < choiceSubjects.length; i++) {
    const sub = choiceSubjects[i];
    if (groupCode && uniqueGroups.size > 0) {
      let pedagogyNames = [];
      for (const [id, group] of uniqueGroups) {
        if (group.subjects && group.subjects.length > 0) {
          const pedIndex = i % group.subjects.length;
          if (group.subjects[pedIndex]) {
            pedagogyNames.push(group.subjects[pedIndex]);
          }
        }
      }
      pedagogyNames = [...new Set(pedagogyNames)];

      displaySubjects.push({
        ...sub,
        subName: pedagogyNames.length > 0 ? `${pedagogyNames.join(' / ')} - ${sub.subName}` : sub.subName,
        isGroupSubject: true
      });
    } else {
      displaySubjects.push({
        ...sub,
        isGroupSubject: true
      });
    }
  }

  return { students, subjects: displaySubjects };
};

exports.getAssignments = async () => {
  return await Assignment.aggregate([
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: 'users',
        localField: 'studentId',
        foreignField: '_id',
        as: 'studentId'
      }
    },
    { $unwind: { path: '$studentId', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'colleges',
        localField: 'studentId.collegeId',
        foreignField: '_id',
        as: 'studentId.collegeId'
      }
    },
    { $unwind: { path: '$studentId.collegeId', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'courses',
        localField: 'studentId.courseId',
        foreignField: '_id',
        as: 'studentId.courseId'
      }
    },
    { $unwind: { path: '$studentId.courseId', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'subjects',
        localField: 'subjectId',
        foreignField: '_id',
        as: 'subjectId'
      }
    },
    { $unwind: { path: '$subjectId', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'evaluatorId',
        foreignField: '_id',
        as: 'evaluatorId'
      }
    },
    { $unwind: { path: '$evaluatorId', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        groupSubjectName: 1,
        maxMarks: 1,
        pagesRequired: 1,
        academicYear: 1,
        deadline: 1,
        suggestedMarksDeadline: 1,
        status: 1,
        mode: 1,
        score: 1,
        feedback: 1,
        studentNote: 1,
        createdAt: 1,
        updatedAt: 1,
        'studentId._id': 1,
        'studentId.fullName': 1,
        'studentId.regdNo': 1,
        'studentId.currentSemester': 1,
        'studentId.collegeId._id': 1,
        'studentId.collegeId.collegeName': 1,
        'studentId.courseId._id': 1,
        'studentId.courseId.courseName': 1,
        'subjectId._id': 1,
        'subjectId.subName': 1,
        'subjectId.subCode': 1,
        'subjectId.type': 1,
        'subjectId.semester': 1,
        'subjectId.maxMarks': 1,
        'subjectId.subPassMarks': 1,
        'evaluatorId._id': 1,
        'evaluatorId.fullName': 1
      }
    }
  ]);
};

exports.getPaperGrades = async (studentId) => {
  if (!studentId) {
    throw new AppError('Student ID is required.', 400);
  }

  const papers = await Paper.find().populate('subjectIds').lean();
  const assignments = await Assignment.find({ studentId }).sort({ createdAt: 1 }).lean();

  const assignmentMap = new Map(
    assignments.map(a => [a.subjectId.toString(), a])
  );

  const paperGrades = papers.map(paper => {
    let obtainedScore = 0;
    let paperMaxMarks = 0;
    let evaluatedCount = 0;
    let totalSubjectsCount = paper.subjectIds?.length || 0;
    let hasFailedSubject = false;
    const subjectsList = [];

    (paper.subjectIds || []).forEach(sub => {
      const assignment = assignmentMap.get(sub._id.toString());
      paperMaxMarks += sub.maxMarks || 0;

      if (assignment && assignment.status === 'Evaluated') {
        if (assignment.isAbsent) {
          hasFailedSubject = true;
          evaluatedCount++;
          
          subjectsList.push({
            subCode: sub.subCode,
            subName: sub.subName,
            score: 'ABS',
            maxMarks: sub.maxMarks,
            status: 'Evaluated'
          });
        } else {
          obtainedScore += assignment.score || 0;
          evaluatedCount++;

          const passMark = sub.subPassMarks != null ? sub.subPassMarks : (sub.maxMarks ? sub.maxMarks * 0.4 : 0);
          if (assignment.score < passMark) {
            hasFailedSubject = true;
          }

          subjectsList.push({
            subCode: sub.subCode,
            subName: sub.subName,
            score: assignment.score,
            maxMarks: sub.maxMarks,
            status: 'Evaluated'
          });
        }
      } else {
        subjectsList.push({
          subCode: sub.subCode,
          subName: sub.subName,
          score: null,
          maxMarks: sub.maxMarks,
          status: assignment ? assignment.status : 'Not Assigned'
        });
      }
    });

    let paperStatus = 'Pending';
    if (totalSubjectsCount > 0) {
      if (evaluatedCount === totalSubjectsCount) paperStatus = 'Evaluated';
      else if (evaluatedCount > 0) paperStatus = 'Partially Evaluated';
    }

    return {
      paperCode: paper.paperCode,
      paperName: paper.paperName,
      semester: paper.semester,
      passMarks: paper.passMarks || 0,
      maxMarks: paperMaxMarks,
      obtainedScore: evaluatedCount > 0 ? obtainedScore : null,
      isPassed: evaluatedCount > 0 ? (!hasFailedSubject && obtainedScore >= (paper.passMarks || 0)) : false,
      status: paperStatus,
      subjects: subjectsList
    };
  });

  return paperGrades;
};

exports.getBacklogCandidates = async () => {
  const BacklogFee = require('../../models/BacklogFee');
  const fees = await BacklogFee.find().lean();

  if (fees.length === 0) return [];

  const regdNos = [...new Set(fees.map(f => f.regdNo))];
  const students = await User.find({ role: 'STUDENT', regdNo: { $in: regdNos } }).lean();
  const subjects = await Subject.find().lean();
  const candidates = [];

  for (const fee of fees) {
    const student = students.find(s => s.regdNo === fee.regdNo);
    if (!student) continue;

    const priorSubjects = subjects.filter(s => s.semester === fee.semester);
    for (const sub of priorSubjects) {
      const assignment = await Assignment.findOne({ studentId: student._id, subjectId: sub._id })
        .sort({ createdAt: -1 })
        .lean();

      if (!assignment) {
        candidates.push({ studentId: student, subjectId: sub, reason: 'Missed', score: null });
      } else if (assignment.status === 'Evaluated') {
        if (assignment.isAbsent) {
          candidates.push({ studentId: student, subjectId: sub, reason: 'Failed (ABS)', score: 'ABS' });
        } else {
          const passMark = sub.subPassMarks != null ? sub.subPassMarks : (sub.maxMarks ? sub.maxMarks * 0.4 : 0);
          if (assignment.score < passMark) {
            candidates.push({ studentId: student, subjectId: sub, reason: 'Failed', score: assignment.score });
          }
        }
      }
    }
  }
  return candidates;
};

exports.bulkAssignBacklogs = async ({ candidates, pagesRequired, academicYear, deadline, createdBy }) => {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new AppError('No candidates provided', 400);
  }

  const uniqueStudentIds = [...new Set(candidates.map(c => c.studentId))];
  const uniqueSubjectIds = [...new Set(candidates.map(c => c.subjectId))];

  const students = await User.find({ _id: { $in: uniqueStudentIds } }).lean();
  const subjects = await Subject.find({ _id: { $in: uniqueSubjectIds } }).lean();

  const studentMap = {};
  students.forEach(s => { studentMap[s._id.toString()] = s; });

  const subjectMap = {};
  subjects.forEach(s => { subjectMap[s._id.toString()] = s; });

  const studentAllocations = {};

  for (const c of candidates) {
    const { studentId, subjectId } = c;
    await Assignment.create({
      studentId,
      subjectId,
      pagesRequired,
      academicYear: academicYear || '',
      deadline,
      createdBy,
      status: 'Pending',
      mode: 'Supply'
    });

    const sIdStr = studentId.toString();
    const subIdStr = subjectId.toString();
    const student = studentMap[sIdStr];
    const subject = subjectMap[subIdStr];
    if (student && subject) {
      if (!studentAllocations[sIdStr]) {
        studentAllocations[sIdStr] = [];
      }
      studentAllocations[sIdStr].push(subject.subName);
    }
  }

  (async () => {
    try {
      for (const [studentId, subjectNames] of Object.entries(studentAllocations)) {
        if (subjectNames.length === 0) continue;
        const student = studentMap[studentId];
        if (student && student.email && student.email.trim() !== '') {
          await emailService.sendStudentAssignmentNotificationEmail({
            to: student.email.trim(),
            studentName: student.fullName,
            subjectNames,
            deadline
          });
        }
      }
    } catch (emailErr) {
      console.error('Failed to send student backlog assignment notification emails:', emailErr.message);
    }
  })();

  return { message: 'Backlog assignments created/updated successfully' };
};
