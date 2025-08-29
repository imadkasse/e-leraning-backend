const User = require("../models/userModel");
const Course = require("../models/courseModel");

const catchAsync = require("../utils/catchAsync");

exports.getAnalytics = catchAsync(async (req, res, next) => {
  const allUsers = await User.countDocuments();
  const teachers = await User.countDocuments({
    role: "teacher",
  });
  const allCourses = await Course.countDocuments();
  const courses = await Course.find().select("price studentsCount").exec();

  const totalRevenue = courses.reduce((sum, course) => {
    return sum + (course.price || 0) * (course.studentsCount || 0);
  }, 0);

  const totalEnrollments = courses.reduce((sum, course) => {
    return sum + course.studentsCount;
  }, 0);
  const topCourse = await Course.findOne()
    .sort({ studentsCount: -1 })
    .select("title studentsCount price");

  res.status(200).json({
    message: "تم جلب البيانات بنجاح",
    users: allUsers,
    courses: allCourses,
    teachers,
    totalRevenue,
    totalEnrollments,
    topCourse,
  });
});
