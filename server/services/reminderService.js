const cron = require('node-cron');
const Assignment = require('../models/Assignment');

/**
 * Daily reminder emails have been disabled to conserve ZeptoMail email quota limits.
 * Students and principals will no longer receive automated reminder emails.
 */
const runDailyReminderCheck = async () => {
  console.log('[CRON] Daily deadline reminder emails are disabled to conserve ZeptoMail quota.');
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
  // NOTE: Daily 7:00 AM submission deadline reminder emails removed to preserve ZeptoMail credits.

  // Cron schedule: Run daily at 00:05 AM ('5 0 * * *') for ABS marking
  cron.schedule('5 0 * * *', () => {
    markMissedDeadlinesAsAbsent();
  });
  console.log('🗓️ Auto-ABS Marking Cron Job initialized (Scheduled for 00:05 AM daily).');
};

module.exports = {
  init,
  runDailyReminderCheck,
  markMissedDeadlinesAsAbsent
};
