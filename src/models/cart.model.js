import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Product',
      required: true,
    },
    name: {
      type:     String,
      required: true,
    },
    image: {
      type:     String,
      required: true,
    },
    price: {
      type:     Number,
      required: true,
      min:      0,
    },
    size: {
      type:     String,
      required: true,
      enum:     ['XS', 'S', 'M', 'L', 'XL', 'OS'],
    },
    quantity: {
      type:    Number,
      default: 1,
      min:     [1, 'Quantity must be at least 1'],
      max:     [10, 'Cannot add more than 10 of the same item'],
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type:     String,
      required: true,
      unique:   true,
    },
    items: {
      type:    [cartItemSchema],
      default: [],
    },
    total: {
      type:    Number,
      default: 0,
      min:     0,
    },
    itemCount: {
      type:    Number,
      default: 0,
      min:     0,
    },
  },
  {
    timestamps: true,
  }
);

// Before every save — recalculate total and itemCount automatically
// Mongoose 9: pre hooks no longer accept a `next` callback parameter —
// use an async function instead, with no next() call.
cartSchema.pre('save', async function () {
  this.total = this.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  this.itemCount = this.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
});

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;