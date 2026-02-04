const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const auth = require("../middlewares/auth");
const ctrl = require("../controllers/fileController");

const uploadDir = path.join(__dirname, "..", "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${
      file.originalname
    }`;
    cb(null, unique);
  },
});
const upload = multer({ storage });

router.use(auth);

// Literal paths first
router.post("/upload", upload.single("file"), ctrl.upload);
router.post("/folders", ctrl.createFolder);
router.post("/note", ctrl.createNote);
router.get("/folder/:type", ctrl.listByFolder);
router.get("/favorites", ctrl.favorites);
router.get("/calendar", ctrl.calendar);
router.get("/recent", ctrl.getRecentFiles);
router.get("/usage", ctrl.usage);

// Actions by ID last
router.post("/:id/copy", ctrl.copy);
router.post("/:id/share", ctrl.share);
router.post("/:id/lock", ctrl.lock);
router.patch("/:id/rename", ctrl.rename);
router.patch("/:id/toggle-favorite", ctrl.toggleFavorite);
router.post("/:id/duplicate", ctrl.duplicate);
router.get("/:id", ctrl.get);
router.delete("/:id", ctrl.delete);
router.delete("/:id", auth, ctrl.delete);

module.exports = router;
