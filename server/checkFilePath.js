const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/bed_lab_moderation').then(async () => {
  const Assignment = mongoose.model('Assignment', new mongoose.Schema({}, { strict: false }));
  const countSubmitted = await Assignment.countDocuments({ status: 'Submitted' });
  const countWithFilePath = await Assignment.countDocuments({ status: 'Submitted', filePath: { $exists: true, $ne: null, $ne: '' } });
  
  console.log('Total Submitted:', countSubmitted);
  console.log('Total with FilePath:', countWithFilePath);

  if (countSubmitted > countWithFilePath) {
    const missing = await Assignment.findOne({ status: 'Submitted', filePath: { $exists: false } }).lean();
    console.log('Example Missing ID:', missing._id);
  }

  process.exit();
});
