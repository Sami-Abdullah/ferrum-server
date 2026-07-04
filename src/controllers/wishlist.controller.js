import { auth } from '../lib/auth.js';

// Helper to get the raw user document from Better Auth
const getUserDocument = async (userId, headers) => {
  const session = await auth.api.getSession({ headers });
  return session?.user || null;
};

// -----------------------------------------------
// GET /api/wishlist
// requireAuth
// Returns the current user's wishlist
// product IDs stored on the user document
// -----------------------------------------------
export const getWishlist = async (req, res) => {
  try {
    // req.user is already attached by requireAuth middleware
    const wishlist = req.user.wishlist || [];

    res.status(200).json({
      success:  true,
      wishlist,
      count:    wishlist.length,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// POST /api/wishlist/:productId
// requireAuth
// Add a product to wishlist
// -----------------------------------------------
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const wishlist      = req.user.wishlist || [];

    // Already in wishlist
    if (wishlist.includes(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist',
      });
    }

    // Add product ID to wishlist via Better Auth
    await auth.api.updateUser({
      headers: req.headers,
      body: {
        wishlist: [...wishlist, productId],
      },
    });

    res.status(200).json({
      success:  true,
      message:  'Added to wishlist',
      wishlist: [...wishlist, productId],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// DELETE /api/wishlist/:productId
// requireAuth
// Remove a product from wishlist
// -----------------------------------------------
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const wishlist      = req.user.wishlist || [];

    if (!wishlist.includes(productId)) {
      return res.status(404).json({
        success: false,
        message: 'Product not in wishlist',
      });
    }

    const updated = wishlist.filter((id) => id !== productId);

    await auth.api.updateUser({
      headers: req.headers,
      body: {
        wishlist: updated,
      },
    });

    res.status(200).json({
      success:  true,
      message:  'Removed from wishlist',
      wishlist: updated,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// DELETE /api/wishlist
// requireAuth
// Clear entire wishlist
// -----------------------------------------------
export const clearWishlist = async (req, res) => {
  try {
    await auth.api.updateUser({
      headers: req.headers,
      body: {
        wishlist: [],
      },
    });

    res.status(200).json({
      success:  true,
      message:  'Wishlist cleared',
      wishlist: [],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};