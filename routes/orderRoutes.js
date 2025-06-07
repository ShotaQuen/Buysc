const { Router } = require('express');
const orderController = require('../controllers/orderController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = Router();
router.post('/', requireAuth, orderController.create_order_post);


module.exports = router;