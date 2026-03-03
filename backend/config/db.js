const mongoose = require("mongoose");

const configureDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connected");
  } catch (err) {
    console.log(err);
  }
};

module.exports = configureDB;