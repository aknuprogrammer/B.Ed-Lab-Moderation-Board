const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const studentController = require('../controllers/studentController');
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const handleRecordUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds the maximum 5MB limit.' });
      }
      return res.status(400).json({ message: err.message || 'File upload failed.' });
    }
    next();
  });
};

// Middleware for student routes
router.use(protect);

router.get('/assignments', studentController.getMyAssignments);
router.post('/assignments/:assignmentId/submit', handleRecordUpload, studentController.submitAssignment);
router.post('/assignments/:assignmentId/log-download', studentController.logDownload);
router.get('/paper-grades', adminController.getPaperGrades);

module.exports = router;
