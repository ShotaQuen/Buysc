const { Router } = require('express');
const { requireAuth, checkUser, authorizeRoles } = require('../middleware/authMiddleware');
const SourceCode = require('../models/sourceCode');
const Order = require('../models/order');
const User = require('../models/user');
const authController = require('../controllers/authController');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const latestSc = await SourceCode.find({ status: 'approved' })
                                     .populate('seller', 'name')
                                     .sort({ createdAt: -1 })
                                     .limit(6);
    res.render('index', { titlePage: 'Selamat Datang', latestSc });
  } catch (err) {
    console.error(err);
    res.render('index', { titlePage: 'Selamat Datang', latestSc: [] });
  }
});

router.get('/register', (req, res) => res.render('auth/register', { titlePage: 'Register', errors: [] }));
router.get('/login', (req, res) => res.render('auth/login', { titlePage: 'Login', errors: [] }));
router.get('/logout', authController.logout_get);

router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        let userSc = [];
        if (req.user.role === 'seller' || req.user.role === 'admin') {
            userSc = await SourceCode.find({ seller: req.user._id }).sort({ createdAt: -1 });
        }
        const userOrders = await Order.find({ user: req.user._id })
            .populate('sourceCode', 'title')
            .sort({ createdAt: -1 })
            .limit(5);

        res.render('user/dashboard', {
            titlePage: 'Dashboard',
            user: req.user,
            userSc,
            userOrders
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal memuat dashboard.');
        res.redirect('/');
    }
});

router.get('/sc-list', async (req, res) => {
  try {
    const sourceCodes = await SourceCode.find({ status: 'approved' })
                                        .populate('seller', 'name')
                                        .sort({ createdAt: -1 });
    res.render('sc/list', { titlePage: 'Daftar Source Code', sourceCodes });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Gagal memuat daftar source code.');
    res.render('sc/list', { titlePage: 'Daftar Source Code', sourceCodes: [] });
  }
});

router.get('/sc/add', requireAuth, authorizeRoles('seller', 'admin'), (req, res) => {
  res.render('sc/add', { titlePage: 'Tambah Source Code', errors: [], rental_options_data: [] });
});

router.get('/sc/:id', async (req, res) => {
  try {
    const sc = await SourceCode.findById(req.params.id).populate('seller', 'name email');
    if (!sc || (sc.status !== 'approved' && (!req.user || req.user._id.toString() !== sc.seller._id.toString() && req.user.role !== 'admin'))) {
      req.flash('error_msg', 'Source code tidak ditemukan atau belum disetujui.');
      return res.redirect('/sc-list');
    }
    let existingOrder = null;
    if (req.user) {
        existingOrder = await Order.findOne({
            user: req.user._id,
            sourceCode: sc._id,
            paymentStatus: 'completed',
            $or: [
                { orderType: 'buy' },
                { orderType: 'rent', rentalEndDate: { $gte: new Date() } }
            ]
        });
    }
    res.render('sc/detail', { titlePage: sc.title, sc, existingOrder });
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
        req.flash('error_msg', 'Source code tidak ditemukan.');
        return res.redirect('/sc-list');
    }
    req.flash('error_msg', 'Terjadi kesalahan.');
    res.redirect('/sc-list');
  }
});

router.get('/dashboard/orders', requireAuth, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate({
                path: 'sourceCode',
                select: 'title category price_buy rental_options',
                populate: { path: 'seller', select: 'name' }
            })
            .sort({ createdAt: -1 });

        res.render('user/orders', {
            titlePage: 'Riwayat Pesanan Saya',
            orders
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal memuat riwayat pesanan.');
        res.redirect('/dashboard');
    }
});

router.get('/admin/users', requireAuth, authorizeRoles('admin'), async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.render('admin/users', { titlePage: 'Manajemen Pengguna', users });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal memuat daftar pengguna.');
        res.redirect('/dashboard');
    }
});

router.get('/admin/sc-management', requireAuth, authorizeRoles('admin'), async (req, res) => {
    try {
        const sourceCodes = await SourceCode.find()
            .populate('seller', 'name email')
            .sort({ status: 1, createdAt: -1 });
        res.render('admin/sc-management', { titlePage: 'Manajemen Source Code', sourceCodes });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal memuat daftar SC.');
        res.redirect('/dashboard');
    }
});

router.post('/admin/sc-approve/:id', requireAuth, authorizeRoles('admin'), async (req, res) => {
    try {
        await SourceCode.findByIdAndUpdate(req.params.id, { status: 'approved' });
        req.flash('success_msg', 'Source Code telah disetujui.');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal menyetujui SC.');
    }
    res.redirect('/admin/sc-management');
});

router.post('/admin/sc-reject/:id', requireAuth, authorizeRoles('admin'), async (req, res) => {
    try {
        await SourceCode.findByIdAndUpdate(req.params.id, { status: 'rejected' });
        req.flash('success_msg', 'Source Code telah ditolak.');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal menolak SC.');
    }
    res.redirect('/admin/sc-management');
});

router.get('/download/:scId/:transactionId', requireAuth, async (req, res) => {
    try {
        const order = await Order.findOne({
            user: req.user._id,
            sourceCode: req.params.scId,
            transactionId: req.params.transactionId,
            orderType: 'buy',
            paymentStatus: 'completed'
        }).populate('sourceCode');

        if (!order) {
            req.flash('error_msg', 'Link download tidak valid atau pesanan tidak ditemukan.');
            return res.redirect('/dashboard/orders');
        }
        req.flash('success_msg', `Simulasi download untuk ${order.sourceCode.title}. Implementasikan download file sebenarnya di sini.`);
        res.redirect(`/sc/${order.sourceCode._id}`);

    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal memproses permintaan download.');
        res.redirect('/dashboard/orders');
    }
});

module.exports = router;