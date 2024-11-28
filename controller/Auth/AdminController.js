const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const { validationResult } = require("express-validator");

// Importing MODEL(s)
const Admin = require("../../models/Admin");

const registerAdmin = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
  
    const { 
        username, 
        password,
        forename,
        surname
    } = req.body;
  
  
    try {
  
        if(!surname){
            return res.status(400).json({ errors: [{ msg: "Surname is required" }] });
        }
        if(!forename){
            return res.status(400).json({ errors: [{ msg: "Forename is required" }] });
        }
        if(!password){
            return res.status(400).json({ errors: [{ msg: "Password is required" }] });
        }
        if(!username){
            return res.status(400).json({ errors: [{ msg: "Username is required" }] });
        }

        // Check if admin already exists
        let admin = await Admin.findOne({ username });
        if (admin) {
            return res.status(400).json({ errors: [{ msg: "Admin with this username already exists!" }] });
        }
  
  
        // Create new admin instance with assigned role ObjectId
        admin = new Admin({
            username, 
            password,
            forename,
            surname
        });
  
        // Encrypt password
        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(password, salt);
  
        // Save admin to database
        await admin.save();
  
        // Remove password from response
        admin.password = undefined;
  
        // Create and return the JWT payload
        const payload = {
            admin: {
                id: admin.id,
            },
        };
  
        jwt.sign(
            payload,
            config.get("jwtSecret"),
            { expiresIn: 9999999999999999 }, // Consider adjusting expiration
            (err, token) => {
                if (err) throw err;
                res.json({ msg: "Admin Registered Successfully", token, admin });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
  };
  
  const loginAdmin = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
  
        const { username, password } = req.body;
  
        // Find admin by email
        const admin = await Admin.findOne({ username });
  
        if (!admin) {
            return res.status(400).json({ errors: [{ msg: "admin not found" }] });
        }
  
  
        // Compare the entered password with the hashed password in the DB
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ errors: [{ msg: "Incorrect password" }] });
        }
  
        // Remove password from the admin object before sending the response
        admin.password = undefined;
  
        // Prepare JWT payload
        const payload = { admin: { id: admin.id } };
  
        // Sign JWT
        jwt.sign(
            payload,
            config.get("jwtSecret"),
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, admin });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send({ errors: [{ msg: "Server Error" }] });
    }
  };
  


  module.exports = { registerAdmin, loginAdmin};