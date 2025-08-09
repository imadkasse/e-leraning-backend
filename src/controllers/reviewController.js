const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");
const Review = require("./../models/reviewModel");
const Course = require("../models/courseModel");
const User = require("../models/userModel");

exports.setUserId = catchAsync(async (req, res, next) => {
  req.body.user = req.user.id;
});

// this for admin only
exports.getAllReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find();

  res.status(200).json({
    status: "تمت العملية بنجاح",
    results: reviews.length,
    data: reviews,
  });
});

// add review in course
exports.addReview = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) {
    return next(new AppError("المادة غير موجودة", 404));
  }
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }

  if (
    !course.enrolledStudents.some(
      (us) => us._id.toString() === user._id.toString()
    )
  ) {
    return next(new AppError("لا يمكنك تقييم الدورة التي لم تسجيل فيها", 403));
  }

  // التحقق مما إذا كان المستخدم قد قام بتقييم الكورس من قبل
  if (
    course.reviews.some((review) => review.user._id.toString() === req.user.id)
  ) {
    return next(new AppError("لقد قمت بتقييم الكورس من قبل ", 403));
  }
  req.body.course = course._id;
  req.body.user = req.user.id;
  const review = await Review.create(req.body);

  course.reviews.push(review._id);
  await course.save();

  res.status(201).json({
    status: "تمت العملية بنجاح",
    review,
  });
});

// update review
exports.updateReview = catchAsync(async (req, res, next) => {
  const review = await Review.findByIdAndUpdate(req.params.reviewId, req.body, {
    new: true,
    runValidators: true,
  });
  if (!review) {
    return next(new AppError("المراجعة غير موجودة", 404));
  }
  res.status(200).json({
    status: "تمت العملية بنجاح",
    data: review,
  });
});

// delete review
exports.deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findByIdAndDelete(req.params.reviewId);

  if (!review) {
    return next(new AppError("المراجعة غير موجودة", 404));
  }
  const course = await Course.findByIdAndUpdate(req.params.courseId, {
    $pull: { reviews: review._id },
  });
  if (!course) {
    return next(new AppError("المادة غير موجودة", 404));
  }

  res.status(204).json({
    status: "تمت العملية بنجاح",
  });
});

//get review
exports.getReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) {
    return next(new AppError("المراجعة غير موجودة", 404));
  }
  res.status(200).json({
    status: "تمت العملية بنجاح",
    data: review,
  });
});
