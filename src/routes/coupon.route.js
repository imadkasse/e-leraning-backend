const express = require("express");
const {
  addCoupon,
  useCoupon,
  deleteCoupon,
  getAllCoupons,
} = require("../controllers/couponController");
const { prmission, restrictTo } = require("../controllers/authController");
const router = express.Router();

router
  .route("/")
  .get(prmission, restrictTo("admin"), getAllCoupons)
  .post(prmission, restrictTo("admin"), addCoupon);
router.post("/use/:courseId",  useCoupon);
router.delete("/:id", prmission, restrictTo("admin"), deleteCoupon);

module.exports = router;
