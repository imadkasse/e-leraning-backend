const express = require("express");
const {
  getAllComments,
  addComment,
  updateComment,
  deleteComment,
  addReply,
} = require("../controllers/commentController");
const { prmission, restrictTo } = require("../controllers/authController");

const router = express.Router();

router.route("/").get(prmission, restrictTo("admin"), getAllComments);

router
  .route("/:commentId/lessons/:videoId")
  .patch(prmission, restrictTo("student"), updateComment)
  .delete(prmission, restrictTo("student"), deleteComment);

router
  .route("/:commentId/replies")
  .post(prmission, restrictTo("teacher"), addReply);

  

module.exports = router;
