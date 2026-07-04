import { Router } from 'express';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} from '../controllers/wishlist.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// All wishlist routes require auth
router.get('/',            requireAuth, getWishlist);
router.post('/:productId', requireAuth, addToWishlist);
router.delete('/:productId', requireAuth, removeFromWishlist);
router.delete('/',         requireAuth, clearWishlist);

export default router;