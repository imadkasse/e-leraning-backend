const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");
const Course = require("./../models/courseModel");
const APIFeaturs = require("../utils/apiFeaturs");
const User = require("../models/userModel");
const Video = require("../models/videoModel");
const File = require("../models/fileModel");

//! ################# NEW ###################
const { uploadVideo, removeVideo } = require("../utils/uploadVideo");

const multer = require("multer");
const sharp = require("sharp");
const cloudinary = require("./../config/cloudinary");
const Section = require("../models/sectionsModel");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("video/") ||
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/pdf" || // ملفات PDF
    file.mimetype === "application/msword" || // ملفات Word (DOC)
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // ملفات Word الحديثة (DOCX)
  ) {
    cb(null, true);
  } else {
    cb(
      new AppError("يجب أن يكون الملف من نوع فيديو أو ملف أو صورة ", 400),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadCourseFile = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "videos", maxCount: 4 },
  { name: "files", maxCount: 4 },
]);
//! don't forget to add upload files (pdf files)

//Uploads a image Cover
exports.requireImageCoverForCreateCourse = catchAsync(
  async (req, res, next) => {
    if (
      !req.files ||
      !req.files.imageCover ||
      req.files.imageCover.length === 0
    ) {
      return next(
        new AppError("يرجى تحميل ملف الصورة المغرة  عند إنشاء الدورة", 400)
      );
    }

    next();
  }
);

exports.optionalImageCoverForUpdateCourse = catchAsync(
  async (req, res, next) => {
    if (!req.file) {
      return next();
    }
    next();
  }
);

exports.uploadCourseImageCover = catchAsync(async (req, res, next) => {
  if (req.file) {
    // رفع كل صورة إلى Cloudinary والحصول على روابط الصور

    const file = req.file;

    // تعديل حجم الصورة باستخدام Sharp
    const resizedImageBuffer = await sharp(file.buffer)
      .resize(705, 397, {
        fit: "contain",
      })
      .toBuffer();

    // رفع الصورة إلى Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "image" },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      stream.end(resizedImageBuffer);
    });
    req.body.imageCover = result.secure_url;
  }
  if (req.files) {
    // رفع كل صورة إلى Cloudinary والحصول على روابط الصور

    const file = req.files.imageCover[0];

    // تعديل حجم الصورة باستخدام Sharp
    const resizedImageBuffer = await sharp(file.buffer)
      .resize(705, 397, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();

    // رفع الصورة إلى Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "image" },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      stream.end(resizedImageBuffer);
    });
    req.body.imageCover = result.secure_url;
  }
  next();
});
//Uploads a videos
exports.uploadVideosCourse = catchAsync(async (req, res, next) => {
  if (!req.files || !req.files.videos) {
    return next(new AppError("لم يتم إرسال أي فيديوهات", 400));
  }
  if (!req.body.lessonTitle) {
    return next(new AppError("يرجى إدخال عنوان الدرس", 400));
  }

  const videoPromises = req.files.videos.map((videoFile, i) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "course-videos", resource_type: "video" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(videoFile.buffer);
    }).then((result) => {
      return Video.create({
        lessonTitle: req.body.lessonTitle,
        url: result.secure_url,
        uploadedBy: req.user.id,
        format: result.format,
        duration: result.duration,
      });
    });
  });

  const videos = await Promise.all(videoPromises);
  req.body.videos = videos.map((video) => video._id);
  req.body.duration = videos.reduce((total, video) => {
    return total + video.duration;
  }, 0);
  next();
});
//Upload Files

