const User = require('../models/user');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const maxAge = 3 * 24 * 60 * 60;
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: maxAge
  });
};

module.exports.register_post = async (req, res) => {
  const { name, email, password, confirm_password, role } = req.body;
  let errors = [];

  if (!name || !email || !password || !confirm_password || !role) {
    errors.push({ msg: 'Mohon isi semua field yang wajib diisi' });
  }
  if (password !== confirm_password) {
    errors.push({ msg: 'Password tidak cocok' });
  }
  if (password && password.length < 6) {
    errors.push({ msg: 'Password minimal 6 karakter' });
  }
  if (email && !validator.isEmail(email)) {
    errors.push({ msg: 'Email tidak valid' });
  }
  const validRoles = ['customer', 'seller'];
  if (role && !validRoles.includes(role)) {
    errors.push({ msg: 'Pilihan peran tidak valid' });
  }

  if (errors.length > 0) {
    return res.status(400).render('auth/register', {
      errors, name, email, password, confirm_password, role, title: 'Register'
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      errors.push({ msg: 'Email sudah terdaftar' });
      return res.status(400).render('auth/register', {
        errors, name, email, password, confirm_password, role, title: 'Register'
      });
    }

    const user = await User.create({ name, email, password, role });
    const token = createToken(user._id);
    res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
    req.flash('success_msg', 'Registrasi berhasil! Selamat datang.');
    res.status(201).redirect('/dashboard');
  } catch (err) {
    console.error(err);
    errors.push({ msg: 'Terjadi kesalahan server saat registrasi.' });
    res.status(500).render('auth/register', {
      errors, name, email, password, confirm_password, role, title: 'Register'
    });
  }
};

module.exports.login_post = async (req, res) => {
  const { email, password } = req.body;
  let errors = [];

  if (!email || !password) {
    errors.push({ msg: 'Mohon isi email dan password' });
  }
  if (email && !validator.isEmail(email)) {
    errors.push({ msg: 'Format email tidak valid' });
  }

  if (errors.length > 0) {
    return res.status(400).render('auth/login', { errors, email, password, title: 'Login' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      errors.push({ msg: 'Email tidak terdaftar' });
      return res.status(400).render('auth/login', { errors, email, password, title: 'Login' });
    }

    const auth = await user.matchPassword(password);
    if (auth) {
      const token = createToken(user._id);
      res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
      req.flash('success_msg', 'Login berhasil!');
      res.status(200).redirect('/dashboard');
    } else {
      errors.push({ msg: 'Password salah' });
      return res.status(400).render('auth/login', { errors, email, password, title: 'Login' });
    }
  } catch (err) {
    console.error(err);
    errors.push({ msg: 'Terjadi kesalahan server saat login.' });
    res.status(500).render('auth/login', { errors, email, password, title: 'Login' });
  }
};

module.exports.logout_get = (req, res) => {
  res.cookie('jwt', '', { maxAge: 1 });
  req.flash('success_msg', 'Anda telah logout.');
  res.redirect('/login');
};