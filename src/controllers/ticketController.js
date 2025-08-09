const Ticket = require("../models/ticketModel");
const User = require("../models/userModel");
const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");

// Get all FAQ messages (for admin)
exports.getAllFaqMsg = catchAsync(async (req, res, next) => {
  const faqs = await Ticket.find().populate("user");
  res.status(200).json({
    status: "success",
    message: "تم التحديث بنجاح",
    data: { faqs },
  });
});

// Send FAQ message

exports.sendFaq = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }

  const faq = await Ticket.create({
    user: user._id,
    subject: req.body.subject,
    description: req.body.description,
    replies: [],
  });

  //send with socket.io
  const io = req.app.get("socketio");

  io.emit("newFaq", {
    message: `تم تلقي رسالة من طرف ${user.username}   `,
    faq,
  });

  res.status(200).json({
    status: "success",
    message: "تم التحديث بنجاح",
    faq,
  });
});

// Get specific FAQ message (for user)
exports.getMyFaqMessage = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }

  const faqs = await Ticket.find({ user: user._id }).populate("user");
  if (!faqs.length) {
    return next(new AppError("لا يوجد لديك رسائل تذكرة حاليا", 404));
  }

  //send with socket.io
  const io = req.app.get("socketio");

  io.emit("userFaqs", {
    message: `تم استرجاع جميع الرسائل الخاصة بـ ${user.username}.`,
    faqs,
  });
  res.status(200).json({
    status: "success",
    message: "تم استرجاع الرسائل بنجاح",
    faqs,
  });
});

// Get specific FAQ message
exports.getFaq = catchAsync(async (req, res, next) => {
  const faq = await Ticket.findById(req.params.ticketId).populate("user");
  if (!faq) return next(new AppError("التذكرة غير موجودة", 404));

  res.status(200).json({
    status: "success",
    message: "تم التحديث بنجاح",
    data: { faq },
  });
});

// Update FAQ message
exports.updateFaq = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }

  const faq = await Ticket.findById(req.params.ticketId);
  if (!faq.user.equals(user._id)) {
    return next(new AppError("ليس لديك الصلاحية للتحديث هذه التذكرة", 403));
  }

  faq.subject = req.body.subject || faq.subject;
  faq.description = req.body.description || faq.description;
  faq.updatedAt = Date.now(); // يتم ضبط `updatedAt` يدويًا إذا لم تستخدم `timestamps`

  await faq.save();

  //update with socket.io

  const io = req.app.get("socketio");

  io.emit("updateFaq", {
    message: "تم التحديث",
    faq,
  });

  res.status(200).json({
    status: "success",
    message: "تم التحديث بنجاح",
    data: { faq },
  });
});

// Delete FAQ message
exports.deleteFaq = catchAsync(async (req, res, next) => {
  const faq = await Ticket.findByIdAndDelete(req.params.ticketId);
  if (!faq) return next(new AppError("التذكرة غير موجودة", 404));
  //send with socket.io
  const io = req.app.get("socketio");

  io.emit("deleteFaq", {
    message: `تم حذف الرسالة`,
    faq,
  });
  res.status(204).json({
    status: "success",
    message: "تم الحذف بنجاح",
  });
});

//replay message by Admin
exports.replyToTicket = catchAsync(async (req, res, next) => {
  // التحقق من وجود الـ admin
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError("لايوجد هذا المستخدم", 403));
  }

  const ticket = await Ticket.findById(req.params.ticketId);
  if (!ticket) {
    return next(new AppError("التذكرة غير موجودة", 404));
  }

  ticket.replies.push({
    user: user._id,
    message: req.body.message,
  });

  await ticket.save();

  // إرسال إشعار للمستخدم عبر Socket.IO
  const io = req.app.get("socketio");
  io.to(ticket.user.toString()).emit("ticketReply", {
    message: `تم الرد على تذكرتك: ${req.body.message}`,
    ticket,
  });

  res.status(200).json({
    status: "success",
    message: "تم إرسال الرد بنجاح",
    data: { ticket },
  });
});