exports.uploadFilesCourse = catchAsync(async (req, res, next) => {
  if (!req.files || !req.files.files) {
    return next(new AppError("لم يتم إرسال أي ملفات", 400));
  }
  const filePromises = req.files.files.map((file) => {
    return new Promise((resolve, reject) => {
      const fileName = `${Date.now()}-${file.originalname}`;
      const stream = cloudinary.uploader.upload_stream(
        { folder: "course-files", resource_type: "raw", public_id: fileName },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(file.buffer);
    }).then((result) => {
      return File.create({
        format: result.format,
        filename: result.public_id,
        size: result.bytes,
        url: result.secure_url,
        uploadedBy: req.user.id,
      });
    });
  });
  const files = await Promise.all(filePromises);
  req.body.files = files.map((file) => file._id);

  next();
});

//! #################################### UPDATED #############################
// teacher and admin
exports.createCourse = catchAsync(async (req, res, next) => {
  req.body.instructor = req.user.id;
  // course only containe title description price category imageCover concepts
  const course = await Course.create({
    ...req.body,
  });

  //add course to teacher
  await User.findByIdAndUpdate(
    req.user.id,
    {
      $push: { publishedCourses: course._id },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(201).json({
    message: "تم نشر بنجاح",
    course,
  });
});

//! #################################### NEW #############################
//! Route : /courses/{courseId}
// this is add section  to course in after time replace with createSection
exports.updateCourseSections = catchAsync(async (req, res, next) => {
  const courseId = req.params.courseId;
  const sectionTitle = req.body.sectionTitle;

  const teacher = await User.findById(req.user.id);
  console.log(courseId);
  if (!teacher) return next(new AppError("المستخدم غير موجود", 404));
  const course = await Course.findById(courseId);
  if (!course) return next(new AppError("المادة غير موجودة", 404));

  if (!course.instructor._id.toString() === teacher.id.toString()) {
    return next(new AppError("ليس لديك الصلاحية لتحديث الأقسام", 403));
  }

  const section = await Section.create({
    title: sectionTitle,
    videos: [],
  });

  course.sections.push(section.id);
  await course.save();

  res.status(200).json({
    message: "تم حفظ القسم بنجاح",
    section,
  });
});

exports.addVideoToSection = catchAsync(async (req, res, next) => {
  const teacher = await User.findById(req.user.id);
  const sectionId = req.params.sectionId;
  const section = await Section.findById(sectionId);
  const { videoId, videoFormat } = await uploadVideo(req.body.title, req.file);
  console.log(videoId, videoFormat);
  const newVideo = await Video.create({
    lessonTitle: req.body.title,
    url: videoId,
    duration: req.body.duration,
    format: videoFormat,
    uploadedBy: teacher.id,
    sectionId: sectionId,
    description: req.body.description,
  });
  section.videos.push(newVideo.id);
  await section.save();
  res.status(200).json({
    message: "تم رفع الفديو بنجاح",
    video: newVideo,
  });
});

exports.updateVideoTitle = catchAsync(async (req, res, next) => {
  const teacher = await User.findById(req.user.id);
  if (!teacher) return next(new AppError("المستخدم غير موجود", 404));

  const section = await Section.findById(req.params.sectionId);
  if (!section) return next(new AppError("القسم غير موجود", 404));

  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new AppError("الفيديو غير موجود في هذا القسم", 404));

  if (video.uploadedBy.toString() !== teacher.id) {
    return next(new AppError("ليس لديك الصلاحية لتحديث عنوان الفيديو", 403));
  }

  video.lessonTitle = req.body.title;
  await video.save();

  res.status(200).json({
    message: "تم تحديث عنوان الفيديو بنجاح",
    video,
  });
});
exports.deleteVideoFromSection = catchAsync(async (req, res, next) => {
  const teacher = await User.findById(req.user.id);
  if (!teacher) {
    return next(new AppError("المستخدم غير موجود", 404));
  }

  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new AppError("المحاضرة غير موجود", 404));

  const section = await Section.findById(req.params.sectionId);
  if (!section) return next(new AppError("القسم غير موجود", 404));

  if (video.uploadedBy.toString() !== teacher.id) {
    return next(new AppError("ليس لديك الصلاحية لتحديث عنوان الفيديو", 403));
  }

  //check is the video in side section
  if (!section.videos.includes(video._id)) {
    return next(new AppError("المحاضرة غير موجودة في هذا القسم", 400));
  }
  const isRemoved = await removeVideo(video.url);
  if (!isRemoved) {
    return next(new AppError("حدث خطأ أثناء حذف الفيديو من السحابة", 500));
  }
  // حذف الفيديو من القسم
  section.videos = section.videos.filter(
    (v) => v.toString() !== video._id.toString()
  );

  await section.save();

  await video.deleteOne();
  res.status(204).json();
});

//! #################################### NEW #############################
exports.uploadUpdateImageCover = upload.single("imageCover");

exports.updateCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findByIdAndUpdate(
    req.params.courseId,
    { $set: req.body },
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).json({
    message: "تم التحديث بنجاح",
    course,
  });
});

