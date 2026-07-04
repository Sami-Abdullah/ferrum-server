import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';

// -----------------------------------------------
// GET /api/cart
// requireAuth — logged in users only
// Returns the current user's cart
// -----------------------------------------------
export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id });

    // If no cart exists yet return empty cart
    if (!cart) {
      return res.status(200).json({
        success:   true,
        cart: {
          items:     [],
          total:     0,
          itemCount: 0,
        },
      });
    }

    res.status(200).json({
      success: true,
      cart,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// POST /api/cart
// requireAuth
// Add an item to the cart
// Body: { productId, size, quantity }
// -----------------------------------------------
export const addToCart = async (req, res) => {
  try {
    const { productId, size, quantity = 1 } = req.body;

    // Validate required fields
    if (!productId || !size) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and size are required',
      });
    }

    // Check product exists and is visible
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (!product.visible) {
      return res.status(400).json({
        success: false,
        message: 'Product is not available',
      });
    }

    // Check stock for requested size
    const sizeStock = product.sizes[size];
    if (sizeStock === undefined) {
      return res.status(400).json({
        success: false,
        message: `Size ${size} is not available for this product`,
      });
    }

    if (sizeStock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${sizeStock} units available in size ${size}`,
      });
    }

    // Find or create cart for this user
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    // Check if this exact product + size combo already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.size === size
    );

    if (existingItemIndex > -1) {
      // Item already in cart — increase quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      // Make sure new quantity doesn't exceed stock or max limit
      if (newQuantity > sizeStock) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more — only ${sizeStock} units available in size ${size}`,
        });
      }

      if (newQuantity > 10) {
        return res.status(400).json({
          success: false,
          message: 'Cannot add more than 10 of the same item',
        });
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // New item — add to cart
      cart.items.push({
        product:  product._id,
        name:     product.name,
        image:    product.images[0], // use first image
        price:    product.price,
        size,
        quantity,
      });
    }

    // pre('save') hook auto-calculates total and itemCount
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      cart,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// PATCH /api/cart/:productId
// requireAuth
// Update quantity of an item in the cart
// Body: { size, quantity }
// -----------------------------------------------
export const updateCartItem = async (req, res) => {
  try {
    const { size, quantity } = req.body;
    const { productId }      = req.params;

    if (!size || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Size and quantity are required',
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1 — use DELETE to remove item',
      });
    }

    // Check stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const sizeStock = product.sizes[size];
    if (quantity > sizeStock) {
      return res.status(400).json({
        success: false,
        message: `Only ${sizeStock} units available in size ${size}`,
      });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.size === size
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart',
      });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart updated',
      cart,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// DELETE /api/cart/:productId
// requireAuth
// Remove a specific item from the cart
// Query: ?size=M
// -----------------------------------------------
export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const { size }      = req.query;

    if (!size) {
      return res.status(400).json({
        success: false,
        message: 'Size is required as a query param — e.g. ?size=M',
      });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.size === size
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart',
      });
    }

    // Remove the item
    cart.items.splice(itemIndex, 1);
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      cart,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// DELETE /api/cart
// requireAuth
// Clear entire cart — called after checkout
// -----------------------------------------------
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      cart,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};