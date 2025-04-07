const Transaction = require("../../models/Transaction");
const VendorBalance = require("../../models/VendorBalance");
const Payout = require("../../models/Payout");


// Admin - Get all pending transactions
exports.getAllPendingTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ status: "Pending" })
      .populate("orderId")
      .populate("vendorId", "name email"); // optional fields

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server Error", error: err.message });
  }
};

// Vendor - Get pending transactions of logged-in vendor
exports.getVendorPendingTransactions = async (req, res) => {
  try {
    const vendorId = req.vendor.id;

    const transactions = await Transaction.find({
      status: "Pending",
      vendorId: vendorId,
    }).populate("orderId");

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server Error", error: err.message });
  }
};


exports.getTransactionById = async (req, res) => {
    const transactionId = req.params.id;
  
    try {
      const transaction = await Transaction.findById(transactionId)
        .populate("orderId")
        .populate("vendorId", "name email");
  
      if (!transaction) {
        return res.status(404).json({ success: false, msg: "Transaction not found" });
      }
  
      // Admin can access all
      if (req.user && req.user.role === "admin") {
        return res.status(200).json({
          success: true,
          data: transaction,
        });
      }
  
      // Vendor can only access their own
      if (req.vendor && transaction.vendorId._id.toString() !== req.vendor.id.toString()) {
        return res.status(403).json({
          success: false,
          msg: "You are not authorized to access this transaction.",
        });
      }
  
      return res.status(200).json({
        success: true,
        data: transaction,
      });
  
    } catch (err) {
      res.status(500).json({ success: false, msg: "Server Error", error: err.message });
    }
  };


  exports.getTransactionByIdForVendor = async (req, res) => {
    const transactionId = req.params.id;
  
    try {
      const transaction = await Transaction.findById(transactionId)
        .populate("orderId")
        .populate("vendorId", "name email"); // optional fields
  
      if (!transaction) {
        return res.status(404).json({
          success: false,
          msg: "Transaction not found",
        });
      }
  
      // If vendor is logged in, validate ownership
      if (req.vendor) {
        const vendorId = req.vendor.id;
  
        if (transaction.vendorId._id.toString() !== vendorId.toString()) {
          return res.status(403).json({
            success: false,
            msg: "Unauthorized: This transaction does not belong to you.",
          });
        }
      }
  
      // If admin is logged in, allow access
      if (req.user && req.user.role === "admin") {
        return res.status(200).json({
          success: true,
          data: transaction,
        });
      }
  
      // If vendor is authorized (passed ownership check)
      if (req.vendor) {
        return res.status(200).json({
          success: true,
          data: transaction,
        });
      }
  
      // No valid user
      return res.status(401).json({
        success: false,
        msg: "Unauthorized access",
      });
  
    } catch (error) {
      return res.status(500).json({
        success: false,
        msg: "Server error",
        error: error.message,
      });
    }
  };



  exports.markTransactionPaidAndGeneratePayout = async (req, res) => {
    const { transactionId, method, note } = req.body;
    const adminId = req.admin.id;
  
    try {
      // 1. Find the transaction (Pending only)
      const transaction = await Transaction.findOne({
        _id: transactionId,
        status: "Pending",
      });
  
      if (!transaction) {
        return res.status(404).json({
          success: false,
          msg: "Transaction not found or already processed.",
        });
      }
  
      const vendorId = transaction.vendorId;
      const amountPaid = transaction.vendorEarning;
  
      // 2. Mark transaction as Paid
      transaction.status = "Paid";
      await transaction.save();
  
      // 3. Create a new Payout
      const payout = new Payout({
        vendorId,
        amountPaid,
        transactionIds: [transactionId],
        method,
        note,
        paidBy: adminId,
        status: "Transferred",
      });
      await payout.save();
  
      // 4. Find or Create VendorBalance
      let balance = await VendorBalance.findOne({ vendorId });
  
      if (!balance) {
        balance = new VendorBalance({
          vendorId,
          totalEarned: 0,
          pending: 0,
          paid: 0,
          balance: 0,
        });
      }
  
      // 5. Update VendorBalance fields
      balance.paid += amountPaid;
      balance.pending -= amountPaid;
      balance.balance -= amountPaid;
      balance.lastPaid = new Date();
      await balance.save();
  
      return res.status(200).json({
        success: true,
        msg: "Transaction marked as paid and payout created successfully.",
        payout,
      });
  
    } catch (err) {
      return res.status(500).json({
        success: false,
        msg: "Server error",
        error: err.message,
      });
    }
  };
  

  exports.getPlatformFeeSummary = async (req, res) => {
    try {
      const paidData = await Transaction.aggregate([
        { $match: { status: "Paid" } },
        {
          $group: {
            _id: null,
            totalPlatformFee: { $sum: "$platformFee" },
            count: { $sum: 1 },
          },
        },
      ]);
  
      const pendingData = await Transaction.aggregate([
        { $match: { status: "Pending" } },
        {
          $group: {
            _id: null,
            totalPlatformFee: { $sum: "$platformFee" },
            count: { $sum: 1 },
          },
        },
      ]);
  
      const summary = {
        paid: {
          totalPlatformFee: paidData[0]?.totalPlatformFee || 0,
          count: paidData[0]?.count || 0,
        },
        pending: {
          totalPlatformFee: pendingData[0]?.totalPlatformFee || 0,
          count: pendingData[0]?.count || 0,
        },
      };
  
      return res.status(200).json({
        success: true,
        platformFeeSummary: summary,
      });
  
    } catch (error) {
      console.error("Platform Fee Summary Error:", error.message);
      return res.status(500).json({
        success: false,
        msg: "Server error",
        error: error.message,
      });
    }
  };
  
  