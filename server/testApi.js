require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  // Find an admin user
  const admin = await User.findOne({ role: 'ADMIN' });
  
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: admin._id, role: admin.role, collegeId: admin.collegeId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
  try {
    const res = await fetch('http://localhost:5000/api/admin/assignments', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = await res.json();
    console.log(Object.keys(data));
    console.log(typeof data);
    console.log(data.message || data.error || 'No error message');
  } catch (err) {
    console.error(err.message);
  }
  process.exit(0);
}

test();
