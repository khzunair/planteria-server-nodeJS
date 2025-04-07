const VendorAccount = require("../../models/VendorAccount");
const RegisteredVendors = require("../../models/RegisteredVendors");
const VendorBalance = require("../../models/VendorBalance");

exports.createOrUpdateVendorAccount = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { accountTitle, bankName, iban, accountNumber, paymentMethod } = req.body;

    const vendor = await RegisteredVendors.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, msg: "Vendor not found" });
    }

    let account = await VendorAccount.findOne({ vendorId });

    if (account) {
      // ✅ Update existing account
      account.accountTitle = accountTitle;
      account.bankName = bankName;
      account.iban = iban;
      account.accountNumber = accountNumber;
      account.paymentMethod = paymentMethod;
      account.updatedAt = Date.now();
      await account.save();

      // ✅ Update bankDetailsProvided flag
      if (!vendor.bankDetailsProvided) {
        vendor.bankDetailsProvided = true;
        await vendor.save();
      }

      return res.status(200).json({ success: true, msg: "Bank account updated", account });
    }

    // ✅ Create new bank account
    const newAccount = new VendorAccount({
      vendorId,
      accountTitle,
      bankName,
      iban,
      accountNumber,
      paymentMethod,
    });

    await newAccount.save();

    // ✅ Update bank details status
    vendor.bankDetailsProvided = true;
    await vendor.save();

    // ✅ Create VendorBalance if not already exists
    const existingBalance = await VendorBalance.findOne({ vendorId });
    if (!existingBalance) {
      const balance = new VendorBalance({
        vendorId,
        totalEarned: 0,
        pending: 0,
        paid: 0,
        balance: 0,
        lastPaid: null,
      });
      await balance.save();
    }

    res.status(201).json({ success: true, msg: "Bank account created", account: newAccount });
  } catch (error) {
    console.error("Vendor Account Error:", error.message);
    res.status(500).json({ success: false, msg: "Server error", error: error.message });
  }
};

exports.getVendorAccount = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const account = await VendorAccount.findOne({ vendorId });

    if (!account) {
      return res.status(404).json({ success: false, msg: "No bank account found" });
    }

    res.status(200).json({ success: true, account });
  } catch (error) {
    console.error("Get Vendor Account Error:", error.message);
    res.status(500).json({ success: false, msg: "Server error", error: error.message });
  }
};


exports.getVendorAccountById = async (req, res) => {
    try {
      const vendorId = req.params.vendorId;
      const account = await VendorAccount.findOne({ vendorId });
  
      if (!account) {
        return res.status(404).json({ success: false, msg: "No bank account found" });
      }
  
      res.status(200).json({ success: true, account });
    } catch (error) {
      console.error("Get Vendor Account Error:", error.message);
      res.status(500).json({ success: false, msg: "Server error", error: error.message });
    }
  };


  
exports.getAllVendorAccount = async (req, res) => {
    try {

      const account = await VendorAccount.find();
  
      if (!account) {
        return res.status(404).json({ success: false, msg: "No bank account found" });
      }
  
      res.status(200).json({ success: true, account });
    } catch (error) {
      console.error("Get Vendor Account Error:", error.message);
      res.status(500).json({ success: false, msg: "Server error", error: error.message });
    }
  };