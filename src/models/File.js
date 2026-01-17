const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    // support types used by the UI: note, image, pdf, file
    type: {
      type: String,
      enum: ["file", "folder", "note", "image", "pdf"],
      default: "file",
    },
    mimeType: { type: String },
    size: { type: Number, default: 0 },
    path: { type: String },
    folder: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
    isFavorite: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    // optional bcrypt hash if user sets a lock/password for the file
    lockHash: { type: String },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    duplicatedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
    metadata: { type: mongoose.Schema.Types.Mixed },
    // notes store content directly
    content: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("File", fileSchema);
