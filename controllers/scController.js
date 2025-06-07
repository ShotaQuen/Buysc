const SourceCode = require('../models/sourceCode');
const User = require('../models/user');
const fs = require('fs');

module.exports.create_sc_post = async (req, res) => {
  const { title, description, category, tags, price_buy_str, is_for_rent_only, demoUrl, techStack } = req.body;
  const rental_durations = req.body.rental_duration;
  const rental_prices_str = req.body.rental_price;

  let errors = [];

  if (req.fileValidationError) {
    errors.push({ msg: req.fileValidationError });
  }

  if (!req.files || !req.files.sc_file || req.files.sc_file.length === 0) {
      errors.push({ msg: 'File source code (SC) wajib diunggah.' });
  }

  if (!title || !description || !category) {
    errors.push({ msg: 'Judul, deskripsi, dan kategori wajib diisi.' });
  }

  const price_buy = price_buy_str ? parseFloat(price_buy_str) : null;
  const forRentOnly = is_for_rent_only === 'on';

  if (!forRentOnly && (price_buy === null || isNaN(price_buy) || price_buy <= 0)) {
      errors.push({ msg: 'Harga beli harus angka positif jika SC untuk dijual.' });
  }
  if (forRentOnly && (!rental_durations || rental_durations.length === 0)) {
      errors.push({ msg: 'Jika hanya untuk disewa, opsi sewa harus ditambahkan.' });
  }

  let rental_options = [];
  if (rental_durations && rental_prices_str) {
    const durations = Array.isArray(rental_durations) ? rental_durations : [rental_durations];
    const prices = Array.isArray(rental_prices_str) ? rental_prices_str : [rental_prices_str];

    if (durations.length !== prices.length) {
        errors.push({msg: 'Jumlah durasi dan harga sewa tidak cocok.'});
    } else {
        for (let i = 0; i < durations.length; i++) {
            const price = parseFloat(prices[i]);
            if (!durations[i] || isNaN(price) || price <= 0) {
                errors.push({ msg: `Opsi sewa ke-${i+1} tidak valid.` });
                continue;
            }
            let durationDays;
            switch (durations[i].toLowerCase()) {
                case '1 minggu': durationDays = 7; break;
                case '1 bulan': durationDays = 30; break;
                case '3 bulan': durationDays = 90; break;
                case '6 bulan': durationDays = 180; break;
                case '1 tahun': durationDays = 365; break;
                default: errors.push({ msg: `Durasi sewa "${durations[i]}" tidak dikenal.`}); continue;
            }
            rental_options.push({ duration: durations[i], durationDays, price });
        }
    }
  }

  if (errors.length > 0) {
    if (req.files) {
        if (req.files.sc_file && req.files.sc_file[0] && req.files.sc_file[0].path) {
            fs.unlink(req.files.sc_file[0].path, err => { if (err) console.error("Error deleting sc_file on validation fail:", err); });
        }
        if (req.files.screenshots && req.files.screenshots.length > 0) {
            req.files.screenshots.forEach(file => {
                if (file.path) fs.unlink(file.path, err => { if (err) console.error("Error deleting screenshot on validation fail:", err); });
            });
        }
    }
    return res.status(400).render('sc/add', {
      errors, title, description, category, tags, price_buy_str, is_for_rent_only, demoUrl, techStack,
      rental_options_data: rental_options,
      titlePage: 'Tambah Source Code'
    });
  }

  try {
    let scFilePath = '';
    if (req.files && req.files.sc_file && req.files.sc_file[0]) {
        scFilePath = req.files.sc_file[0].path.replace(/\\/g, "/");
    }

    let screenshotPaths = [];
    if (req.files && req.files.screenshots && req.files.screenshots.length > 0) {
        screenshotPaths = req.files.screenshots.map(file => file.path.replace(/\\/g, "/"));
    }

    let currentStatus = 'pending_approval';
    if (req.user.role === 'admin' || req.user.role === 'seller') {
        currentStatus = 'approved';
    }

    const newSc = new SourceCode({
      title,
      description,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      price_buy: forRentOnly ? null : price_buy,
      rental_options: rental_options.length > 0 ? rental_options : undefined,
      is_for_rent_only: forRentOnly,
      seller: req.user._id,
      filePath: scFilePath,
      screenshots: screenshotPaths,
      demoUrl,
      techStack: techStack ? techStack.split(',').map(ts => ts.trim()) : [],
      status: currentStatus
    });

    await newSc.save();
    if (currentStatus === 'approved') {
        req.flash('success_msg', 'Source code berhasil ditambahkan dan langsung disetujui.');
    } else {
        req.flash('success_msg', 'Source code berhasil ditambahkan dan menunggu approval.');
    }
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    if (req.files) {
        if (req.files.sc_file && req.files.sc_file[0] && req.files.sc_file[0].path) {
            fs.unlink(req.files.sc_file[0].path, e => { if (e) console.error("Error deleting sc_file on db save fail:", e); });
        }
        if (req.files.screenshots && req.files.screenshots.length > 0) {
            req.files.screenshots.forEach(file => {
                if(file.path) fs.unlink(file.path, e => { if (e) console.error("Error deleting screenshot on db save fail:", e); });
            });
        }
    }
    errors.push({ msg: 'Terjadi kesalahan server saat menambahkan source code.' });
    res.status(500).render('sc/add', {
      errors, title, description, category, tags, price_buy_str, is_for_rent_only, demoUrl, techStack,
      rental_options_data: rental_options,
      titlePage: 'Tambah Source Code'
    });
  }
};

module.exports.get_all_sc_api = async (req, res) => {
  try {
    const sourceCodes = await SourceCode.find({ status: 'approved' })
      .populate('seller', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(sourceCodes);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports.get_sc_by_id_api = async (req, res) => {
  try {
    const sc = await SourceCode.findById(req.params.id).populate('seller', 'name');
    if (!sc || sc.status !== 'approved') {
      return res.status(404).json({ msg: 'Source code tidak ditemukan atau belum di-approve.' });
    }
    res.status(200).json(sc);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Source code tidak ditemukan.' });
    }
    res.status(500).json({ msg: 'Server Error' });
  }
};