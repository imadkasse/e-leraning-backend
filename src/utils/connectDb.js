const mongoose = require("mongoose");
const { uri } = require("../config/config");

const connectToDb = async () => {
  try {
    await mongoose.connect(uri);
    console.log("Successfully connected to the database");
  } catch (error) {
    console.error("Error connecting to the database", error);
    process.exit(1);
  }
};

module.exports = connectToDb;
