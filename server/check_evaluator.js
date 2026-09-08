const mongoose = require('mongoose');
require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
  const User = mongoose.model('User');
  
  const evaluator = await User.findOne({ regdNo: 'ynbedseminar2025@gmail.com' });
  if (!evaluator) {
    console.log('Evaluator not found');
    process.exit();
  }

  if (evaluator.groupSubjects && evaluator.groupSubjects.includes('SOCIAL SCIENCES')) {
    evaluator.groupSubjects = evaluator.groupSubjects.filter(sub => sub !== 'SOCIAL SCIENCES');
    await evaluator.save();
    console.log('Removed SOCIAL SCIENCES from ynbedseminar2025@gmail.com');
  } else {
    console.log('SOCIAL SCIENCES was not in the evaluator\'s groupSubjects');
  }

  process.exit();
}).catch(console.error);