exports.getCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.courseId)
    .populate([
      {
        path: "instructor",
        select: "username thumbnail",
      },
      {
        path: "sections",
        select: "title videos", // please d'ont edit this  line  (am using in courseController.js)
        populate: {
          path: "videos",
          select:
            "lessonTitle duration description url isCompleted completedBy comments files",
          populate: [
            {
              path: "comments",
              select: "user text replies createdAt",
              populate: {
                path: "replies.user",
                select: "username thumbnail createdAt",
              },
            },
            {
              path: "files",
              select: "filename size url format",
            },
          ],
        },
      },

      {
        path: "reviews",
        select: "user createdAt rating content",
        options: { sort: { createdAt: -1 } }, // ترتيب التقييمات من ��ديد الى قديم
      },
    ])
    .lean();
  if (!course) return next(new AppError("المادة غير موجودة", 404));
  res.status(200).json({
    message: "نجاح",
    course,
  });
});

// for admin only
exports.getAllcourse = catchAsync(async (req, res, next) => {
  const features = new APIFeaturs(
    Course.find().populate([
      {
        path: "instructor",
        select: "username thumbnail",
      },
      {
        path: "sections",
        select: "title videos", // please d'ont edit this  line  (am using in courseController.js)
        populate: {
          path: "videos",
          select:
            "lessonTitle duration url isCompleted completedBy comments files",
          populate: [
            {
              path: "comments",
              select: "user text replies createdAt",
              populate: {
                path: "replies.user",
                select: "username thumbnail createdAt",
              },
            },
            {
              path: "files",
              select: "filename size url format",
            },
          ],
        },
      },
      {
        path: "reviews",
        select: "user createdAt rating content",
        options: { sort: { createdAt: -1 } }, // ترتيب التقييمات من ��ديد الى قديم
      },
    ]),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  // const doc = await features.query.explain();
  const courses = await features.query;
  res.status(200).json({
    message: "succse",
    results: courses.length,
    courses,
  });
});
//
exports.deleteCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findByIdAndDelete(req.params.courseId);
  if (!course) return next(new AppError("المادة عير موجودة", 404));
  res.status(204).json({
    message: "تم الحذف بنجاح",
  });
});
exports.getMyCourses = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate({
    path: "enrolledCourses",
    populate: {
      path: "sections",
      select: "title videos",
    },
  });
  res.status(200).json({
    message: "تم الحصول على دورراتك بنجاح",
    course: user.enrolledCourses,
  });
});

// تسجيل طالب في الكورس
exports.enrollCourse = async (req, res, next) => {
  const courseId = req.params.courseId;
  const studentId = req.user.id;

  const student = await User.findById(studentId);
  if (!student) return next(new AppError("المستخدم غير موجود", 404));

  const course = await Course.findById(courseId);
  if (!course) return next(new AppError("المادة غير موجودة", 404));

  if (student.enrolledCourses.includes(courseId)) {
    return next(new AppError("أنت مسجل بالفعل في هذا الكورس", 400));
  }

  if (!(student.balance >= 0 && student.balance >= course.price)) {
    return next(new AppError("ليس لديك رصيد كاف للتسجيل في هذا الكورس", 400));
  }

  course.enrolledStudents.push(studentId);
  course.studentsCount += 1;

  await course.save();

  const updateStudent = await User.findByIdAndUpdate(
    studentId,
    {
      $push: { enrolledCourses: courseId },
      $inc: { balance: -course.price },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  console.log(updateStudent);
  res.status(200).json({
    message: "تم التسجيل في الدورة بنجاح",
  });
};

// remove student from course
exports.unenrollCourse = catchAsync(async (req, res, next) => {
  const courseId = req.params.courseId;
  const studentId = req.user.id;
  const student = await User.findById(studentId);
  if (!student) return next(new AppError("المستخدم غير موجود", 404));
  if (!student.enrolledCourses.includes(courseId)) {
    return next(new AppError("أنت لست مسجل في هذا الكورس", 400));
  }
  const updatedStudent = await User.findByIdAndUpdate(studentId, {
    $pull: { enrolledCourses: courseId },
  });
  const course = await Course.findByIdAndUpdate(courseId, {
    $pull: { enrolledStudents: studentId },
    $inc: { studentsCount: -1 },
  });
});

// search course for admin and student
exports.searchCourses = catchAsync(async (req, res, next) => {
  const query = req.query.query;
  // استلام نص البحث من المتغير query
  if (!query) {
    return next(new AppError("يرجى إدخال نص للبحث", 400));
  }
  const courses = await Course.find({
    $or: [
      { title: { $regex: query, $options: "i" } }, // البحث حسب العنوان
      { description: { $regex: query, $options: "i" } }, // البحث حسب الوصف
    ],
  });

  if (courses.length === 0) {
    return next(new AppError("لا توجد كورسات تطابق هذا البحث", 404));
  }

  res.status(200).json({
    message: "تم العثور على الكورسات بنجاح",
    results: courses.length,
    courses,
  });
});

//search cours for teachers
exports.searchCoursesTeachers = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate("publishedCourses");
  if (!user) return next(new AppError("المستخدم غير موجود", 404));

  const query = req.query.query;
  // استلام نص البحث من المتغير query
  if (!query) {
    return next(new AppError("يرجى إدخال نص للبحث", 400));
  }

  if (!user.publishedCourses || user.publishedCourses.length === 0) {
    return next(new AppError("لا توجد كورسات منشورة", 404));
  }

  const courses = user.publishedCourses.filter((course) => {
    return course.title.toLowerCase().includes(query.toLowerCase());
  });

  if (courses.length === 0) {
    return next(new AppError("لا توجد كورسات تطابق هذا البحث", 404));
  }

  res.status(200).json({
    message: "تم العثور على الكورسات بنجاح",
    results: courses.length,
    courses,
  });
});

