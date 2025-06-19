// middleware/validators/validateHandler.js
const { validationResult } = require("express-validator");
const { errorResponse } = require("../../utils/responseFormatter");

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return errorResponse(res, "Validation failed", errors.array(), 400);
  }

  next();
};

module.exports = handleValidation;
