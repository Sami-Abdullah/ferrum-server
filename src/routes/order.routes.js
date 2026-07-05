import { Router } from 'express';
import {
  getAllOrders,
  getMyOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  issueRefund,
  getOrderAnalytics,
  getSalesChart,
  getTopProducts,
  exportOrders,
} from '../controllers/order.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/export',               requireAdmin, exportOrders);
router.get('/analytics',            requireAdmin, getOrderAnalytics);
router.get('/analytics/sales-chart',  requireAdmin, getSalesChart);
router.get('/analytics/top-products', requireAdmin, getTopProducts);
router.get('/',                     requireAdmin, getAllOrders);
router.patch('/:id/status', requireAdmin, updateOrderStatus);
router.post('/:id/refund',  requireAdmin, issueRefund);

router.get('/my',  requireAuth, getMyOrders);
router.get('/:id', requireAuth, getOrderById);
router.post('/',   requireAuth, createOrder);

export default router;