// تحديث التقدم
exports.updateProgress = catchAsync(async (req, res, next) => {
  const student = await User.findById(req.user.id);

  if (!student) {
    return res.status(404).json({ message: "الطالب غير موجود" });
  }

  // تحديث التقدم في الكورس
  await student.updateProgress(req.params.courseId, req.params.videoId);

  res.status(200).json({ message: "تم تحديث التقدم بنجاح" });
});

// Videos And Lesson section
exports.uploadVideoFromLesson = upload.single("video");

// add a midallwear to return a next() or Error
//for creating a new lesson
exports.requireVideoForCreateLesson = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("يرجى تحميل ملف الفيديو عند إنشاء الدرس", 400));
  }

  next();
});
exports.optionalVideoForUpdateLesson = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  next();
});

exports.uploadVideoLesson = catchAsync(async (req, res, next) => {
  if (req.file) {
    const file = req.file;
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "video" },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      stream.end(file.buffer);
    });
    req.body.url = result.secure_url;
    req.body.format = result.format;
    req.body.duration = result.duration;
  }

  next();
});

exports.addLesson = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError("المستخدم غير موجود", 404));

  const course = await Course.findById(req.params.courseId);
  if (!course) return next(new AppError("المادة غير موجودة", 404));

  if (!user.publishedCourses.includes(course.id)) {
    return next(new AppError("ليس لديك الصلاحية لإضافة فيديو جديد", 403));
  }

  const section = await Section.findById(req.params.sectionId);
  if (!section) {
    return next(new AppError("القسم غير موجود", 404));
  }

  // التحقق من أن القسم ينتمي للدورة
  if (!course.sections.includes(section._id)) {
    return next(new AppError("القسم لا ينتمي لهذه الدورة", 400));
  }

  req.body.uploadedBy = user._id;
  req.body.courseId = course.id;

  // create lesson with video
  const newLesson = await Video.create(req.body);

  // add the video to section
  section.videos.push(newLesson._id);
  await section.save();

  // تحديث مدة الدورة
  course.duration += newLesson.duration || 0;
  await course.save();

  res.status(200).json({
    status: "success",
    message: "تمت إضافة الفيديو بنجاح",
    newLesson,
  });
});

