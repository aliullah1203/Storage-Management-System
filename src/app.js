const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const passport = require("./services/passport");
const routes = require("./routes");
const path = require("path");

function createApp() {
  const app = express();

  app.use(cors());
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Passport initialize
  app.use(passport.initialize());

  // Static uploads
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

  // API routes
  app.use("/api", routes);

  // Root
  app.get("/", (req, res) =>
    res.json({ ok: true, message: "Storage Management API" }),
  );

  return app;
}

module.exports = createApp;
