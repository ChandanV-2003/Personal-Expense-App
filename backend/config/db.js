const mongoose = require("mongoose");

const configureDB = async () => {
  try {
    console.log("⏳ Attempting to connect to MongoDB Atlas...");
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Wait only 5 seconds for initial connection
    });
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ DB Connection Error: ${err.message}`);
    console.error("💡 Tip: Make sure your IP is whitelisted in MongoDB Atlas (Network Access).");
    process.exit(1);
  }
};

module.exports = configureDB;