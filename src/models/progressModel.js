const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const progressSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true }, // إشارة إلى المستخدم
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true }, // إشارة إلى الدورة
  completedVideos: [{ type: Schema.Types.ObjectId, ref: "Video" }], // الفيديوهات المكتملة
  createdAt: { type: Date, default: Date.now },
});

const Progress = mongoose.model("Progress", progressSchema);
module.exports = Progress;
