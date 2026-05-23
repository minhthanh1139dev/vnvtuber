const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    shortName: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    logo: {
      type: String,
      default: "",
    },
    branches: {
      type: [String],
      default: [],
    },
    website: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

projectSchema.index({ shortName: 1 });

module.exports = mongoose.model("Project", projectSchema);
