const mongoose = require("mongoose");

const sponsorSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  targetUrl: { type: String, required: true },
  imageUrl: { type: String, default: "" },
  discountCode: { type: String, default: "" },
  type: { type: String, enum: ["sponsor", "affiliate"], required: true },
  priceText: { type: String, default: "" }, // E.g. "3.490k" or "6.850k"
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Sponsor", sponsorSchema);
