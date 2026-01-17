require("dotenv").config();
const createApp = require("./app");
const connectDb = require("./config/db");

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDb();
  const app = createApp();
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
