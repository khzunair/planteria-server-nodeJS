
const express = require('express');
const router = express.Router();
const Transaction = require('../../models/Transaction');
const Product = require('../../models/Product');

router.get('/sales-report', async (req, res) => {
    try {
        const topVendors = await Transaction.aggregate([
            // Stage 1: Group by vendorId and calculate total revenue and transaction count
            {
                $group: {
                    _id: "$vendorId",
                    totalRevenue: { $sum: "$vendorEarning" },
                    totalTransactions: { $sum: 1 }
                }
            },
            // Stage 2: Sort the results by total revenue in descending order
            {
                $sort: { totalRevenue: -1 }
            },
            // Stage 3: (Optional) Limit to the top 10 vendors
            {
                $limit: 20
            },
            // Stage 4: (Optional) Join with the vendors collection to get the vendor's name
            {
                $lookup: {
                    from: "registeredvendors", // The collection to join
                    localField: "_id",
                    foreignField: "_id",
                    as: "vendorDetails"
                }
            },
            // Stage 5: (Optional) Unwind the vendorDetails array and replace the root
            {
                $unwind: "$vendorDetails"
            },
            // Stage 6: (Optional) Reshape the output to be cleaner
            {
                $project: {
                    _id: 0, // Exclude the original _id
                    vendorName: "$vendorDetails.businessName",
                    vendorId: "$_id",
                    totalRevenue: "$totalRevenue",
                    totalTransactions: "$totalTransactions"
                }
            }
        ]);

        res.status(200).json(topVendors);
    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

router.get('/product-performance/top-sellers', async (req, res) => {
    try {
        const topSellers = await Product.aggregate([
            // Stage 1: Sort by salesCount in descending order
            {
                $sort: { salesCount: -1 }
            },
            // Stage 2: Limit to the top 10 products
            {
                $limit: 10
            },
            // Stage 3: Project to reshape the output (optional)
            {
                $project: {
                    _id: 0,
                    name: "$name",
                    category: "$category",
                    salesCount: "$salesCount",
                    price: "$price"
                }
            }
        ]);

        res.status(200).json(topSellers);
    } catch (error) {
        console.error('Error generating top sellers report:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

router.get('/homepage-data', async (req, res) => {
    try {
        // Find a small number of featured products (using a pre-built index)
        const featuredProducts = await Product.find({ isFeatured: true }).limit(5).sort({ salesCount: -1 });

        // Find the top 10 products based on a simple aggregation
        const topSellingProducts = await Product.aggregate([
            { $sort: { salesCount: -1 } },
            { $limit: 10 },
            { $project: { _id: 1, name: 1, price: 1, image: 1, salesCount: 1 } }
        ]);

        res.status(200).json({
            featuredProducts,
            topSellingProducts
        });

    } catch (error) {
        console.error('Error fetching homepage data:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// /api/analyticsRoutes/search?q=Licensed%20Rubber%20Ball
router.get('/search', async (req, res) => {
    const { q, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (!q) {
        return res.status(400).json({ message: 'Search query is required.' });
    }

    try {
        // Use the text index for the search query
        const query = { $text: { $search: q } };

        // Get the total count of documents that match the query
        const totalItems = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalItems / parseInt(limit));

        // Get the paginated results, sorted by relevance
        const products = await Product.find(
            query,
            { score: { $meta: "textScore" } }
        )
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(parseInt(limit));

        res.status(200).json({
            products,
            currentPage: parseInt(page),
            totalPages,
            totalItems
        });

    } catch (error) {
        console.error('Error during search:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});


module.exports = router;