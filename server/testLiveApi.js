require('dotenv').config();
const mongoose = require('mongoose');
async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const admin = await User.findOne({ role: 'ADMIN' });
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: admin._id, role: admin.role, collegeId: admin.collegeId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
  const res = await fetch('https://lab-api.aknu.edu.in/api/admin/assignments', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) { console.log('Fetch failed', res.status); process.exit(1); }
  const data = await res.json();
  console.log('Total records:', data.length);
  if (data.length > 0) {
    const sample = data.find(d => d.status === 'Submitted');
    console.log('Sample Submitted Keys:', Object.keys(sample || data[0]));
    console.log('filePath exists?:', sample?.filePath !== undefined);
  }
  process.exit(0);
}
test();
