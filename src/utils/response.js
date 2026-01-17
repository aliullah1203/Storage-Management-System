exports.success = (res, data = {}) => res.json({ ok: true, ...data });
exports.error = (res, status = 500, message = "Server error") =>
  res.status(status).json({ ok: false, error: message });
