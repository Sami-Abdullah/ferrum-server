import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Product',
      required: true,
    },

    // Better Auth user ID
    user: {
      type:     String,
      required: true,
    },

    // Snapshot of user info at time of review
    // so if they change their name later
    // the review still shows the original name
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

    // Only true if we confirm the user
    // actually ordered this product
    // prevents fake reviews from people
    // who never bought it
    verified: {
      type:    Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// -----------------------------------------------
// Compound unique index
// One review per user per product
// A user can review many products
// Many users can review one product
// But one user cannot review the same
// product twice
// -----------------------------------------------
reviewSchema.index(
  { product: 1, user: 1 },
  { unique: true }
);

reviewSchema.index({ product: 1, createdAt: -1 }); // all reviews for a product newest first
reviewSchema.index({ user: 1 });                    // all reviews by a user

// -----------------------------------------------
// After a review is saved — automatically
// recalculate the product's average rating
// and review count
// So the product always has accurate stats
// without any manual work in the controller
// -----------------------------------------------
reviewSchema.post('save', async function () {
  const Review = this.constructor;

  const result = await Review.aggregate([
    // Only look at reviews for this product
    { $match: { product: this.product } },

    // Calculate average rating and count
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
      // Round to 1 decimal place — 4.666 becomes 4.7
      averageRating: Math.round(result[0].averageRating * 10) / 10,
      reviewCount:   result[0].reviewCount,
    });
  }
});

// -----------------------------------------------
// After a review is deleted — recalculate again
// so the product rating stays accurate
// -----------------------------------------------
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
    // Reviews still exist — update with new average
    await mongoose.model('Product').findByIdAndUpdate(doc.product, {
      averageRating: Math.round(result[0].averageRating * 10) / 10,
      reviewCount:   result[0].reviewCount,
    });
  } else {
    // No reviews left — reset to zero
    await mongoose.model('Product').findByIdAndUpdate(doc.product, {
      averageRating: 0,
      reviewCount:   0,
    });
  }
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;