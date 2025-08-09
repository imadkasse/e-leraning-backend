const mongoose = require("mongoose");
const Course = require("./courseModel");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true }, // المستخدم الذي كتب التعليق
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true }, // الدورة التي كتب عليها التعليق
  content: { type: String, required: true }, // محتوى التعليق
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
    default: 0, // default value is 0 when no rating is provided by the user.
  },
  createdAt: { type: Date, default: Date.now },
});

reviewSchema.pre(/^find/, function () {
  this.populate([
    {
      path: "user",
      select: "username thumbnail",
    },
    
 
  ]);
});

// clculation AvgRating pre save
reviewSchema.statics.calculateAverageRating = async function (courseId) {
  const stats = await this.aggregate([
    { $match: { course: courseId } },
    {
      $group: {
        _id: "$course",
        numRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  // Update course average rating and number of ratings when a review is added , updated or removed
  if (stats.length > 0) {
    await Course.findByIdAndUpdate(courseId, {
      avgRatings: stats[0].avgRating,
      numberRatings: stats[0].numRating,
    });
  } else {
    await Course.findByIdAndUpdate(courseId, {
      avgRatings: 4,
      numberRatings: 0,
    });
  }
};
reviewSchema.post("save", function () {
  this.constructor.calculateAverageRating(this.course);
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  const review = await this.model.findOne(this.getQuery());
  this.r = review;
  next();
});

// post-hook: يتم تنفيذه بعد تنفيذ عمليات `findOneAnd`
reviewSchema.pre(/^findOneAnd/, async function () {
  if (this.r) {
    await this.r.constructor.calculateAverageRating(this.r.course);
  }
});

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;
