const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Video = require("./videoModel");
const moment = require("moment");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    required: function () {
      return !this.githubId; // إذا لم يكن تسجيل عبر GitHub، اجعل الحقل مطلوبًا
    },
  },
  email: {
    type: String,
    required: function () {
      return !this.googleId; // اجعل البريد الإلكتروني مطلوبًا للتسجيل المحلي فقط
    },
  },
  phoneNumber: String,
  password: {
    type: String,
    required: function () {
      return !this.googleId; // اجعل كلمة المرور مطلوبة للتسجيل المحلي فقط
    },
    minlength: [6, "كلمة المرور يجب أن تكون على الأقل 6 أحرف"],
  },
  passwordConfirm: {
    type: String,
    required: function () {
      return !this.googleId;
    },
    validate: {
      validator: function (value) {
        return value === this.password;
      },
      message: "كلمة السر غير متطابقة",
    },
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  thumbnail: {
    type: String,
  },
  enrolledCourses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
  progress: [
    {
      course: { type: Schema.Types.ObjectId, ref: "Course" },
      completedVideos: [{ type: Schema.Types.ObjectId, ref: "Video" }],
      percentage: { type: Number, default: 0 },
    },
  ],
  role: {
    type: String,
    enum: ["student", "teacher", "admin"],
    default: "student",
  },
  publishedCourses: [
    {
      type: Schema.Types.ObjectId,
      ref: "Course",
    },
  ],
  balance: {
    // الرصيد الذي يمكن من خلاله الشراء
    type: Number,
    default: 0, // القيمة الافتراضية للرصيد هي 0
    min: 0, // تأكد من أن الرصيد لا يكون سالبًا
  },
  notifications: [
    {
      type: Schema.Types.ObjectId,
      ref: "Notification",
      default: [],
    },
  ],
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  active: {
    type: Boolean,
    default: true,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
    select: false,
  },
  resetPasswordToken: {
    type: String,
    default: null,
    select: false,
  },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre(/^findOne/, function () {
  this.populate([
    {
      path: "notifications",
      options: { sort: { createdAt: -1 } },
    },
    {
      path: "publishedCourses",
      populate: {
        path: "sections",
      },
    },
  ]);
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  console.log("resExp", this.resetPasswordExpires);

  return resetToken;
};

userSchema.methods.updateProgress = async function (courseId, videoId) {
  try {
    // تحقق من وجود الدورة
    const course = await mongoose
      .model("Course")
      .findById(courseId)
      .populate({
        path: "sections",
        populate: {
          path: "videos",
        },
      });
    if (!course) {
      throw new Error("الدورة غير موجودة");
    }
    const allVideos = course.sections.flatMap((sec) => sec.videos);
    // البحث عن تقدم الدورة الحالية
    let progress = this.progress.find(
      (prog) => prog.course.toString() === course._id.toString()
    );

    if (progress) {
      // إذا كان المستخدم مسجل مسبقاً، تحديث التقدم
      if (!progress.completedVideos.includes(videoId)) {
        progress.completedVideos.push(videoId);
        progress.percentage =
          (progress.completedVideos.length / allVideos.length) * 100;
      }
    } else {
      // إذا لم يكن مسجلاً، إضافة تقدم جديد
      progress = {
        course: course._id,
        completedVideos: [videoId],
        percentage: (1 / allVideos.length) * 100,
      };
      this.progress.push(progress);
    }
    progress.percentage =
      (progress.completedVideos.length / allVideos.length) * 100;



    // حفظ التعديلات
    await this.save({ validateModifiedOnly: true });
  } catch (error) {
    console.error("خطأ أثناء تحديث التقدم:", error.message);
    throw error; // إعادة إرسال الخطأ إذا لزم الأمر
  }
};

// تحديث كلمة السر
userSchema.methods.correctPassword = function (currentPassword) {
  return bcrypt.compare(currentPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
