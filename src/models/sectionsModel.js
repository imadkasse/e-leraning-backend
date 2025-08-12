const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const sectionSchema = new Schema({
  title: { type: String, required: true }, // اسم القسم
  videos: [{ type: Schema.Types.ObjectId, ref: "Video" }], // فيديوهات القسم
});
const Section = mongoose.model("Section", sectionSchema);

module.exports = Section;
