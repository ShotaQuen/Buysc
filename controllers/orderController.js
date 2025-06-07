const Order = require('../models/order');
const SourceCode = require('../models/sourceCode');
const User = require('../models/user');
module.exports.create_order_post = async (req, res) => {
  const { scId, orderType, rentalOptionIndex } = req.body;
  if (!scId || !orderType) {
    req.flash('error_msg', 'Informasi pesanan tidak lengkap.');
    return res.redirect('back');
  }

  try {
    const sc = await SourceCode.findById(scId);
    if (!sc || sc.status !== 'approved') {
      req.flash('error_msg', 'Source code tidak ditemukan atau tidak tersedia.');
      return res.redirect('/sc-list');
    }

    let amount;
    let rentalDurationDays;
    let rentalEndDate;

    if (orderType === 'buy') {
      if (sc.is_for_rent_only || !sc.price_buy) {
        req.flash('error_msg', 'Source code ini hanya untuk disewa.');
        return res.redirect(`/sc/${scId}`);
      }
      amount = sc.price_buy;
    } else if (orderType === 'rent') {
      if (!sc.rental_options || sc.rental_options.length === 0) {
        req.flash('error_msg', 'Source code ini tidak memiliki opsi sewa.');
        return res.redirect(`/sc/${scId}`);
      }
      const selectedOption = sc.rental_options[parseInt(rentalOptionIndex)];
      if (!selectedOption) {
        req.flash('error_msg', 'Opsi sewa tidak valid.');
        return res.redirect(`/sc/${scId}`);
      }
      amount = selectedOption.price;
      rentalDurationDays = selectedOption.durationDays;
      const startDate = new Date();
      rentalEndDate = new Date(startDate.setDate(startDate.getDate() + rentalDurationDays));
    } else {
      req.flash('error_msg', 'Tipe pesanan tidak valid.');
      return res.redirect('back');
    }
    const paymentStatus = 'completed'; 
    const transactionId = `TRX-${Date.now()}`; 

    const newOrder = new Order({
      user: req.user._id,
      sourceCode: scId,
      orderType,
      rentalDurationDays: orderType === 'rent' ? rentalDurationDays : undefined,
      rentalEndDate: orderType === 'rent' ? rentalEndDate : undefined,
      amount,
      paymentStatus,
      transactionId,
      downloadLink: orderType === 'buy' ? `/download/${scId}/${transactionId}` : undefined // Placeholder
    });

    await newOrder.save();

    if (orderType === 'buy') {
      req.flash('success_msg', `Pembelian ${sc.title} berhasil! Anda dapat mengunduhnya.`);
    } else {
      req.flash('success_msg', `Penyewaan ${sc.title} berhasil hingga ${rentalEndDate.toLocaleDateString()}.`);
    }
    res.redirect('/dashboard/orders');

  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Terjadi kesalahan saat memproses pesanan.');
    res.redirect('back');
  }
};

module.exports.get_user_orders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate('sourceCode', 'title category')
            .sort({ createdAt: -1 });
        res.render('user/orders', {
            titlePage: 'Pesanan Saya',
            orders
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal memuat pesanan.');
        res.redirect('/dashboard');
    }
};