exports.updateLesson = catchAsync(async (req, res, next) => {
  // التحقق من المستخدم
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }

  // التحقق من الدورة
  const course = await Course.findOne({
    _id: req.params.courseId,
    videos: req.params.videoId,
  }).populate("videos");
  if (!course) {
    return next(new AppError("المادة غير موجودة", 404));
  }

  // التحقق من الصلاحيات
  if (!user.publishedCourses.some((courseId) => courseId.equals(course.id))) {
    return next(
      new AppError("أنت لا تملك الصلاحية للوصول إلى هذه الدورة", 403)
    );
  }

  if (!course.videos.some((video) => video._id.equals(req.params.videoId))) {
    return next(new AppError("المحاضرة غير موجودة ضمن هذه الدورة", 404));
  }

  // تحديث الدرس
  const updatedLesson = await Video.findByIdAndUpdate(
    req.params.videoId,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    message: "تم التحديث بنجاح",
    updatedLesson,
  });
});

//حذف فيديو
exports.deleteLesson = catchAsync(async (req, res, next) => {
  const teacher = await User.findById(req.user.id);
  if (!teacher) {
    return next(new AppError("المستخدم غير موجود", 404));
  }

  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new AppError("المحاضرة غير موجود", 404));

  const section = await Section.findById(req.params.sectionId);
  if (!section) return next(new AppError("القسم غير موجود", 404));

  if (video.uploadedBy.toString() !== teacher.id) {
    return next(new AppError("ليس لديك الصلاحية لتحديث عنوان الفيديو", 403));
  }

  //check is the video in side section
  if (!section.videos.includes(video._id)) {
    return next(new AppError("المحاضرة غير موجودة في هذا القسم", 400));
  }

  // حذف الفيديو من القسم
  section.videos = section.videos.filter(
    (v) => v.toString() !== video._id.toString()
  );

  await section.save();

  // تحديث مدة الدورة
  // course.duration = Math.max(0, course.duration - (video.duration || 0));
  // await course.save();

  // حذف الفيديو نفسه
  await video.deleteOne();
});

//Files (pdf or docx ,doc)

exports.uploadFile = upload.single("file");

