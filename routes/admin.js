const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorization');

router.use(authenticateToken, authorize('admin'));

router.get('/users', adminController.getUsers);
router.patch('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);
router.get('/system-stats', adminController.getSystemStats);
router.get('/health', adminController.getSystemHealth);

module.exports = router;