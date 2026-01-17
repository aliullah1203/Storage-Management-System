const path = require("path");
const fs = require("fs");
const File = require("../models/File");
const User = require("../models/User");
const { hashPassword } = require("../services/encryption");

function detectTypeByMime(originalname, mimetype) {
  if (!mimetype && originalname) {
    const ext = path.extname(originalname).toLowerCase();
    if ([".pdf"].includes(ext)) return "pdf";
    if ([".doc", ".docx", ".txt", ".md"].includes(ext)) return "note";
    if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"].includes(ext))
      return "image";
    return "file";
  }
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype === "application/pdf") return "pdf";
  if (
    [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/markdown",
    ].includes(mimetype)
  )
    return "note";
  return "file";
}

// upload handled by multer; req.file exists
exports.upload = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const { originalname, mimetype, size, filename } = req.file;
  try {
    // check quota
    const user = await User.findById(req.user._id);
    if (user.usedStorage + size > user.storageQuota) {
      // remove uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Storage quota exceeded" });
    }
    const detectedType = detectTypeByMime(originalname, mimetype);
    const fileDoc = await File.create({
      owner: req.user._id,
      name: originalname,
      mimeType: mimetype,
      size,
      path: `/uploads/${filename}`,
      type: detectedType,
      metadata: {},
    });
    user.usedStorage += size;
    await user.save();
    // return simplified response
    return res.json({ success: true, filename: filename, fileid: fileDoc._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// create a text note
exports.createNote = async (req, res) => {
  const { title, content } = req.body;
  if (!title) return res.status(400).json({ error: "Title required" });
  try {
    const note = await File.create({
      owner: req.user._id,
      name: title,
      type: "note",
      content: content || "",
    });
    return res.status(201).json({ ok: true, note });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// list by folder type: note, image, pdf
exports.listByFolder = async (req, res) => {
  const {
    q,
    type,
    recent,
    favorites,
    folderId,
    page = 1,
    limit = 24,
  } = req.query;

  const filter = { owner: req.user._id };
  if (type) filter.type = type;
  if (folderId) filter.folder = folderId;
  if (favorites === "true") filter.isFavorite = true;
  if (q) filter.name = { $regex: q, $options: "i" };

  try {
    const p = parseInt(page, 10) || 1;
    const l = parseInt(limit, 10) || 24;

    let cursor = File.find(filter)
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l);

    if (recent === "true") {
      cursor = File.find(filter).sort({ updatedAt: -1 }).limit(20);
    }

    const items = await cursor.exec();

    const files = items.map((it) => ({
      name: it.name,
      _id: it._id,
      size: it.size || 0,
      ...(it.path && { url: it.path }),
    }));

    return res.json({
      files,
      folderId,
      page: p,
      limit: l,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// copy: create a shallow copy (DB record). For files, duplicate physical file too.
exports.copy = async (req, res) => {
  try {
    const src = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!src) return res.status(404).json({ error: "Not found" });
    let newPath = src.path;
    let newSize = src.size;
    if (src.path) {
      const srcPath = path.join(process.cwd(), src.path);
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${
        src.name
      }`;
      const dstRel = `/uploads/${filename}`;
      const dstPath = path.join(process.cwd(), "uploads", filename);
      try {
        fs.copyFileSync(srcPath, dstPath);
        newPath = dstRel;
        const stat = fs.statSync(dstPath);
        newSize = stat.size;
      } catch (e) {
        // if physical copy fails, still allow DB copy referencing same path
      }
    }
    const dup = await File.create({
      owner: req.user._id,
      name: `${src.name} (copy)`,
      type: src.type,
      mimeType: src.mimeType,
      size: newSize,
      path: newPath,
      folder: src.folder,
      duplicatedFrom: src._id,
      metadata: src.metadata,
      content: src.content,
    });
    if (newSize && newSize > 0) {
      const user = await User.findById(req.user._id);
      user.usedStorage += newSize;
      await user.save();
    }
    return res.json({
      ok: true,
      file: { id: dup._id, name: dup.name, url: dup.path },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// share file: add user id to sharedWith
exports.share = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  try {
    const file = await File.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!file) return res.status(404).json({ error: "Not found" });
    if (!file.sharedWith.includes(userId)) file.sharedWith.push(userId);
    await file.save();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// lock/unlock file for privacy
exports.lock = async (req, res) => {
  const { lock, lockKey } = req.body; // lock: true/false
  try {
    const file = await File.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!file) return res.status(404).json({ error: "Not found" });
    if (lock) {
      if (!lockKey)
        return res
          .status(400)
          .json({ error: "lockKey required to enable lock" });
      const hashed = await hashPassword(lockKey);
      file.lockHash = hashed;
      file.isPrivate = true;
    } else {
      file.lockHash = undefined;
      file.isPrivate = false;
    }
    await file.save();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// list favorites
exports.favorites = async (req, res) => {
  try {
    const items = await File.find({ owner: req.user._id, isFavorite: true })
      .sort({ updatedAt: -1 })
      .exec();
    const files = items.map((it) => ({
      id: it._id,
      name: it.name,
      size: it.size,
      url: it.path,
    }));
    return res.json({ files });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// calendar filter: date in YYYY-MM-DD
exports.calendar = async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date=YYYY-MM-DD required" });
  try {
    const start = new Date(date + "T00:00:00.000Z");
    const end = new Date(date + "T23:59:59.999Z");
    const items = await File.find({
      owner: req.user._id,
      createdAt: { $gte: start, $lte: end },
    }).exec();
    const files = items.map((it) => ({
      id: it._id,
      name: it.name,
      size: it.size,
      url: it.path,
    }));
    return res.json({ files });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.createFolder = async (req, res) => {
  const { name, parentId } = req.body;
  if (!name) return res.status(400).json({ error: "Folder name required" });
  try {
    const folder = await File.create({
      owner: req.user._id,
      name,
      type: "folder",
      folder: parentId || null,
    });
    res.json({ folder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.list = async (req, res) => {
  const {
    q,
    type,
    recent,
    favorites,
    folderId,
    page = 1,
    limit = 24,
  } = req.query;
  const filter = { owner: req.user._id };
  if (type) filter.type = type;
  if (folderId) filter.folder = folderId;
  if (favorites === "true") filter.isFavorite = true;
  if (q) filter.name = { $regex: q, $options: "i" };
  try {
    const p = parseInt(page, 10) || 1;
    const l = parseInt(limit, 10) || 24;
    let cursor = File.find(filter)
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l);
    if (recent === "true")
      cursor = File.find(filter).sort({ updatedAt: -1 }).limit(20);
    const items = await cursor.exec();
    const files = items.map((it) => ({
      name: it.name,
      size: it.size,
      url: it.path,
    }));
    return res.json({ files, page: p, limit: l });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!file) return res.status(404).json({ error: "Not found" });
    res.json({ file, _id: file._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rename = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  try {
    const file = await File.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { name },
      { new: true }
    );
    if (!file) return res.status(404).json({ error: "Not found" });
    res.json({ file });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Toggle favorite
exports.toggleFavorite = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!file) return res.status(404).json({ error: "Not found" });

    file.isFavorite = !file.isFavorite;
    await file.save();
    res.json({ file });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.duplicate = async (req, res) => {
  try {
    const src = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!src) return res.status(404).json({ error: "Not found" });
    const dup = await File.create({
      owner: src.owner,
      name: `${src.name} (copy)`,
      type: src.type,
      mimeType: src.mimeType,
      size: src.size,
      path: src.path,
      folder: src.folder,
      duplicatedFrom: src._id,
      metadata: src.metadata,
    });
    // if actual file size, increase user usedStorage
    if (dup.size && dup.size > 0) {
      const user = await User.findById(req.user._id);
      user.usedStorage += dup.size;
      await user.save();
    }
    res.json({ file: dup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a single file
exports.delete = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!file) return res.status(404).json({ error: "Not found" });

    // Delete physical file if exists
    if (file.path) {
      const filepath = path.join(process.cwd(), file.path);
      try {
        fs.unlinkSync(filepath);
      } catch (e) {}

      // Reduce user's used storage
      if (file.size && file.size > 0) {
        const user = await User.findById(req.user._id);
        user.usedStorage = Math.max(0, user.usedStorage - file.size);
        await user.save();
      }
    }

    // Delete DB record
    await File.deleteOne({ _id: file._id });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.usage = async (req, res) => {
  try {
    const files = await File.find({ owner: req.user._id })
      .select("size")
      .exec();
    const totalFiles = files.length;
    const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);
    const totalSizeMB = Math.round((totalSize / (1024 * 1024)) * 10) / 10; // one decimal
    return res.json({ totalFiles, totalSizeMB });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
