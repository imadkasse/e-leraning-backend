const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const fileSchema = new Schema({
  filename: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  format: String,
  uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  // courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  uploadedDate: { type: Date, default: Date.now },
});

const File = mongoose.model("File", fileSchema);

module.exports = File;
