const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const courseSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructor: { type: Schema.Types.ObjectId, ref: "User", required: true }, // إشارة إلى المدرس
  sections: [{ type: Schema.Types.ObjectId, ref: "Section", required: true }], // coreect is : [{ type: Schema.Types.ObjectId, ref: "Section", required: true }]
  files: [{ type: Schema.Types.ObjectId, ref: "File" }], // ملفات  الدورة
  price: { type: Number, default: 0 }, // إذا كانت الدورة مدفوعة
  category: { type: String },
  duration: Number, // مدة الدورة الكاملة
  publishedDate: { type: Date, default: Date.now }, // تاريخ النشر
  studentsCount: { type: Number, default: 0 },
  imageCover: String,
  enrolledStudents: {
    type: [{ type: Schema.Types.ObjectId, ref: "User" }],
    default: [],
  },
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
  numberRatings: { type: Number, default: 0 },
  avgRatings: {
    type: Number,
    min: [1, "يجب أن يكون التقييم أكبر أو يساوي 1"],
    max: [5, "يجب أن يكون التقييم أقل أو يساوي 5"],
    default: 4.5,
    set: (val) => Math.round(val * 10) / 10,
  },
  concepts: {
    type: [String],
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

courseSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

courseSchema.pre(/^findOne/, function () {
  this.populate([
    {
      path: "instructor",
      select: "username thumbnail",
    },
    {
      path: "sections",
      select: "title videos",
      populate: {
        path: "videos",
        

      },
    },

    {
      path: "files",
      select: "filename size url",
    },
    {
      path: "reviews",
      select: "user createdAt rating content",
      options: { sort: { createdAt: -1 } }, // ترتيب التقييمات من ��ديد الى قديم
    },
  ]);
});

courseSchema.methods.updateStudentsCount = async function () {
  this.studentsCount = this.enrolledStudents.length; // تحديث عدد الطلاب المسجلين
  await this.save();
};

const Course = mongoose.model("Course", courseSchema);
module.exports = Course;
