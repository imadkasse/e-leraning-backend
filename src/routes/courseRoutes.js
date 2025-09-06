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
  uploadCourseFile,
  unenrollCourse,
  searchCourses,
  searchCoursesTeachers,
  deleteFile,
  addFile,
  uploadFile,
  uploadFileToCloudinary,
  uploadUpdateImageCover,
  optionalImageCoverForUpdateCourse,
  isCompleted,
  getCoursesAndCategory,
  updateSection,
  deleteSection,
  addVideoToSection,
  updateVideoTitle,
  deleteVideoFromSection,
  getMyCourses,
} = require("../controllers/courseController");
const { prmission, restrictTo } = require("../controllers/authController");
const {
  addReview,
  updateReview,
  deleteReview,
} = require("../controllers/reviewController");
const {
  addComment,
  getCommentsInLesson,
} = require("../controllers/commentController");
const { setUploads } = require("../utils/uploadVideo");

const router = express.Router();
router.route("/getCategory").get(getCoursesAndCategory);

router
  .route("/")
  .post(
    prmission,
    restrictTo("teacher"),
    uploadCourseFile,
    optionalImageCoverForUpdateCourse,
    uploadCourseImageCover,
    createCourse
  )
  .get(getAllcourse);

router.route("/searchCourses").get(searchCourses);
router
  .route("/searchCoursesByTeacher")
  .get(prmission, restrictTo("teacher"), searchCoursesTeachers);
// get my enrolled Courses
router.route("/my-courses").get(prmission, restrictTo("student"), getMyCourses);
router
  .route("/:courseId")
  .get(getCourse)
  .post(prmission, restrictTo("teacher"), updateCourseSections)
  .patch(
    prmission,
    restrictTo("teacher"),
    uploadUpdateImageCover,
    optionalImageCoverForUpdateCourse,
    uploadCourseImageCover,
    updateCourse
  )
  .delete(prmission, restrictTo("admin", "teacher"), deleteCourse);

// Sections
router
  .route("/:courseId/sections/:sectionId")
  .put(prmission, restrictTo("teacher"), updateSection)
  .delete(prmission, restrictTo("teacher"), deleteSection);

// Section videos (Lessons)

router.post(
  "/:courseId/sections/:sectionId",
  prmission,
  restrictTo("teacher"),
  setUploads,
  addVideoToSection
);
router
  .route("/:courseId/sections/:sectionId/videos/:videoId")
  .put(prmission, restrictTo("teacher"), updateVideoTitle)
  .delete(prmission, restrictTo("teacher"), deleteVideoFromSection);

//enrolled in course
router
  .route("/enrolled/:courseId")
  .post(prmission, restrictTo("student"), enrollCourse)
  .post(prmission, restrictTo("student"), unenrollCourse); // switch POST to PUT or PATCH or DELETE

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
  .route("/:courseId/sections/:sectionId/videos/:videoId/files")
  .post(
    prmission,
    restrictTo("teacher"),
    uploadFile,
    uploadFileToCloudinary,
    addFile
  );

router
  .route("/:courseId/sections/:sectionId/videos/:videoId/files/:fileId")
  .delete(prmission, restrictTo("teacher"), deleteFile);

// comments section

router
  .route("/:courseId/lessons/:videoId")
  .post(prmission, restrictTo("student"), addComment);

router.get("/:videoId/comments", prmission, getCommentsInLesson);

module.exports = router;
