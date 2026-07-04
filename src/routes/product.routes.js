import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleVisibility,
  exportProducts,
} from '../controllers/product.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/export', requireAdmin, exportProducts);   // must come before /:id
router.get('/',    getAllProducts);
router.get('/:id', getProductById);

router.post('/',                    requireAdmin, createProduct);
router.put('/:id',                  requireAdmin, updateProduct);
router.delete('/:id',               requireAdmin, deleteProduct);
router.patch('/:id/visibility',     requireAdmin, toggleVisibility);

export default router;