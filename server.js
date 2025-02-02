const express = require("express");
const bodyParser = require("body-parser");

// Connect Application to Database
const connectDB = require("./config/db");

const cors = require("cors");
const userRoutes = require("./routes/api/userRoutes");
const adminRoutes = require("./routes/api/adminRoutes");
const applicationsRoutes = require("./routes/api/applicationRoutes");
const productCategoryRoutes = require("./routes/api/ProductCategoryRoute");
const productRoutes = require("./routes/api/ProductRoutes");
const productActionsRoutes = require("./routes/api/ProductActionsRoutes");

const app = express();

app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(bodyParser.json({ limit: "10mb" })); // to support JSON-encoded bodies
app.use(express.json({ extended: false }));

// for Production
const path = require("path");

// Connect Database
connectDB();

app.use(cors());
// init middleware
// to get data in request.body
app.use(express.json({ extended: false }));

// ******* Routes *******

// Dummy Route
app.get("/", (req, res) => res.send("API Running"));
// Correct  Working path
app.use("/api/users", userRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/product", productCategoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/products/actions", productActionsRoutes);

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
const host = process.env.HOST || "0.0.0.0"; // Default to '0.0.0.0' if not set
const port = process.env.PORT || 5000;

app.listen(port, host, () => {
  console.log(`Server started on http://${host}:${port}`);
});
