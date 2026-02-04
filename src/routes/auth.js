const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const ctrl = require("../controllers/authController");
const passport = require("passport");
const jwt = require("jsonwebtoken");

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.post("/forgot-password", ctrl.forgotPassword);
router.post("/reset-password", ctrl.resetPassword);
router.get("/me", auth, ctrl.me);
router.patch("/me", auth, ctrl.updateProfile);
router.delete("/me", auth, ctrl.deleteAccount);

// Google OAuth
// Google OAuth login
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Return JSON for backend-only testing
    res.json({
      token,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        gender: req.user.gender || null,
      },
    });
  },
);

module.exports = router;
