const errorHandler = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, msg: err.message });
    }
    res.status(500).json({ success: false, msg: "Server Error" });
  };
  
  module.exports = errorHandler;
  