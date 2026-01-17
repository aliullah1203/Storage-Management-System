const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/User");
const ResetToken = require("../models/ResetToken");

const File = require("../models/File");
const fs = require("fs");
const path = require("path");

const signToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET || "secret123", {
    expiresIn: "7d",
  });

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "Missing fields" });
  try {
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "Email already in use" });
    const user = await User.create({ name, email, password });
    // Return a simplified response for frontend
    return res.json({ success: true, message: "User registered" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Missing fields" });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });
    const token = signToken(user);
    return res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.me = async (req, res) => {
  const user = req.user;
  // return simplified user object
  res.json({ _id: user._id, name: user.name, email: user.email });
};

// update profile
exports.updateProfile = async (req, res) => {
  const user = req.user;
  const { name, email, password } = req.body;
  try {
    if (email && email !== user.email) {
      const exists = await User.findOne({ email });
      if (exists)
        return res.status(400).json({ error: "Email already in use" });
      user.email = email;
    }
    if (name) user.name = name;
    if (password) user.password = password; // will be hashed by pre-save hook
    await user.save();
    return res.json({ _id: user._id, name: user.name, email: user.email });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Delete user account
exports.deleteAccount = async (req, res) => {
  try {
    console.log("req.user:", req.user); // check if user is available
    const user = req.user;

    const files = await File.find({ owner: user._id });
    console.log("Files to delete:", files.length);

    for (const f of files) {
      if (f.path) {
        try {
          fs.unlinkSync(path.join(process.cwd(), f.path));
          console.log("Deleted file:", f.path);
        } catch (e) {
          console.error("Failed to delete file:", f.path, e.message);
        }
      }
      await File.deleteOne({ _id: f._id });
    }

    await ResetToken.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });

    res.json({ ok: true, message: "Account deleted successfully" });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(200).json({
        ok: true,
        message: "If account exists, a reset token was created",
      });
    // create token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await ResetToken.create({ user: user._id, token, expiresAt });
    // NOTE: in production send email. Here we return token for convenience/testing.
    res.json({ ok: true, resetToken: token, expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password)
    return res.status(400).json({ error: "Missing fields" });
  try {
    const entry = await ResetToken.findOne({ token }).populate("user");
    if (!entry || entry.expiresAt < new Date())
      return res.status(400).json({ error: "Invalid or expired token" });
    const user = entry.user;
    user.password = password;
    await user.save();
    await ResetToken.deleteMany({ user: user._id });
    res.json({ ok: true, message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
