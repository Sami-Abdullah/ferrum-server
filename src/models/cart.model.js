import mongoose from 'mongoose';

// -----------------------------------------------
// Single item inside the cart
// We snapshot name, image, price when item
// is added — so if the product price changes
// while it's in the cart, the customer sees
// what it was when they added it
// Price is re-verified at checkout anyway
// -----------------------------------------------
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
    // One cart per user — unique enforced at DB level
    user: {
      type:     String, // Better Auth string ID
      required: true,
      unique:   true,
    },

    items: {
      type:    [cartItemSchema],
      default: [],
    },

    // Auto-calculated — updated every save
    total: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // How many individual items are in the cart
    // Used for the bag icon count in the navbar
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

// -----------------------------------------------
// Before every save — recalculate total
// and itemCount automatically
// Never have to do this manually in controllers
// -----------------------------------------------
cartSchema.pre('save', function (next) {
  this.total = this.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  this.itemCount = this.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  next();
});


const Cart = mongoose.model('Cart', cartSchema);

export default Cart;