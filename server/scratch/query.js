const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Assignment = mongoose.model('Assignment', new mongoose.Schema({}, { strict: false, collection: 'assignments' }));
  const docs = await Assignment.find({ filePath: { $exists: true } }).select('filePath').limit(10).lean();
  console.log(JSON.stringify(docs, null, 2));
  process.exit();
}).catch(console.error);
