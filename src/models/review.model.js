import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Product',
      required: true,
    },

    user: {
      type:     String,
      required: true,
    },

    userName: {
      type:     String,
      required: true,
      trim:     true,
    },

    userEmail: {
      type:     String,
      required: true,
      trim:     true,
      lowercase: true,
    },

    rating: {
      type:     Number,
      required: [true, 'Rating is required'],
      min:      [1, 'Rating must be at least 1'],
      max:      [5, 'Rating cannot exceed 5'],
    },

    comment: {
      type:      String,
      required:  [true, 'Review comment is required'],
      trim:      true,
      minlength: [10, 'Review must be at least 10 characters'],
      maxlength: [500, 'Review cannot exceed 500 characters'],
    },

    verified: {
      type:    Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index(
  { product: 1, user: 1 },
  { unique: true }
);

reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ user: 1 });

reviewSchema.post('save', async function () {
  const Review = this.constructor;

  const result = await Review.aggregate([
    { $match: { product: this.product } },
    {
      $group: {
        _id:           '$product',
        averageRating: { $avg: '$rating' },
        reviewCount:   { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    await mongoose.model('Product').findByIdAndUpdate(this.product, {
      averageRating: Math.round(result[0].averageRating * 10) / 10,
      reviewCount:   result[0].reviewCount,
    });
  }
});

reviewSchema.post('findOneAndDelete', async function (doc) {
  if (!doc) return;

  const Review = mongoose.model('Review');

  const result = await Review.aggregate([
    { $match: { product: doc.product } },
    {
      $group: {
        _id:           '$product',
        averageRating: { $avg: '$rating' },
        reviewCount:   { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    await mongoose.model('Product').findByIdAndUpdate(doc.product, {
      averageRating: Math.round(result[0].averageRating * 10) / 10,
      reviewCount:   result[0].reviewCount,
    });
  } else {
    await mongoose.model('Product').findByIdAndUpdate(doc.product, {
      averageRating: 0,
      reviewCount:   0,
    });
  }
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;