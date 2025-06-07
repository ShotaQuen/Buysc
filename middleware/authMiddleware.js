const jwt = require('jsonwebtoken');
const User = require('../models/user');
const requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        req.flash('error_msg', 'Sesi tidak valid. Silakan login kembali.');
        res.redirect('/login');
      } else {
        let user = await User.findById(decodedToken.id);
        if (!user) {
            req.flash('error_msg', 'Pengguna tidak ditemukan.');
            return res.redirect('/login');
        }
        req.user = user;
        res.locals.currentUser = user; 
        next();
      }
    });
  } else {
    req.flash('error_msg', 'Anda harus login untuk mengakses halaman ini.');
    res.redirect('/login');
  }
};

const checkUser = (req, res, next) => {
  const token = req.cookies.jwt;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        res.locals.currentUser = null;
        next();
      } else {
        let user = await User.findById(decodedToken.id).select('-password');
        res.locals.currentUser = user;
        req.user = user; 
        next();
      }
    });
  } else {
    res.locals.currentUser = null;
    next();
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      req.flash('error_msg', 'Anda tidak memiliki izin untuk mengakses sumber daya ini.');
      return res.status(403).redirect('/'); 
    }
    next();
  };
};


module.exports = { requireAuth, checkUser, authorizeRoles };