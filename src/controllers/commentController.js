const Comment = require("../models/commentModel");
const Course = require("../models/courseModel");
const Notification = require("../models/notifcationModel");
const User = require("../models/userModel");
const Video = require("../models/videoModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getAllComments = catchAsync(async (req, res, next) => {
  const comments = await Comment.find().populate([
    {
      path: "user",
      select: "username thumbnail",
    },
    {
      path: "replies.user",
      select: "username thumbnail",
    },
  ]);
  res.status(200).json({
    status: "success",
    message: "تم التحديث بنجاح",
    counts: comments.length,
    data: { comments },
  });
});

exports.addComment = catchAsync(async (req, res, next) => {
  const { courseId, videoId } = req.params;
  req.body.user = req.user.id;
  req.body.course = courseId;
  req.body.video = videoId;

  // التحقق من وجود المستخدم
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError("المستخدم غير موجود", 404));

  // التحقق من وجود الكورس أو الفيديو (اختياري)
  const course = await Course.findById(courseId);
  if (!course) return next(new AppError("الكورس غير موجود", 404));

  const video = await Video.findById(videoId);
  if (!video) return next(new AppError("الفيديو غير موجود", 404));

  // إنشاء التعليق
  const newcomment = await Comment.create(req.body);
  const comment = await Comment.findById(newcomment.id).select(
    "-course -video -__v"
  );

  video.comments.push(comment._id);
  await video.save();
  //send with socket.io
  const io = req.app.get("socketio");

  io.emit("newComment", {
    message: `تم إضافة تعليق من طرف ${user.username}`,
    comment,
    courseImage: course.imageCover,
    courseId: course.id,
    user,
    lessonNumber:10 //edit after time
    //   course.videos.findIndex((lesson) => lesson.id === video.id) + 1,//error in section
  });

  const notification = await Notification.create({
    user: course.instructor,
    courseId: course.id,
    courseImage: course.imageCover,
    message: `تم إضافة تعليق من طرف ${user.username}`,
    lessonNumber:10//edit after time
    //   course.videos.findIndex((lesson) => lesson.id === videoId) + 1,//error in section
  });
  const teacher = await User.findById(course.instructor);
  teacher.notifications.push(notification);
  await teacher.save({
    validateModifiedOnly: true,
  });

  res.status(201).json({
    status: "success",
    message: "تم إضافة التعليق بنجاح",
    comment,
  });
});

exports.updateComment = catchAsync(async (req, res, next) => {
  const { commentId, videoId } = req.params;
  const { text } = req.body;

  // البحث عن التعليق
  const comment = await Comment.findById(commentId);

  if (!comment) return next(new AppError("التعليق غير موجود", 404));

  // التحقق من صلاحية المستخدم
  if (comment.user.toString() !== req.user._id.toString())
    return next(new AppError("ليس لديك الصلاحية لتعديل هذا التعليق", 403));

  const video = await Video.findById(videoId);
  if (!video) return next(new AppError("الفيديو غير موجود", 404));

  if (!video.comments.some((c) => c.toString() === comment._id.toString())) {
    return next(new AppError("التعليق غير مرتبط بالفيديو", 400));
  }

  // تعديل النص
  comment.text = text;
  await comment.save();

  res.status(200).json({
    status: "success",
    message: "تم تعديل التعليق بنجاح",
    comment,
  });
});

exports.deleteComment = catchAsync(async (req, res, next) => {
  const { commentId, videoId } = req.params;

  // البحث عن التعليق
  const comment = await Comment.findById(commentId);

  if (!comment) return next(new AppError("التعليق غير موجود", 404));

  // التحقق من صلاحية المستخدم
  if (comment.user.toString() !== req.user._id.toString())
    return next(new AppError("ليس لديك الصلاحية لحذف هذا التعليق", 403));

  const video = await Video.findById(videoId);
  if (!video) return next(new AppError("الفيديو غير موجود", 404));

  if (!video.comments.some((c) => c.toString() === comment._id.toString())) {
    return next(new AppError("التعليق غير مرتبط بالفيديو", 400));
  }
  // حذف التعليق
  await comment.deleteOne();

  video.comments = video.comments.filter(
    (commentIdInVideo) => commentIdInVideo.toString() !== commentId
  );
  await video.save();

  res.status(204).json({
    status: "success",
    message: "تم حذف التعليق بنجاح",
  });
});

// for teacher
exports.addReply = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;
  const { text } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError("المستخدم غير موجود", 404));

  // البحث عن التعليق
  const comment = await Comment.findById(commentId).populate({
    path: "replies",
    populate: {
      path: "user",
    },
  });

  if (!comment) return next(new AppError("التعليق غير موجود", 404));

  comment.replies.push({ user: req.user._id, text });
  await comment.save();

  const updatedComment = await Comment.findById(commentId).populate({
    path: "replies",
    populate: {
      path: "user",
    },
  });

  const course = await Course.findById(comment.course);
  if (!course) return next(new AppError("لا توجد هذه المادة", 404));

  //send with socket.io
  const io = req.app.get("socketio");

  io.emit("newReply", {
    message: `تم إضافة تعليق من طرف ${user.username}`,
    comment,
    courseImage: course.imageCover,
    courseId: course.id,
    user,
    lessonNumber:
      course.videos.findIndex(
        (lesson) => lesson.id === comment.video._id.toString()
      ) + 1,
  });
  const student = await User.findById(comment.user);
  const notification = await Notification.create({
    user: student,
    courseId: course,
    courseImage: course.imageCover,
    message: ` تم إضافة رد من طرف الأستاذ ${user.username}`,
    lessonNumber:
      course.videos.findIndex(
        (lesson) => lesson.id === comment.video._id.toString()
      ) + 1,
  });
  student.notifications.push(notification);
  await student.save({
    validateModifiedOnly: true,
  });

  res.status(201).json({
    status: "success",
    message: "تم إضافة الرد بنجاح",
    comment: updatedComment,
  });
});

exports.getCommentsInLesson = catchAsync(async (req, res, next) => {
  const { videoId } = req.params;
  const comments = await Comment.find({
    video: videoId,
  }).populate([
    {
      path: "user",
      select: "username thumbnail",
    },
    {
      path: "replies.user",
      select: "username thumbnail",
    },
  ]);
  res.status(200).json({
    status: "success",
    message: "تم التحديث بنجاح",
    counts: comments.length,
    data: { comments },
  });
});
