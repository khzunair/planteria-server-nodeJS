const VendorAccount = require("../../models/VendorAccount");

exports.createOrUpdateVendorAccount = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { accountTitle, bankName, iban, accountNumber, paymentMethod } = req.body;

    let account = await VendorAccount.findOne({ vendorId });

    if (account) {
      // Update
      account.accountTitle = accountTitle;
      account.bankName = bankName;
      account.iban = iban;
      account.accountNumber = accountNumber;
      account.paymentMethod = paymentMethod;
      account.updatedAt = Date.now();
      await account.save();

      return res.status(200).json({ success: true, msg: "Bank account updated", account });
    }

    // Create new
    const newAccount = new VendorAccount({
      vendorId,
      accountTitle,
      bankName,
      iban,
      accountNumber,
      paymentMethod,
    });

    await newAccount.save();

    res.status(201).json({ success: true, msg: "Bank account created", account: newAccount });
  } catch (error) {
    console.error("Vendor Account Error:", error.message);
    res.status(500).json({ success: false, msg: "Server error", error: error.message });
  }
};

exports.getVendorAccount = async (req, res) => {
  try {
    const vendorId = req.user.id;
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
