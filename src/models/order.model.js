import mongoose from 'mongoose';

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
    user: {
      type:     String,
      required: true,
    },

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

    subtotal:     { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, default: 0,     min: 0 },
    tax:          { type: Number, default: 0,     min: 0 },
    total:        { type: Number, required: true, min: 0 },

    status: {
      type:    String,
      enum:    ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },

    payment: {
      method:               { type: String },
      last4:                { type: String },
      status: {
        type:    String,
        enum:    ['paid', 'refunded', 'pending'],
        default: 'pending',
      },
      stripePaymentIntentId: { type: String },
    },

    trackingNumber: {
      type:    String,
      default: '',
    },

    refund: {
      amount:         { type: Number },
      reason:         { type: String },
      stripeRefundId: { type: String },
      date:           { type: Date },
    },

    timeline: {
      type:    [timelineEventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// When an order is created, automatically add the first timeline event
// Mongoose 9: pre hooks no longer accept a `next` callback parameter —
// use an async function instead, with no next() call.
orderSchema.pre('save', async function () {
  if (this.isNew) {
    this.timeline.push({
      status: 'pending',
      note:   'Order placed successfully',
      date:   new Date(),
    });
  }
});

orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'payment.stripePaymentIntentId': 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;