require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Assignment = mongoose.model('Assignment', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  const student = await User.findOne({ regdNo: '256249209042' });
  if (student) {
    const assignments = await Assignment.find({ studentId: student._id }).lean();
    console.log('Total assignments for this student:', assignments.length);
    assignments.forEach(a => {
      console.log(`_id: ${a._id}, subjectId: ${a.subjectId}, mode: ${a.mode}, status: ${a.status}, filePath: ${a.filePath ? 'YES' : 'NO'}`);
    });
  }
  process.exit();
}).catch(console.error);
