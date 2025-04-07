const VendorBalance = require("../../models/VendorBalance");

exports.getVendorBalanceSummary = async (req, res) => {
  try {
    const vendorId = req.vendor.id;

    // Fetch vendor balance
    const balance = await VendorBalance.findOne({ vendorId });

    if (!balance) {
      return res.status(404).json({
        success: false,
        msg: "Balance record not found. Please update your bank details first.",
      });
    }

    return res.status(200).json({
      success: true,
      balanceSummary: {
        totalEarned: balance.totalEarned,
        pending: balance.pending,
        paid: balance.paid,
        balance: balance.balance,
        lastPaid: balance.lastPaid,
      },
    });
  } catch (error) {
    console.error("Balance Summary Error:", error.message);
    return res.status(500).json({
      success: false,
      msg: "Server error",
      error: error.message,
    });
  }
};
