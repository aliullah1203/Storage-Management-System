const mongoose = require("mongoose");
const { mongodbUri } = require("../config");

async function connect() {
  const uri = mongodbUri;
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("database: connected to", uri);
}

module.exports = { connect };
