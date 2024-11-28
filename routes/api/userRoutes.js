const express = require('express');
const { check } = require('express-validator');
const { registerUser, loginUser, getUserDetails } = require('../../controller/Auth/UserController');
const auth = require('../../middleware/studentAuth');

const router = express.Router();

// Register   
router.post(
    '/register',
    [
        check('name', 'Name is required').not().isEmpty(),
        check('email', 'Include a valid email').isEmail(),
        check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
    ],
    registerUser
);

// Login
router.post(
    '/login',
    [
        check('email', 'Include a valid email').isEmail(),
        check('password', 'Password is required').exists(),
    ],
    loginUser
);

// Get User Details
router.get('/details', auth, getUserDetails);

// Update Password
// router.put('/update-password', auth, updatePassword);

module.exports = router;
