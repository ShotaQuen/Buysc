const { Router } = require('express');
const scController = require('../controllers/scController');
const { requireAuth, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadFields } = require('../middleware/uploadMiddleware'); 
const router = Router();
router.get('/', scController.get_all_sc_api);
router.get('/:id', scController.get_sc_by_id_api);
router.post('/', requireAuth, authorizeRoles('seller', 'admin'), (req, res, next) => {
    uploadFields(req, res, function (err) {
        if (err) {
            let errors = [];
            if (err.code === 'LIMIT_FILE_SIZE') {
                 errors.push({ msg: `File terlalu besar. Maksimal ${err.field === 'sc_file' ? '50MB' : '5MB'}.` });
            } else if (err.message) { 
                errors.push({ msg: err.message });
            } else {
                errors.push({ msg: 'Terjadi kesalahan saat upload file.' });
            }
            return res.status(400).render('sc/add', {
                errors,
                title: req.body.title,
                description: req.body.description,
                category: req.body.category,
                tags: req.body.tags,
                price_buy_str: req.body.price_buy_str,
                is_for_rent_only: req.body.is_for_rent_only,
                demoUrl: req.body.demoUrl,
                techStack: req.body.techStack,
                rental_options_data: [], 
                titlePage: 'Tambah Source Code'
            });
        }
        next();
    });
}, scController.create_sc_post);

module.exports = router;