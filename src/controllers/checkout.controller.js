import { stripe } from '../lib/stripe.js';
import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';

// -----------------------------------------------
// POST /api/checkout/create-payment-intent
// requireAuth
// Body: { shippingAddress }
// -----------------------------------------------
export const createPaymentIntent = async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address is required',
      });
    }

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty',
      });
    }

    // Re-verify stock before creating the payment intent — FR-07
    for (const item of cart.items) {
      const product = await Product.findById(item.product);

      if (!product || !product.visible) {
        return res.status(400).json({
          success: false,
          message: `${item.name} is no longer available`,
        });
      }

      const sizeStock = product.sizes[item.size];
      if (sizeStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.name} in size ${item.size}. Only ${sizeStock} left`,
        });
      }
    }

    const subtotal     = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingCost = subtotal >= 500 ? 0 : 25;
    const tax          = Math.round(subtotal * 0.1 * 100) / 100;
    const total         = subtotal + shippingCost + tax;

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(total * 100), // Stripe uses cents
      currency: 'usd',
      metadata: {
        userId:          req.user.id,
        customerName:    req.user.name,
        customerEmail:   req.user.email,
        shippingAddress: JSON.stringify(shippingAddress),
      },
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      total,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};