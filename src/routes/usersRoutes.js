const express = require("express");
const {
  getAllUsers,
  updateMe,
  deleteMe,
  createUser,
  getUser,
  deleteUser,
  getEnrolledCourses,
  getMe,
  uploadThumbnail,
  uploadUserThumbnail,
  updatePassword,
  searchUsers,
  UpdateStatusUser,
  addBalance,
} = require("../controllers/userController");
const { prmission, restrictTo } = require("../controllers/authController");

const router = express.Router();

// for normal users student or teacher

router.get("/me", prmission, getMe);
router.patch(
  "/updateMe",
  prmission,
  uploadThumbnail,
  uploadUserThumbnail,
  updateMe
);
router.delete("/deleteMe", prmission, deleteMe);
router.patch("/updatePassword", prmission, updatePassword);

//section course
router
  .route("/course")
  .get(prmission, restrictTo("student"), getEnrolledCourses);

//for admin
router.route("/searchUsers").get(prmission, restrictTo("admin"), searchUsers);
router
  .route("/")
  .get(prmission, restrictTo("admin"), getAllUsers)
  .post(prmission, restrictTo("admin"), createUser);
router
  .route("/:id")
  .get(prmission, restrictTo("admin"), getUser)
  .delete(prmission, restrictTo("admin"), deleteUser)
  .patch(prmission, restrictTo("admin"), UpdateStatusUser)
  .post(prmission, restrictTo("admin"), addBalance);

module.exports = router;
