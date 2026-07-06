import { Router } from 'express';
import { createPaymentIntent } from '../controllers/checkout.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/create-payment-intent', requireAuth, createPaymentIntent);

export default router;