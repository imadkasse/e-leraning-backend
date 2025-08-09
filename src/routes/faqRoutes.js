const express = require("express");
const { prmission, restrictTo } = require("../controllers/authController");
const {
  getAllFaqMsg,
  updateFaq,
  deleteFaq,
  getFaq,
  sendFaq,
  replyToTicket,
  getMyFaqMessage,
} = require("../controllers/ticketController");

const router = express.Router();

router
  .route("/")
  .get(prmission, restrictTo("admin"), getAllFaqMsg)
  .post(prmission, restrictTo("student"), sendFaq);

router
  .route("/myFaqs")
  .get(prmission, restrictTo("student", "teacher"), getMyFaqMessage);

router
  .route("/:ticketId")
  .get(prmission, restrictTo("student", "teacher"), getFaq)
  .patch(prmission, restrictTo("student", "teacher"), updateFaq)
  .delete(prmission, restrictTo("admin", "student", "teacher"), deleteFaq);

router
  .route("/:ticketId/reply")
  .post(prmission, restrictTo("admin"), replyToTicket);

module.exports = router;
