const User = require("../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const APIFeaturs = require("./../utils/apiFeaturs");
const multer = require("multer");
const cloudinary = require("./../config/cloudinary");
const sharp = require("sharp");

// upload files
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

exports.uploadThumbnail = upload.single("thumbnail");

//Uploads a image Cover
exports.uploadUserThumbnail = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  // رفع كل صورة إلى Cloudinary والحصول على روابط الصور

  const file = req.file;

  // تعديل حجم الصورة باستخدام Sharp
  const resizedImageBuffer = await sharp(file.buffer)
    .resize(500, 500)
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
  req.body.thumbnail = result.secure_url;
  next();
});

exports.updateMe = catchAsync(async (req, res, next) => {
  if (
    req.body.role ||
    req.body.password ||
    req.body.progress ||
    req.body.enrolledCourses ||
    req.body.balance
  ) {
    return next(new AppError("هذا النطاق غير مخصص لتحديث هذه القيم", 400));
  }
  const user = await User.findByIdAndUpdate(req.user.id, req.body, {
    new: true,
    runValidators: true,
  }).select("-password");
  res.status(200).json({
    message: "تم التحديث بنجاح",
    user,
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      active: false,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(204).json({
    message: "تم التحديث بنجاح",
  });
});

exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .select("-password")
    .populate([
      {
        path: "enrolledCourses",//for student
      },
      {
        path: "publishedCourses",//for teacher
      },
    ]);
  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }
  res.status(200).json({
    message: "نجاح ",
    user,
  });
});

// show all course enrolled
exports.getEnrolledCourses = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate("enrolledCourses");
  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }
  res.status(200).json({
    message: "نجاح ",
    enrolledCourses: user.enrolledCourses,
  });
});

//for Admins
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const features = new APIFeaturs(User.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const users = await features.query;
  const allDocs = await User.countDocuments(); // get All page
  const totalPages = Math.ceil(allDocs / req.query.limit);

  res.status(200).json({
    message: "success",
    result: users.length,
    users: users,
    totalPages,
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new AppError("ليس لديك الصلاحية للوصول إلى هذه الصفحة", 403));
  }

  const user = await User.findById(req.params.id).select("-password");
  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }
  res.status(200).json({
    message: "نجاح ",
    user,
  });
});

exports.createUser = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  res.status(201).json({
    message: "تم التسجيل بنجاح",
    user: newUser,
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new AppError("ليس لديك الصلاحية للوصول إلى هذه الصفحة", 403));
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }
  res.status(204).json({
    message: "تم الحذف بنجاح",
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError("المستحدم غير موجود ", 401));
  }
  // check if the entered current password is correct
  if (!(await user.correctPassword(req.body.currentPassword))) {
    return next(new AppError("كلمة المرور الحالية غير صحيحة ", 401));
  }
  // update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();
  res.status(200).json({
    message: "تم تحديث بنجاح كلمة السر بنجاح",
  });
});

exports.searchUsers = catchAsync(async (req, res, next) => {
  const query = req.query.query;
  // استلام نص البحث من المتغير query
  if (!query) {
    return next(new AppError("يرجى إدخال نص للبحث", 400));
  }
  const users = await User.find({
    $or: [
      { username: { $regex: query, $options: "i" } }, // البحث حسب العنوان
    ],
  });

  if (users.length === 0) {
    return next(new AppError("لا يوجد مستخدمين  يطابقون  هذا البحث", 404));
  }

  res.status(200).json({
    message: "تم العثور على المستخدمين  بنجاح",
    results: users.length,
    users,
  });
});

exports.UpdateStatusUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }

  res.status(200).json({
    message: "تم التحديث بنجاح",
    user,
  });
});

// ? section balance

exports.addBalance = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      $inc: { balance: req.body.balance },
    },
    {
      new: true,
      runValidators: true,
    }
  );
  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }
  res.status(200).json({
    message: "تم إضافة المبلغ بنجاح",
    user,
  });
});
