const mongoose = require("mongoose");
require("dotenv").config(); // Load environment variables from .env file

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/planteria", {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log("MongoDB Successfully Connected...");
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1); // Exit the application with failure status
  }
};

module.exports = connectDB;