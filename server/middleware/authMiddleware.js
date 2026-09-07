const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
      req.user = await User.findById(decoded.id).select('-password');
      
      // Removed single concurrent session logic to allow multiple users to log in at the same time

      next();
    } catch (error) {
      res.status(401).json({ message: error.message || 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

exports.adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SYSTEM_ADMIN')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

exports.systemAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'SYSTEM_ADMIN') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a system admin' });
  }
};

exports.evaluatorOnly = (req, res, next) => {
  if (req.user && req.user.role === 'EVALUATOR') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an evaluator' });
  }
};

exports.principalOnly = (req, res, next) => {
  if (req.user && req.user.role === 'PRINCIPAL') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a principal' });
  }
};
