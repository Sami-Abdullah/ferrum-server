import { Router } from 'express';
import {
  getAllOrders,
  getMyOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  issueRefund,
  getOrderAnalytics,
} from '../controllers/order.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Admin routes
router.get('/analytics', requireAdmin, getOrderAnalytics);
router.get('/',          requireAdmin, getAllOrders);
router.patch('/:id/status', requireAdmin, updateOrderStatus);
router.post('/:id/refund',  requireAdmin, issueRefund);

// User routes
router.get('/my',  requireAuth, getMyOrders);
router.get('/:id', requireAuth, getOrderById);
router.post('/',   requireAuth, createOrder);

export default router;