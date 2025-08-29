const Course = require("../models/courseModel");
const catchAsync = require("../utils/catchAsync");

exports.getAnalyticsTeacher = catchAsync(async (req, res, next) => {
  // عدد الكورسات الخاصة بالمدرس
  const allCourses = await Course.countDocuments({
    instructor: req.user.id,
  });

  // جلب بيانات الكورسات الخاصة بالمدرس
  const courses = await Course.find({ instructor: req.user.id }).select(
    "price studentsCount title"
  );

  // مجموع الطلاب في كل الكورسات
  const totalEnrollments = courses.reduce((sum, course) => {
    return sum + (course.studentsCount || 0);
  }, 0);

  // مجموع الإيرادات = مجموع (السعر * عدد الطلاب)
  const totalRevenue = courses.reduce((sum, course) => {
    return sum + (course.price || 0) * (course.studentsCount || 0);
  }, 0);

  // الكورس الأكثر تسجيلًا
  const topCourse = await Course.findOne({ instructor: req.user.id })
    .sort({ studentsCount: -1 })
    .select("title studentsCount price");

  res.status(200).json({
    message: "تم جلب التحليلات بنجاح",
    courses: allCourses,
    totalEnrollments,
    totalRevenue,
    topCourse,
  });
});
