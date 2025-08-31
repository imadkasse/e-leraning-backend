const catchAsync = require("./../utils/catchAsync");
const Course = require("../models/courseModel");
const Coupon = require("../models/couponModel");
const AppError = require("../utils/appError");
exports.addCoupon = catchAsync(async (req, res, next) => {
  const {
    code,
    discountType,
    discountValue,
    maxUsage,
    courseId /*expiresAt*/,
  } = req.body;

  let courseData = null;
  if (courseId) {
    courseData = await Course.findById(courseId);
    if (!courseData) {
      return next(new AppError("الدورة غير موجودة", 404));
    }
  }
  if (discountValue <= 0) {
    return next(new AppError("قيمة الخصم يجب أن تكون أكبر من 0", 400));
  }

  let discountAsPercentage = null;

  if (discountType === "percentage") {
    // إذا أرسل نسبة نحفظها مباشرة
    discountAsPercentage = discountValue;
  } else if (discountType === "fixed") {
    // نحول المبلغ إلى نسبة من سعر الكورس
    if (courseData && courseData.price <= 0) {
      return next(
        new AppError("لا يمكن تطبيق كوبون مبلغ ثابت على دورة مجانية", 400)
      );
    }
    if (!courseData) {
      return next(
        new AppError("لا يمكن إنشاء كوبون بمبلغ ثابت بدون تحديد دورة", 400)
      );
    }
    discountAsPercentage = (discountValue / courseData.price) * 100;
  }
  if (discountAsPercentage > 100) {
    return next(new AppError("لا يمكن أن يتجاوز الخصم 100%", 400));
  }
  const newCoupon = await Coupon.create({
    code,
    discountType,
    discountValue,
    discountAsPercentage,
    courseId,
    maxUsage: maxUsage || null, // null يعني لا يوجد حد
    // expiresAt,
  });

  res
    .status(201)
    .json({ message: "تم إنشاء الكوبون بنجاح", coupon: newCoupon });
});

exports.useCoupon = catchAsync(async (req, res, next) => {
  const { code } = req.body;
  const { courseId } = req.params;

  const coupon = await Coupon.findOne({ code });
  if (!coupon) {
    return next(new AppError("الكوبون غير موجود", 404));
  }
  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError("الدورة غير موجودة", 404));
  }

  if (!coupon.isValid()) {
    return next(new AppError("الكوبون غير صالح للاستخدام", 400));
  }
  let finalPrice = course.price;

  if (coupon.discountType === "percentage") {
    finalPrice = course.price - (course.price * coupon.discountValue) / 100;
  } else if (coupon.discountType === "fixed") {
    finalPrice = course.price - coupon.discountValue;
  }

  if (finalPrice < 0) finalPrice = 0;

  res.status(200).json({ message: "تم تطبيق الكوبون", finalPrice });
});

exports.deleteCoupon = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const deleted = await Coupon.findByIdAndDelete(id);

  if (!deleted) {
    return next(new AppError("الكوبون غير موجود", 404));
  }

  res.status(200).json({ message: "تم حذف الكوبون بنجاح" });
});

exports.getAllCoupons = catchAsync(async (req, res, next) => {
  const coupons = await Coupon.find()
    .populate([
      {
        path: "courseId",
        select: "title",
      },
    ])
    .exec();
  res.status(200).json({
    message: "تم جلب جميع الكوبونات",
    coupons,
  });
});
