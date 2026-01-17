const bcrypt = require("bcryptjs");

// Hash a password
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function comparePassword(candidate, hash) {
  return bcrypt.compare(candidate, hash);
}

module.exports = { hashPassword, comparePassword };
