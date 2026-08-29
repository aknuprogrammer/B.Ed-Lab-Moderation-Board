require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Assignment = mongoose.model('Assignment', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  const student = await User.findOne({ regdNo: '256249209042' });
  if (student) {
    const principalService = require('./services/principalService');
    const records = await principalService.getCollegeRecords(student.collegeId);
    console.log(`Principal records for college ${student.collegeId}: ${records.length}`);
    const studentRecords = records.filter(r => String(r.studentId._id) === String(student._id));
    console.log(`Found ${studentRecords.length} records for student in Principal portal.`);
    for (const r of studentRecords) {
      console.log(`- Subject: ${r.subjectId?.subName}, Status: ${r.status}, filePath: ${r.filePath}`);
    }
  }

  process.exit();
}).catch(console.error);
