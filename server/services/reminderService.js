const cron = require('node-cron');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const { College } = require('../models/MasterData');
const emailService = require('./emailService');

/**
 * Runs the daily reminder check for pending submissions and evaluations
 */
const runDailyReminderCheck = async () => {
  console.log('[CRON] Starting daily deadline check job...');
  
  try {
    const now = new Date();
    
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);

    // --- 1. Students & Principals Reminders (Assignments Pending Submission) ---
    
    const pendingAssignments = await Assignment.find({
      status: 'Pending',
      deadline: {
        $gte: startOfToday,
        $lte: endOfTomorrow
      }
    }).populate('studentId', 'fullName regdNo email collegeId');

    if (pendingAssignments.length > 0) {
      // Group by Student for Student Emails
      const studentsMap = {};
      
      // Group by College for Principal Emails
      const collegesMap = {};

      for (const assignment of pendingAssignments) {
        const student = assignment.studentId;
        if (!student) continue;

        const isToday = assignment.deadline <= endOfToday;
        const daysLeft = isToday ? 0 : 1;

        // Student Map
        if (!studentsMap[student._id]) {
          studentsMap[student._id] = { student, daysLeft, assignments: [] };
        } else {
          if (daysLeft === 0) studentsMap[student._id].daysLeft = 0;
        }
        studentsMap[student._id].assignments.push(assignment);

        // College Map
        if (student.collegeId) {
          if (!collegesMap[student.collegeId]) {
            collegesMap[student.collegeId] = { defaultingStudents: new Map() };
          }
          
          if (!collegesMap[student.collegeId].defaultingStudents.has(student._id.toString())) {
             collegesMap[student.collegeId].defaultingStudents.set(student._id.toString(), {
               name: student.fullName,
               regdNo: student.regdNo,
               email: student.email,
               daysLeft
             });
          } else {
             if (daysLeft === 0) {
               collegesMap[student.collegeId].defaultingStudents.get(student._id.toString()).daysLeft = 0;
             }
          }
        }
      }

      // Send Student Emails
      for (const data of Object.values(studentsMap)) {
        if (data.student.email) {
          await emailService.sendStudentDeadlineReminderEmail({
            to: data.student.email,
            studentName: data.student.fullName || data.student.regdNo,
            daysLeft: data.daysLeft
          });
        }
      }

      // Send Principal Emails
      for (const [collegeId, data] of Object.entries(collegesMap)) {
        const principal = await User.findOne({ role: 'PRINCIPAL', collegeId });
        if (principal && principal.email) {
          const studentsArray = Array.from(data.defaultingStudents.values());
          const overallDaysLeft = studentsArray.some(s => s.daysLeft === 0) ? 0 : 1;
          
          await emailService.sendPrincipalDeadlineReminderEmail({
            to: principal.email,
            principalName: principal.fullName || 'Principal',
            daysLeft: overallDaysLeft,
            defaultingStudents: studentsArray
          });
        }
      }
    }

    // --- 2. Evaluator Reminders (Assignments Pending Evaluation) ---
    
    const pendingEvaluations = await Assignment.find({
      status: 'Submitted', // Meaning it needs evaluation
      valuationDeadline: {
        $gte: startOfToday,
        $lte: endOfTomorrow
      }
    }).populate('evaluatorId', 'fullName regdNo email');

    if (pendingEvaluations.length > 0) {
      const evaluatorsMap = {};

      for (const assignment of pendingEvaluations) {
        const evaluator = assignment.evaluatorId;
        if (!evaluator) continue;

        const isToday = assignment.valuationDeadline <= endOfToday;
        const daysLeft = isToday ? 0 : 1;

        if (!evaluatorsMap[evaluator._id]) {
          evaluatorsMap[evaluator._id] = { evaluator, daysLeft, pendingCount: 0, valuationDeadline: assignment.valuationDeadline };
        } else {
          if (daysLeft === 0) evaluatorsMap[evaluator._id].daysLeft = 0;
        }
        evaluatorsMap[evaluator._id].pendingCount += 1;
      }

      for (const data of Object.values(evaluatorsMap)) {
        if (data.evaluator.email) {
          await emailService.sendEvaluatorDeadlineReminderEmail({
            to: data.evaluator.email,
            evaluatorName: data.evaluator.fullName || data.evaluator.regdNo,
            daysLeft: data.daysLeft,
            pendingCount: data.pendingCount,
            valuationDeadline: data.valuationDeadline
          });
        }
      }
    }
    
    console.log('[CRON] Daily deadline check job completed successfully.');
  } catch (error) {
    console.error('[CRON] Error running daily deadline check:', error);
  }
};

/**
 * Automatically marks pending assignments as "ABS" (Absent) if their submission deadline has passed.
 */
const markMissedDeadlinesAsAbsent = async () => {
  console.log('[CRON] Starting automatic ABS marking job for missed deadlines...');
  try {
    const now = new Date();
    // We want to mark assignments where deadline is STRICTLY before today (start of today).
    // This gives students until 23:59:59 of their deadline day to submit.
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const result = await Assignment.updateMany(
      {
        status: 'Pending',
        deadline: { $lt: startOfToday }
      },
      {
        $set: {
          status: 'Evaluated', // Mark as evaluated to close the loop
          isAbsent: true,
          feedback: 'ABS',
          studentNote: 'Automatically marked absent due to missed submission deadline.'
        },
        $unset: {
          score: "",
          suggestedMarks: ""
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`[CRON] Successfully marked ${result.modifiedCount} missed assignments as ABS.`);
    } else {
      console.log('[CRON] No missed assignments to mark as ABS today.');
    }
  } catch (error) {
    console.error('[CRON] Error running ABS marking job:', error);
  }
};

/**
 * Initializes the cron scheduler
 */
const init = () => {
  // Cron schedule: Run daily at 7:00 AM ('0 7 * * *') for Reminders
  cron.schedule('0 7 * * *', () => {
    runDailyReminderCheck();
  });
  console.log('🗓️ Daily Submission Deadline Reminder Cron Job initialized (Scheduled for 7:00 AM daily).');

  // Cron schedule: Run daily at 00:05 AM ('5 0 * * *') for ABS marking
  cron.schedule('5 0 * * *', () => {
    markMissedDeadlinesAsAbsent();
  });
  console.log('🗓️ Auto-ABS Marking Cron Job initialized (Scheduled for 00:05 AM daily).');

  // Trigger a mock check on service startup in local dev mode if specified
  if (process.env.TRIGGER_REMINDERS_ON_START === 'true') {
    console.log('🚀 Triggering immediate startup reminder scan (TRIGGER_REMINDERS_ON_START = true)');
    runDailyReminderCheck();
    markMissedDeadlinesAsAbsent();
  }
};

module.exports = {
  init,
  runDailyReminderCheck
};
