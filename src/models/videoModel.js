const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const videoSchema = new Schema({
  lessonTitle: {
    type: String,
    required: true,
  },
  url: {
    type: String, //! this is video id only
    required: true,
  },
  format: {
    type: String, // مثل MP4, WebM, إلخ
    required: true,
    default: ".mp4",
  },
  duration: {
    type: Number,
    // مدة الفيديو بالثواني أو الدقائق
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // معرف المستخدم الذي رفع الفيديو
    required: true,
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Section", // إذا كان الفيديو مرتبط بكورس معين
  }, //! Replace with sectionId
  isCompleted: {
    type: Boolean,
    default: false, // الفيديو ليس مكتمل
  },
  completedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // المستخدمين الذين أتموا الفيديو
    },
  ],
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  publishedDate: { type: Date, default: Date.now },
});
const Video = mongoose.model("Video", videoSchema);
module.exports = Video;
