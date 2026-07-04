import mongoose from 'mongoose';

// -----------------------------------------------
// Item inside an order
// We snapshot name, image, price at purchase time
// so if the product changes later the order
// still shows what the customer actually bought
// -----------------------------------------------
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Product',
      required: true,
    },
    name:  { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    size:  {
      type:     String,
      required: true,
      enum:     ['XS', 'S', 'M', 'L', 'XL', 'OS'],
    },
    quantity: {
      type:     Number,
      required: true,
      min:      [1, 'Quantity must be at least 1'],
    },
  },
  { _id: false }
);

// -----------------------------------------------
// Shipping address
// Also snapshotted at purchase time
// so changing your profile address later
// does not affect old orders
// -----------------------------------------------
const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    address:  { type: String, required: true },
    city:     { type: String, required: true },
    postal:   { type: String, required: true },
    country:  { type: String, required: true },
  },
  { _id: false }
);

// -----------------------------------------------
// Single event in the order timeline
// Every status change adds one of these
// -----------------------------------------------
const timelineEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note:   { type: String, required: true },
    date:   { type: Date,   default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // Better Auth user ID — string not ObjectId
    user: {
      type:     String,
      required: true,
    },

    // Snapshot of customer info at time of order
    // so if they change their name later
    // old orders still show the correct name
    customerName:  { type: String, required: true },
    customerEmail: { type: String, required: true },

    items: {
      type:     [orderItemSchema],
      validate: {
        validator: (arr) => arr.length >= 1,
        message:   'Order must have at least one item',
      },
    },

    shippingAddress: {
      type:     shippingAddressSchema,
      required: true,
    },

    // Pricing breakdown
    subtotal:     { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, default: 0,     min: 0 },
    tax:          { type: Number, default: 0,     min: 0 },
    total:        { type: Number, required: true, min: 0 },

    // Order status
    status: {
      type:    String,
      enum:    ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },

    // Payment
    payment: {
      method:               { type: String },  // Visa, Mastercard etc
      last4:                { type: String },  // last 4 digits
      status: {
        type:    String,
        enum:    ['paid', 'refunded', 'pending'],
        default: 'pending',
      },
      stripePaymentIntentId: { type: String }, // needed to issue refunds
    },

    // Shipping
    trackingNumber: {
      type:    String,
      default: '',
    },

    // Refund — only populated if a refund was issued
    refund: {
      amount:         { type: Number },
      reason:         { type: String },
      stripeRefundId: { type: String },
      date:           { type: Date },
    },

    // Full history of status changes
    timeline: {
      type:    [timelineEventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// -----------------------------------------------
// When an order is created, automatically add
// the first timeline event
// -----------------------------------------------
orderSchema.pre('save', function (next) {
  if (this.isNew) {
    this.timeline.push({
      status: 'pending',
      note:   'Order placed successfully',
      date:   new Date(),
    });
  }
  next();
});

orderSchema.index({ user: 1 });                              // get all orders by a user
orderSchema.index({ status: 1 });                            // filter by status
orderSchema.index({ createdAt: -1 });                        // newest first
orderSchema.index({ 'payment.stripePaymentIntentId': 1 });   // fast refund lookup

const Order = mongoose.model('Order', orderSchema);

export default Order;