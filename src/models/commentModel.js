const mongoose = require("mongoose");
const { populate } = require("./notifcationModel");

const Schema = mongoose.Schema;

const commentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true }, // الدورة
  video: { type: Schema.Types.ObjectId, ref: "Video", required: false }, // الفيديو
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  replies: [
    {
      user: { type: Schema.Types.ObjectId, ref: "User" },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
});

commentSchema.pre(/^find/, function () {
  this.populate([
    {
      path: "user",
    },
    // {
    //   path: "video",
    // },
    {
      path: "replies", // تعبئة `replies`
      populate: {
        path: "user",
      },
    },
  ]);
});

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
