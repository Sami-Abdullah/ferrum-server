import Order from '../models/order.model.js';
import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';

// -----------------------------------------------
// GET /api/orders
// requireAdmin — all orders for admin panel
// Supports filtering by status, search by
// customer name or order ID
// -----------------------------------------------
export const getAllOrders = async (req, res) => {
  try {
    const {
      status,
      search,
      page  = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { customerName:  { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        total,
        page:       Number(page),
        limit:      Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// GET /api/orders/my
// requireAuth — logged in user's own orders
// -----------------------------------------------
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// GET /api/orders/:id
// requireAuth — user can only see their own order
// Admin can see any order
// -----------------------------------------------
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Regular users can only view their own orders
    if (
      req.user.role !== 'admin' &&
      order.user !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden — this is not your order',
      });
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// POST /api/orders
// requireAuth
// Creates an order after Stripe payment succeeds
// Body: { shippingAddress, paymentInfo }
// Cart is read from DB — never trust client
// -----------------------------------------------
export const createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentInfo } = req.body;

    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address is required',
      });
    }

    // Get cart from DB — never trust what
    // the client sends for items or prices
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty',
      });
    }

    // Verify stock and re-check prices for
    // every item before creating the order
    const verifiedItems = [];
    for (const item of cart.items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.name} is no longer available`,
        });
      }

      if (!product.visible) {
        return res.status(400).json({
          success: false,
          message: `${product.name} is no longer available`,
        });
      }

      const sizeStock = product.sizes[item.size];
      if (sizeStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.name} in size ${item.size}. Only ${sizeStock} left`,
        });
      }

      verifiedItems.push({
        product:  product._id,
        name:     product.name,
        image:    product.images[0],
        price:    product.price, // use REAL price from DB
        size:     item.size,
        quantity: item.quantity,
      });
    }

    // Calculate totals using real prices
    const subtotal     = verifiedItems.reduce(
      (sum, item) => sum + item.price * item.quantity, 0
    );
    const shippingCost = subtotal >= 500 ? 0 : 25; // free shipping over $500
    const tax          = Math.round(subtotal * 0.1 * 100) / 100; // 10% tax
    const total        = subtotal + shippingCost + tax;

    // Create the order
    const order = await Order.create({
      user:          req.user.id,
      customerName:  req.user.name,
      customerEmail: req.user.email,
      items:         verifiedItems,
      shippingAddress,
      subtotal,
      shippingCost,
      tax,
      total,
      status:        'pending',
      payment: {
        method:               paymentInfo?.method || '',
        last4:                paymentInfo?.last4  || '',
        status:               'paid',
        stripePaymentIntentId: paymentInfo?.stripePaymentIntentId || '',
      },
    });

    // Deduct stock for each item
    for (const item of verifiedItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: {
          [`sizes.${item.size}`]: -item.quantity,
        },
      });
    }

    // Clear the cart after successful order
    cart.items = [];
    await cart.save();

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// PATCH /api/orders/:id/status
// requireAdmin
// Update order status and add timeline event
// Body: { status, trackingNumber }
// -----------------------------------------------
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;

    const validStatuses = [
      'pending',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status — must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Prevent updating a cancelled order
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a cancelled order',
      });
    }

    // Build timeline note
    const timelineNotes = {
      processing: 'Payment confirmed — order is being prepared',
      shipped:    trackingNumber
        ? `Dispatched — Tracking: ${trackingNumber}`
        : 'Order dispatched',
      delivered:  'Order delivered successfully',
      cancelled:  'Order cancelled',
    };

    // Update order
    order.status = status;

    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    // If cancelled mark payment as refunded
    if (status === 'cancelled') {
      order.payment.status = 'refunded';
    }

    // Add timeline event
    order.timeline.push({
      status,
      note: timelineNotes[status] || `Status updated to ${status}`,
      date: new Date(),
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// POST /api/orders/:id/refund
// requireAdmin
// Issue a refund — calls Stripe in production
// Body: { amount, reason }
// -----------------------------------------------
export const issueRefund = async (req, res) => {
  try {
    const { amount, reason } = req.body;

    if (!amount || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Amount and reason are required',
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.payment.status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Order has already been refunded',
      });
    }

    if (amount > order.total) {
      return res.status(400).json({
        success: false,
        message: `Refund amount cannot exceed order total of $${order.total}`,
      });
    }

    // -----------------------------------------------
    // Stripe refund goes here in production
    // -----------------------------------------------
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    // const refund = await stripe.refunds.create({
    //   payment_intent: order.payment.stripePaymentIntentId,
    //   amount: Math.round(amount * 100), // Stripe uses cents
    // });
    // const stripeRefundId = refund.id;
    // -----------------------------------------------

    const stripeRefundId = `re_mock_${Date.now()}`; // remove when Stripe is wired

    // Update order
    order.status         = 'cancelled';
    order.payment.status = 'refunded';
    order.refund = {
      amount,
      reason,
      stripeRefundId,
      date: new Date(),
    };

    order.timeline.push({
      status: 'cancelled',
      note:   `Refund of $${amount} issued — ${reason}`,
      date:   new Date(),
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: `Refund of $${amount} issued successfully`,
      order,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// GET /api/orders/analytics
// requireAdmin
// Basic stats for the dashboard
// -----------------------------------------------
export const getOrderAnalytics = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();

    const revenueResult = await Order.aggregate([
      { $match: { 'payment.status': 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    const avgOrderValueResult = await Order.aggregate([
      { $match: { 'payment.status': 'paid' } },
      { $group: { _id: null, avg: { $avg: '$total' } } },
    ]);
    const avgOrderValue = Math.round(avgOrderValueResult[0]?.avg || 0);

    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        totalOrders,
        totalRevenue:  Math.round(totalRevenue * 100) / 100,
        avgOrderValue,
        ordersByStatus,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};