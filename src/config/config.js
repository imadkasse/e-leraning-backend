require("dotenv").config();

module.exports = {
  port: process.env.PORT,
  uri: process.env.URI,
  jwt_secret: process.env.JWT_SECRET,
  jwt_expiration_time: process.env.JWT_EXPIRATION_TIME,
};
