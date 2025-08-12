const express = require("express");
const {
  updateCourseSections,
  createCourse,
  getAllcourse,
  getCourse,
  updateCourse,
  deleteCourse,
  enrollCourse,
  uploadCourseImageCover,
  uploadVideosCourse,
  uploadCourseFile,
  deleteLesson,
  unenrollCourse,
  searchCourses,
  updateProgress,
  uploadFilesCourse,
  addLesson,
  updateLesson,
  uploadVideoFromLesson,
  uploadVideoLesson,
  searchCoursesTeachers,
  requireVideoForCreateLesson,
  optionalVideoForUpdateLesson,
  deleteFile,
  addFile,
  uploadFile,
  uploadFileToCloudinary,
  uploadUpdateImageCover,
  requireImageCoverForCreateCourse,
  optionalImageCoverForUpdateCourse,
  isCompleted,
  getCoursesAndCategory,
  createSection,
  updateSection,
  deleteSection,
  addVideoToSection,
} = require("../controllers/courseController");
const { prmission, restrictTo } = require("../controllers/authController");
const {
  addReview,
  updateReview,
  deleteReview,
  setUserId,
} = require("../controllers/reviewController");
const {
  addComment,
  getCommentsInLesson,
} = require("../controllers/commentController");
const { setUploads } = require("../utils/uploadVideo");

const router = express.Router();
router.route("/getCategory").get(getCoursesAndCategory);
///
router
  .route("/")
  .post(
    prmission,
    restrictTo("teacher"),
    uploadCourseFile,
    optionalImageCoverForUpdateCourse,
    uploadCourseImageCover,
    // uploadVideosCourse,
    // uploadFilesCourse,
    createCourse
  )
  .get(getAllcourse);

router.route("/searchCourses").get(searchCourses);
router
  .route("/searchCoursesByTeacher")
  .get(prmission, restrictTo("teacher"), searchCoursesTeachers);

router
  .route("/:courseId")
  .get(getCourse)
  .post(updateCourseSections)
  .patch(
    prmission,
    restrictTo("teacher"),
    uploadUpdateImageCover,
    optionalImageCoverForUpdateCourse,
    uploadCourseImageCover,
    updateCourse
  )
  .delete(prmission, restrictTo("admin", "teacher"), deleteCourse);
//! ############################ NEW ##############################
//  add video to section
router.post(
  "/:courseId/sections/:sectionId",
  prmission,
  restrictTo("teacher"),
  setUploads,
  addVideoToSection
);

// إدارة الأقسام
router
  .route("/:courseId/sections")
  .post(prmission, restrictTo("teacher"), createSection);

router
  .route("/:courseId/sections/:sectionId")
  .patch(prmission, restrictTo("teacher"), updateSection)
  .delete(prmission, restrictTo("teacher"), deleteSection);

// إضافة فيديو لقسم معين
router
  .route("/:courseId/sections/:sectionId/videos")
  .post(
    prmission,
    restrictTo("teacher"),
    uploadVideoFromLesson,
    requireVideoForCreateLesson,
    uploadVideoLesson,
    addLesson
  );

// حذف فيديو من قسم معين
router
  .route("/:courseId/sections/:sectionId/videos/:videoId")
  .delete(prmission, restrictTo("teacher"), deleteLesson)
  .patch(
    prmission,
    restrictTo("teacher"),
    uploadVideoFromLesson,
    optionalVideoForUpdateLesson,
    uploadVideoLesson,
    updateLesson
  );

//enrolled in course
router
  .route("/enrolled/:courseId")
  .post(prmission, restrictTo("student"), enrollCourse)
  .post(prmission, restrictTo("student"), unenrollCourse);
//add review

router
  .route("/:courseId/videos/:videoId")
  .delete(prmission, restrictTo("teacher"), deleteLesson)
  .patch(
    prmission,
    restrictTo("teacher"),
    uploadVideoFromLesson,
    optionalVideoForUpdateLesson,
    uploadVideoLesson,
    updateLesson
  )
  .post(prmission, restrictTo("student"), updateProgress);

// update isComplete video

router
  .route("/:courseId/videos/:videoId/completed")
  .patch(prmission, restrictTo("student"), isCompleted);

// Section Reviews
router
  .route("/reviews/:courseId")
  .post(prmission, restrictTo("student"), addReview);

router
  .route("/:courseId/reviews/:reviewId")
  .patch(prmission, restrictTo("student"), updateReview)
  .delete(prmission, restrictTo("admin", "student"), deleteReview);

//section Files
router
  .route("/:courseId/files")
  .post(
    prmission,
    restrictTo("teacher"),
    uploadFile,
    uploadFileToCloudinary,
    addFile
  );

router
  .route("/:courseId/files/:fileId")
  .delete(prmission, restrictTo("teacher"), deleteFile);

// comments section

router
  .route("/:courseId/lessons/:videoId")
  .post(prmission, restrictTo("student"), addComment);

router.get("/:videoId/comments", prmission, getCommentsInLesson);

module.exports = router;
