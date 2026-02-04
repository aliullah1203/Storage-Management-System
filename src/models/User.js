const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.provider;
      },
    },
    profilePic: {
      type: String, // store image path or URL
      default: null,
    },
    provider: { type: String, default: null }, // "google" if signed up via Google
    storageQuota: { type: Number, default: 1 * 1024 * 1024 * 1024 }, // 1GB default
    usedStorage: { type: Number, default: 0 },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    locked: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Hash password before save (only if password exists)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  if (!this.password) return false; // Google users have no password
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
