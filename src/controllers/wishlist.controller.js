import { auth } from '../lib/auth.js';
import Product from '../models/product.model.js';

const parseWishlist = (raw) => {
  try {
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
};

// -----------------------------------------------
// GET /api/wishlist
// requireAuth — returns full product documents,
// not just IDs
// -----------------------------------------------
export const getWishlist = async (req, res) => {
  try {
    const ids = parseWishlist(req.user.wishlist);
    const products = await Product.find({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      wishlist: products,
      count: products.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// -----------------------------------------------
// POST /api/wishlist/:productId
// requireAuth
// -----------------------------------------------
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const ids = parseWishlist(req.user.wishlist);

    if (ids.includes(productId)) {
      return res.status(400).json({ success: false, message: 'Product already in wishlist' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updated = [...ids, productId];

    await auth.api.updateUser({
      headers: req.headers,
      body: { wishlist: JSON.stringify(updated) },
    });

    res.status(200).json({ success: true, message: 'Added to wishlist', wishlist: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// -----------------------------------------------
// DELETE /api/wishlist/:productId
// requireAuth
// -----------------------------------------------
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const ids = parseWishlist(req.user.wishlist);

    if (!ids.includes(productId)) {
      return res.status(404).json({ success: false, message: 'Product not in wishlist' });
    }

    const updated = ids.filter((id) => id !== productId);

    await auth.api.updateUser({
      headers: req.headers,
      body: { wishlist: JSON.stringify(updated) },
    });

    res.status(200).json({ success: true, message: 'Removed from wishlist', wishlist: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// -----------------------------------------------
// DELETE /api/wishlist
// requireAuth
// -----------------------------------------------
export const clearWishlist = async (req, res) => {
  try {
    await auth.api.updateUser({
      headers: req.headers,
      body: { wishlist: JSON.stringify([]) },
    });

    res.status(200).json({ success: true, message: 'Wishlist cleared', wishlist: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};