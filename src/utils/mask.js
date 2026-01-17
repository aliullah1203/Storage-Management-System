function mask(value, show = 4) {
  if (!value) return value;
  const s = String(value);
  if (s.length <= show) return "*".repeat(s.length);
  return s.slice(0, show) + "*".repeat(Math.max(0, s.length - show));
}

module.exports = { mask };
