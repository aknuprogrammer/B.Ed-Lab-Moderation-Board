require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Assignment = mongoose.model('Assignment', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  const student = await User.findOne({ regdNo: '256249209042' });
  if (student) {
    console.log('Student found:', student.fullName);
    const assignments = await Assignment.find({ studentId: student._id }).lean();
    console.log(`Found ${assignments.length} assignments for student.`);
    for (const a of assignments) {
      console.log(`- Subject: ${a.groupSubjectName || a.subjectId}, Status: ${a.status}, filePath: ${a.filePath}`);
    }
  } else {
    console.log('Student not found.');
  }

  process.exit();
}).catch(console.error);
