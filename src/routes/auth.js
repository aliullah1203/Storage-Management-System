const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const ctrl = require("../controllers/authController");

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.post("/forgot-password", ctrl.forgotPassword);
router.post("/reset-password", ctrl.resetPassword);
router.get("/me", auth, ctrl.me);
router.patch("/me", auth, ctrl.updateProfile);
router.delete("/me", auth, ctrl.deleteAccount);

module.exports = router;
