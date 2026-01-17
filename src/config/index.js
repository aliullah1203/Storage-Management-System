module.exports = {
  mongodbUri:
    process.env.MONGODB_URI || "mongodb://localhost:27017/storage_app",
  jwtSecret: process.env.JWT_SECRET || "change-me",
  port: process.env.PORT || 4000,
};
