require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ip = require("ip"); // Import IP module
const cookieParser = require('cookie-parser');
const cors = require("cors");

// Morgan Logger
const morgan = require("morgan");
const logger = require("./utils/logs/logger"); 

// Connect Application to Database
const connectDB = require("./config/db");


const app = express();
const whitelist = ['http://localhost:5173', 'http://192.168.100.8:5173'];
const corsOptions = {
    origin: (origin, callback) => {
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cookieParser());
app.use(cors(corsOptions));

app.use(morgan("combined", {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));
// init middleware
// to get data in request.body
app.use(express.json({ extended: false }));

// app.use(errorHandler);
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(bodyParser.json({ limit: "10mb" })); // to support JSON-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// const errorHandler = require("./middleware/errorHandler");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // Initialize Stripe



const userRoutes = require("./routes/api/v1/userRoutes");
const adminRoutes = require("./routes/api/adminRoutes");
const applicationsRoutes = require("./routes/api/applicationRoutes");
const productCategoryRoutes = require("./routes/api/ProductCategoryRoute");
const productRoutes = require("./routes/api/ProductRoutes");
const productActionsRoutes = require("./routes/api/ProductActionsRoutes");
const cartRoutes = require("./routes/api/cartRoutes");
const planRoutes = require("./routes/api/subscriptionPlanRoutes");
const vendorAccountRoutes = require("./routes/api/vendorAccountRoutes");
const subscriptionRoutes = require("./routes/api/subscriptionRoutes");
// const ChatRoutes = require("./routes/api/chatRoutes");
const shipmentRoutes = require("./routes/api/shipmentRoutes");
const checkoutRoutes = require("./routes/api/checkoutRoutes");
const orderRoutes = require("./routes/api/orderRoutes");
const reviewRoutes = require("./routes/api/reviewRoutes");
const transactionRoutes = require("./routes/api/transactionRoutes");
const vendorBalanceRoutes = require("./routes/api/vendorBalance");
const analyticsRoutes = require("./routes/api/analyticsRoutes");
// const couponsRoutes = require("./routes/api/couponsRoutes");







// for Production
const path = require("path");

// Connect Database
connectDB();




// ******* Routes *******

// Dummy Route
app.get("/", (req, res) => res.send("API Running"));
// Correct  Working path
app.use("/api/users", userRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/productCategory", productCategoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/products/actions", productActionsRoutes);
app.use("/api/shipment", shipmentRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart/", cartRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/subscription-plans", planRoutes);
app.use("/api/vendor-account", vendorAccountRoutes);
app.use("/api/transaction", transactionRoutes);
app.use("/api/balance", vendorBalanceRoutes);
app.use("/api/use-ai-subscription", subscriptionRoutes);
app.use("/api/analyticsRoutes", analyticsRoutes);


// Stripe Payment Intent API
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency } = req.body;
    console.log(req.body)

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    console.log("Received payment request:", req.body);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: currency || "pkr",
      payment_method_types: ["card"],
    });

    console.log("Payment Intent Created:", paymentIntent);

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Payment Error:", error);
    res.status(500).json({ error: error.message });
  }
});




// Global error handler (after all routes)
app.use(require('./middleware/errorHandler'));


// app.use("/api/coupon", couponsRoutes);

// for production
// Serve static assets in production
if (process.env.NODE_ENV === "production") {
  // set static folder
  app.use(express.static("client/build"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

// const PORT = process.env.PORT || 5000;
const host = ip.address(); // Auto-detects the system's IP
const port = process.env.PORT || 5000;

app.listen(port, host, () => {
  console.log(`✅ Server running on http://${host}:${port}`);
});
