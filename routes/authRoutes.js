const { Router } = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware'); 
const router = Router();
router.post('/register', authController.register_post);
router.post('/login', authController.login_post);

module.exports = router;