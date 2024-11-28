const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const { validationResult } = require("express-validator");
const User = require("../../models/User");
const Role = require("../../models/Role");

// Register a new user
const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const roleObj = await Role.findOne({ name: role });
        if (!roleObj) {
            return res.status(400).json({ errors: [{ msg: "Invalid role" }] });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ errors: [{ msg: "Email already registered" }] });
        }

        // Let the pre-save middleware handle hashing
        const user = new User({
            name,
            email,
            password,
            role: roleObj._id,
            isActive: true,
        });

        await user.save();
        res.status(201).json({ msg: "User registered successfully" });
    } catch (err) {
        console.error("Error during user registration:", err.message);
        res.status(500).send("Server Error");
    }
};


// Log in user
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ errors: [{ msg: "User not found" }] });
        }

        if (!user.isActive) {
            return res.status(403).json({ errors: [{ msg: "User is not active. Contact admin." }] });
        }

        console.log("User password from DB:", user.password);
        console.log("Provided password:", password);

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ errors: [{ msg: "Invalid credentials" }] });
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role,
            },
        };

        jwt.sign(
            payload,
            config.get("jwtSecret"),
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
            }
        );
    } catch (err) {
        console.error("Error during login:", err.message);
        res.status(500).send("Server Error");
    }
};

const getUserDetails = async (req, res) => {
    try {
        // Fetch the user details using the user ID from req.user
        const user = await User.findById(req.user.id).select('-password'); // Exclude password from the response

        if (!user) {
            return res.status(404).json({ errors: [{ msg: 'User not found' }] });
        }

        // Return user details
        res.status(200).json({ user });
    } catch (err) {
        console.error('Error fetching user details:', err.message);
        res.status(500).send('Server Error');
    }
};


// Export the controllers
module.exports = {
    registerUser,
    loginUser,
    getUserDetails
};