exports.uploadFileToCloudinary = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("يرجى تحميل الملف أولا", 400));
  }
  const file = req.file;
  const result = await new Promise((resolve, reject) => {
    const fileName = `${Date.now()}-${file.originalname}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "course-files",
        public_id: fileName,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    stream.end(file.buffer);
  });

  req.body.url = result.secure_url;
  req.body.size = result.bytes;

  next();
});

exports.addFile = catchAsync(async (req, res, next) => {
  const { courseId, sectionId, videoId } = req.params;

  req.body.uploadedBy = req.user.id;

  const file = await File.create(req.body);

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError("المادة غير موجودة", 404));
  }
  const section = await Section.findById(sectionId);
  if (!section) {
    return next(new AppError("القسم غير موجودة", 404));
  }
  const video = await Video.findById(videoId);
  if (!video) {
    return next(new AppError("الدرس غير موجودة", 404));
  }

  video.files.push(file._id);

  await video.save();

  res.status(200).json({
    message: "تمت إضافة الملف بنجاح",
    file,
  });
});

exports.deleteFile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }

  const { courseId, sectionId, videoId, fileId } = req.params;

  // البحث عن الملف بواسطة الـ id
  const file = await File.findById(fileId);

  // إذا لم يتم العثور على الملف
  if (!file) {
    return next(new AppError("الملف غير موجود", 404));
  }

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError("المادة غير موجودة", 404));
  }
  const section = await Section.findById(sectionId);
  if (!section) {
    return next(new AppError("القسم غير موجودة", 404));
  }
  const video = await Video.findById(videoId);
  if (!video) {
    return next(new AppError("الدرس غير موجودة", 404));
  }

  if (!video.files.some((f) => f._id.equals(file.id))) {
    return next(new AppError("الملف غير مرتبط بالدورة", 400));
  }

  // حذف الملف
  await file.deleteOne();

  video.files = video.files.filter(
    (f) => f._id.toString() !== file._id.toString()
  );

  await video.save();

  // استجابة النجاح
  res.status(200).json({
    message: "تم حذف الملف بنجاح",
  });
}); // file is not deleted from cloudinary

exports.isCompleted = catchAsync(async (req, res, next) => {
  const { videoId } = req.params;

  // التحقق من المستخدم
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError("المستخدم غير موجود", 404));

  // التحقق من الفيديو
  const video = await Video.findById(videoId);
  if (!video) return next(new AppError("الفيديو غير موجود", 404));

  // التحقق إذا كان المستخدم قد أكمل الفيديو بالفعل
  if (video.completedBy.includes(user.id)) {
    return next(new AppError("لقد شاهدت الفيديو بالفعل", 400));
  }

  // تحديث الفيديو بإضافة المستخدم إلى قائمة completedBy
  video.completedBy.push(user.id);
  await video.save();
  console.log(video);
  // تحديث تقدم المستخدم في الدورة
  if (!video.courseId) {
    return next(new AppError("الفيديو لا يحتوي على معرف الدورة", 400));
  }

  await user.updateProgress(video.courseId, video._id);

  // إرسال استجابة النجاح
  res.status(200).json({
    status: "success",
    message: "تم مشاهدة الفيديو بنجاح",
    lesson: video,
  });
});

exports.getCoursesAndCategory = catchAsync(async (req, res, next) => {
  const courses = await Course.find();
  //save categories
  const categorys = [];
  courses.filter((course) => {
    if (!categorys.includes(course.category)) {
      categorys.push(course.category);
    }
  });
  const categorysAndCourses = [];
  // save category and courses in object
  categorys.map((category) => {
    categorysAndCourses.push({
      category,
      courses: courses.filter((course) => course.category === category),
    });
  });

  res.status(200).json({
    status: "success",
    message: "تم الحصول على المادات والأقسام",
    courses: categorysAndCourses,
  });
});

// إدارة الأقسام
exports.createSection = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError("المستخدم غير موجود", 404));

  const course = await Course.findById(req.params.courseId);
  if (!course) return next(new AppError("المادة غير موجودة", 404));

  if (!user.publishedCourses.includes(course.id)) {
    return next(new AppError("ليس لديك الصلاحية لإضافة قسم جديد", 403));
  }

  if (!req.body.title) {
    return next(new AppError("عنوان القسم مطلوب", 400));
  }

  const newSection = await Section.create({
    title: req.body.title,
    videos: [],
  });

  course.sections.push(newSection._id);
  await course.save();

  res.status(201).json({
    status: "success",
    message: "تم إنشاء القسم بنجاح",
    section: newSection,
  });
});

exports.updateSection = catchAsync(async (req, res, next) => {
  const { sectionId, courseId } = req.params;
  const teacher = await User.findById(req.user.id);
  if (!teacher) return next(new AppError("المستخدم غير موجود", 404));

  const course = await Course.findById(courseId);
  if (!course) return next(new AppError("المادة غير موجودة", 404));

  if (!course.instructor._id.toString() === teacher.id.toString()) {
    return next(new AppError("ليس لديك الصلاحية لتحديث هذا القسم", 403));
  }

  const section = await Section.findById(sectionId);
  if (!section) return next(new AppError("القسم غير موجود", 404));
  if (
    !course.sections.some((section) => section._id.toString() === sectionId)
  ) {
    return next(new AppError("القسم غير مرتبط بهذه الدورة", 400));
  }

  const updatedSection = await Section.findByIdAndUpdate(sectionId, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    message: "تم تحديث القسم بنجاح",
    section: updatedSection,
  });
});

exports.deleteSection = catchAsync(async (req, res, next) => {
  const { sectionId, courseId } = req.params;
  const teacher = await User.findById(req.user.id);
  if (!teacher) return next(new AppError("المستخدم غير موجود", 404));

  const course = await Course.findById(courseId);
  if (!course) return next(new AppError("المادة غير موجودة", 404));

  if (!course.instructor._id.toString() === teacher.id.toString()) {
    return next(new AppError("ليس لديك الصلاحية لحذف هذا القسم", 403));
  }

  const section = await Section.findById(sectionId);
  if (!section) return next(new AppError("القسم غير موجود", 404));

  if (
    !course.sections.some((section) => section._id.toString() === sectionId)
  ) {
    return next(new AppError("القسم غير مرتبط بهذه الدورة", 400));
  }

  // حذف جميع الفيديوهات في القسم
  if (section.videos.length > 0) {
    await Video.deleteMany({ _id: { $in: section.videos } });
  }

  // حذف القسم
  await section.deleteOne();

  // إزالة القسم من الدورة
  course.sections = course.sections.filter(
    (s) => s._id.toString() !== section._id.toString()
  );
  await course.save();

  res.status(204).json();
});
