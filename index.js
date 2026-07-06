import './src/lib/env.js';

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './src/lib/auth.js';
import userRoutes from './src/routes/user.routes.js';
import productRoutes  from './src/routes/product.routes.js';
import cartRoutes     from './src/routes/cart.routes.js';
import orderRoutes    from './src/routes/order.routes.js';
import wishlistRoutes from './src/routes/wishlist.routes.js';
import checkoutRoutes from './src/routes/checkout.routes.js';
import webhookRoutes  from './src/routes/webhook.routes.js';


const app  = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// Better Auth — must be before express.json()
app.all('/api/auth/*path', toNodeHandler(auth));

// Stripe webhook — needs RAW body, must also be before express.json()
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Now the JSON parser for everything else
app.use(express.json());
app.use('/api/user', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart',     cartRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/checkout', checkoutRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Ferrum API is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong',
  });
});

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Connected to MongoDB');
    app.listen(port, () => {
      console.log(`Ferrum API running on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
};

start();

export default app;