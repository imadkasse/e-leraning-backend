const express = require("express");
const { prmission, restrictTo } = require("../controllers/authController");
const { getAllReviews } = require("../controllers/reviewController");

const router = express.Router();

//for admin only
router.route("/").get(prmission, restrictTo("admin"), getAllReviews);



module.exports = router;
