import mongoose from 'mongoose';

const sizeStockSchema = new mongoose.Schema(
  {
    XS: { type: Number, default: 0, min: 0 },
    S:  { type: Number, default: 0, min: 0 },
    M:  { type: Number, default: 0, min: 0 },
    L:  { type: Number, default: 0, min: 0 },
    XL: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Product name is required'],
      trim:      true,
      minlength: [3, 'Product name must be at least 3 characters'],
    },

    description: {
      type:      String,
      required:  [true, 'Description is required'],
      trim:      true,
      minlength: [20, 'Description must be at least 20 characters'],
    },

    category: {
      type:     String,
      required: [true, 'Category is required'],
      enum:     ['Outerwear', 'Knitwear', 'Tops', 'Bottoms', 'Accessories', 'Footwear'],
    },

    sku: {
      type:      String,
      required:  [true, 'SKU is required'],
      unique:    true,
      trim:      true,
      uppercase: true,
      match: [
        /^FRM-[A-Z]+-\d{3}-[A-Z]+$/,
        'SKU format must be FRM-XXX-000-XXX (e.g. FRM-OUT-001-BLK)',
      ],
    },

    price: {
      type:     Number,
      required: [true, 'Price is required'],
      min:      [0.01, 'Price must be greater than 0'],
    },

    images: {
      type:     [String],
      validate: {
        validator: (arr) => arr.length >= 1,
        message:   'At least one image is required',
      },
    },

    sizes: {
      type:    sizeStockSchema,
      default: () => ({ XS: 0, S: 0, M: 0, L: 0, XL: 0 }),
    },

    totalStock: {
      type:    Number,
      default: 0,
      min:     0,
    },

    stockStatus: {
      type:    String,
      enum:    ['in', 'low', 'out'],
      default: 'out',
    },

    visible: {
      type:    Boolean,
      default: false,
    },

    averageRating: {
      type:    Number,
      default: 0,
      min:     0,
      max:     5,
    },

    reviewCount: {
      type:    Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-calculate totalStock and stockStatus before save
// Mongoose 9: pre hooks no longer accept a `next` callback parameter —
// use an async function instead, with no next() call.
productSchema.pre('save', async function () {
  const sizes = this.sizes;

  this.totalStock =
    (sizes.XS || 0) +
    (sizes.S  || 0) +
    (sizes.M  || 0) +
    (sizes.L  || 0) +
    (sizes.XL || 0);

  if (this.totalStock === 0)       this.stockStatus = 'out';
  else if (this.totalStock <= 10)  this.stockStatus = 'low';
  else                             this.stockStatus = 'in';
});

// Same for findOneAndUpdate
productSchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate();

  if (update.sizes) {
    const sizes = update.sizes;
    const total =
      (sizes.XS || 0) +
      (sizes.S  || 0) +
      (sizes.M  || 0) +
      (sizes.L  || 0) +
      (sizes.XL || 0);

    update.totalStock  = total;
    update.stockStatus = total === 0 ? 'out' : total <= 10 ? 'low' : 'in';
  }
});

productSchema.index({ category: 1 });
productSchema.index({ stockStatus: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ visible: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;