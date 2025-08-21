const express = require("express");
const {
  loginUser,
  signup,
  prmission,
  redirectGoogle,
  loginWithGoogle,
  forgetPassword,
  resetPassword,
  uploadImageUser,
  uploadUsingClodinary,
  logout,
} = require("../controllers/authController");
const passport = require("passport");
const User = require("../models/userModel");

const router = express.Router();

router.post("/login", loginUser);
router.post("/signup", uploadImageUser, uploadUsingClodinary, signup);
router.post('/logout',logout)

router.get("/google", redirectGoogle);

router.get("/google/callback", loginWithGoogle);

router.post("/forget-password", forgetPassword);
router.post("/reset-password/:resetToken", resetPassword);

module.exports = router;
