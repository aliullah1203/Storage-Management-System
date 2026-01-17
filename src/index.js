require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");

const connectDb = require("./config/db");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 4000;

// connect to db
connectDb();

// middlewares
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static uploads
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// api
app.use("/api", routes);

app.get("/", (req, res) =>
  res.json({ ok: true, message: "Storage Management Backend" })
);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
