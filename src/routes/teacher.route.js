const express = require("express");
const { prmission, restrictTo } = require("../controllers/authController");
const { getAnalyticsTeacher } = require("../controllers/teacherController");

const router = express.Router();

router.route("/").get(prmission, restrictTo("teacher"), getAnalyticsTeacher);

module.exports = router;
