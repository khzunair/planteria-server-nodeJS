const { check } = require("express-validator");

exports.validateRegister = [
  check("name", "Name is required").not().isEmpty(),
  check("email", "Include a valid email").isEmail(),
  check("password", "Password must be at least 6 characters").isLength({ min: 6 }),
];

exports.validateLogin = [
  check("email", "Include a valid email").isEmail(),
  check("password", "Password is required").notEmpty(),
];
