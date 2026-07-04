import './src/lib/env.js';           

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './src/lib/auth.js';
import productRoutes  from './src/routes/product.routes.js';
import cartRoutes     from './src/routes/cart.routes.js';
import orderRoutes    from './src/routes/order.routes.js';
import wishlistRoutes from './src/routes/wishlist.routes.js';

const app  = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

app.all('/api/auth/*path', toNodeHandler(auth));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Ferrum API is running' });
});

app.use('/api/products', productRoutes);
app.use('/api/cart',     cartRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/wishlist', wishlistRoutes);

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