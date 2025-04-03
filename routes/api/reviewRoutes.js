const express = require("express");
const router = express.Router();


// update paths
const adminAuth = require("../../middleware/adminAuth");
const auth = require("../../middleware/userAuth");
const { getUserPendingReviews, submitReview, getAdminPendingReviews, getAllReviewsForAdmin, approveReview, rejectReview, getProductReviews } = require("../../controller/Review/reviewController");
// ✅ Get pending reviews for logged-in user
router.get("/pending", auth, getUserPendingReviews);

// ✅ Submit a review (only one per product)
router.post("/submit/:reviewId", auth, submitReview);

// ✅ Get all pending reviews (Admin only)
router.get("/admin/pending", adminAuth,  getAdminPendingReviews);

// ✅ Get all reviews (Admin only)
router.get("/admin/all", adminAuth,  getAllReviewsForAdmin);

// ✅ Approve a review (Admin only)
router.put("/approve/:reviewId", adminAuth,  approveReview);

// ✅ Reject a review (Admin only)
router.put("/reject/:reviewId", adminAuth,  rejectReview);

// ✅ Get all reviews for a specific product
router.get("/product/:productId", getProductReviews);

module.exports = router;
