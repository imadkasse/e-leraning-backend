const express = require("express");
const { getAnalytics } = require("../controllers/adminController");
const { prmission, restrictTo } = require("../controllers/authController");

const router = express.Router();

router.route("/").get(prmission, restrictTo("admin"), getAnalytics);

module.exports = router;
