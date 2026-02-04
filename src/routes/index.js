const express = require("express");
const router = express.Router();

// sub-routers
router.use("/auth", require("./auth"));
router.use("/files", require("./files"));

module.exports = router;
