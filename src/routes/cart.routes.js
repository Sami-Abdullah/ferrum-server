import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../controllers/cart.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// All cart routes require auth — no guest carts
router.get('/',            requireAuth, getCart);
router.post('/',           requireAuth, addToCart);
router.patch('/:productId', requireAuth, updateCartItem);
router.delete('/:productId',requireAuth, removeFromCart);
router.delete('/',         requireAuth, clearCart);

export default router;