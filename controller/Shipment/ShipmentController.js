const Shipment = require("../../models/Shipment");

// ✅ Add New Shipment Rule
const addShipment = async (req, res) => {
  try {
    const shipment = new Shipment(req.body);
    await shipment.save();
    res.status(201).json({ success: true, msg: "Shipment rule added", shipment });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};

// ✅ Get All Shipment Rules
const getShipments = async (req, res) => {
  try {
    const shipments = await Shipment.find();
    res.json({ success: true, shipments });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};

// ✅ Get Shipment Rule by ID
const getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ success: false, msg: "Shipment rule not found" });
    res.json({ success: true, shipment });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};

// ✅ Update Shipment Rule
const updateShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!shipment) return res.status(404).json({ success: false, msg: "Shipment rule not found" });
    res.json({ success: true, msg: "Shipment rule updated", shipment });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};

// ✅ Delete Shipment Rule
const deleteShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findByIdAndDelete(req.params.id);
    if (!shipment) return res.status(404).json({ success: false, msg: "Shipment rule not found" });
    res.json({ success: true, msg: "Shipment rule deleted" });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};

// ✅ Calculate Shipping Cost
// Shipping Cost=Base Price+(Extra Weight×Price Per Kg)
const calculateShipping = async (req, res) => {
  try {
    const { totalWeight, shippingMethod, region } = req.body;

    // ✅ Find Shipment Rule Based on Weight & Region
    const shipmentRule = await Shipment.findOne({
      shippingMethod,
      region,
      minWeight: { $lte: totalWeight },
      maxWeight: { $gte: totalWeight },
    });

    if (!shipmentRule) {
      return res.status(400).json({ success: false, msg: "No matching shipping rate found" });
    }

    // ✅ Use Fixed Shipping Cost
    const shippingCost = shipmentRule.fixedPrice;

    res.json({
      success: true,
      shippingCost,
      deliveryTime: shipmentRule.deliveryTime,
      msg: `Shipping cost calculated successfully`,
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};


module.exports = {
  addShipment,
  getShipments,
  getShipmentById,
  updateShipment,
  deleteShipment,
  calculateShipping,
};
