import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleVisibility,
} from '../controllers/product.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes — no auth needed
router.get('/',    getAllProducts);
router.get('/:id', getProductById);

// Admin only routes
router.post('/',                    requireAdmin, createProduct);
router.put('/:id',                  requireAdmin, updateProduct);
router.delete('/:id',               requireAdmin, deleteProduct);
router.patch('/:id/visibility',     requireAdmin, toggleVisibility);

export default router;