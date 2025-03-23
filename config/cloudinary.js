require("dotenv").config();
const cloudinary = require("cloudinary").v2;

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Upload function
exports.uploads = (filePath) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { resource_type: "auto", folder: "products" },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({ url: result.secure_url, id: result.public_id });
        }
      }
    );
  });
};
