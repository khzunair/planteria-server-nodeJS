const express = require("express");
const router = express.Router();
const {
  addShipment,
  getShipments,
  getShipmentById,
  updateShipment,
  deleteShipment,
  calculateShipping,
} = require("../../controller/Shipment/ShipmentController");

const adminAuth = require("../../middleware/adminAuth");

// ✅ CRUD Routes
router.post("/", adminAuth, addShipment); // Add new shipment rule
router.get("/", getShipments); // Get all shipment rules
router.get("/:id", getShipmentById); // Get shipment rule by ID
router.put("/:id",adminAuth, updateShipment); // Update shipment rule
router.delete("/:id",adminAuth, deleteShipment); // Delete shipment rule

// ✅ Shipping Cost Calculation Route
router.post("/calculate", calculateShipping);

module.exports = router;
