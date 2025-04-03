const Review = require("../../models/Review");
const Product = require("../../models/Product");

// ✅ Helper Function: Update Product Rating
const updateProductRating = async (productId) => {
  try {
    const reviews = await Review.find({ product: productId, status: "Approved" });

    if (reviews.length === 0) {
      await Product.findByIdAndUpdate(productId, { rating: 0 });
      return;
    }

    const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
    const avgRating = totalRating / reviews.length;

    await Product.findByIdAndUpdate(productId, { rating: avgRating.toFixed(1) });
  } catch (error) {
    console.error("Error updating product rating:", error);
  }
};

// ✅ Get pending reviews for a user
exports.getUserPendingReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user.id, status: "Pending" }).populate("product", "name");
    res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error("Error fetching pending reviews:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};

// ✅ Submit a review (User must provide a rating)
exports.submitReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, feedback, image } = req.body;

    if (!rating) {
      return res.status(400).json({ success: false, msg: "Rating is required" });
    }

    const review = await Review.findById(reviewId);
    if (!review || review.user.toString() !== req.user.id) {
      return res.status(404).json({ success: false, msg: "Review not found or not authorized" });
    }

    review.rating = rating;
    review.feedback = feedback || "";
    review.image = image || null;
    review.status = "Submitted";
    await review.save();

    res.status(200).json({ success: true, msg: "Review submitted successfully", review });
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};

// ✅ Get all pending reviews (Admin)
exports.getAdminPendingReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ status: "Submitted" }).populate("user", "name").populate("product", "name");
    res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error("Error fetching pending reviews:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};

// ✅ Get all reviews for admin
exports.getAllReviewsForAdmin = async (req, res) => {
  try {
    const reviews = await Review.find().populate("user", "name").populate("product", "name");
    res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error("Error fetching all reviews:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};

// ✅ Approve a review
exports.approveReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    let review = await Review.findById(reviewId);
    
    if (!review || review.status !== "Submitted") {
      return res.status(404).json({ success: false, msg: "Review not found or not submitted yet" });
    }

    review.status = "Approved";
    await review.save();

    // ✅ Update product rating
    await updateProductRating(review.product);

    res.status(200).json({ success: true, msg: "Review approved successfully", review });
  } catch (error) {
    console.error("Error approving review:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};

// ✅ Reject a review
exports.rejectReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    let review = await Review.findById(reviewId);
    
    if (!review || review.status !== "Submitted") {
      return res.status(404).json({ success: false, msg: "Review not found or not submitted yet" });
    }

    review.status = "Rejected";
    await review.save();

    // ✅ Update product rating after rejection
    await updateProductRating(review.product);

    res.status(200).json({ success: true, msg: "Review rejected successfully", review });
  } catch (error) {
    console.error("Error rejecting review:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};


// ✅ Get all reviews for a specific product
exports.getProductReviews = async (req, res) => {
    try {
      const { productId } = req.params;
  
      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, msg: "Product not found" });
      }
  
      // Fetch all reviews related to the product
      const reviews = await Review.find({ product: productId })
        .populate("user", "name") // Populate user details
        .sort({ createdAt: -1 }); // Sort by newest first
  
      res.status(200).json({ success: true, reviews });
    } catch (error) {
      console.error("Error fetching product reviews:", error);
      res.status(500).json({ success: false, msg: "Internal server error" });
    }
  };