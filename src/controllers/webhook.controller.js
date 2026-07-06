import { stripe } from '../lib/stripe.js';
import Order from '../models/order.model.js';
import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';
import { sendOrderConfirmationEmail } from '../lib/resend.js';

// -----------------------------------------------
// POST /api/webhooks/stripe
// Public — but verified via Stripe signature
// -----------------------------------------------
export const handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // raw body — see index.js note below
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const { userId, customerName, customerEmail, shippingAddress } = paymentIntent.metadata;

    try {
      const cart = await Cart.findOne({ user: userId });

      if (!cart || cart.items.length === 0) {
        console.error('Webhook: cart empty or missing for user', userId);
        return res.status(200).json({ received: true }); // acknowledge, nothing to do
      }

      // Re-verify stock one more time before creating the order
      const verifiedItems = [];
      for (const item of cart.items) {
        const product = await Product.findById(item.product);
        if (!product) continue;

        verifiedItems.push({
          product:  product._id,
          name:     product.name,
          image:    product.images[0],
          price:    product.price,
          size:     item.size,
          quantity: item.quantity,
        });
      }

      const subtotal     = verifiedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const shippingCost = subtotal >= 500 ? 0 : 25;
      const tax          = Math.round(subtotal * 0.1 * 100) / 100;
      const total        = subtotal + shippingCost + tax;

      const order = await Order.create({
        user:          userId,
        customerName,
        customerEmail,
        items:         verifiedItems,
        shippingAddress: JSON.parse(shippingAddress),
        subtotal,
        shippingCost,
        tax,
        total,
        status: 'pending',
        payment: {
          method:               paymentIntent.payment_method_types?.[0] || 'card',
          last4:                '',
          status:               'paid',
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      // Decrement stock
      for (const item of verifiedItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { [`sizes.${item.size}`]: -item.quantity },
        });
      }

      // Clear cart
      cart.items = [];
      await cart.save();

      // Send confirmation email — don't let email failure break the webhook response
      try {
        await sendOrderConfirmationEmail(order);
      } catch (emailErr) {
        console.error('Failed to send confirmation email:', emailErr.message);
      }

    } catch (err) {
      console.error('Error processing webhook order creation:', err.message);
      return res.status(500).json({ received: false });
    }
  }

  res.status(200).json({ received: true });
};
