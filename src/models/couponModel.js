const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: { type: Number, required: true },
    discountAsPercentage: { type: Number, min: 0, max: 100 },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", default: null },
    maxUsage: { type: Number, default: null }, // null => not Limit
    usedCount: { type: Number, default: 0 },
    // expiresAt: { type: Date, required: true }, // not nedded in this time
  },
  {
    timestamps: true,
  }
);

// التحقق من صلاحية الكوبون
couponSchema.methods.isValid = function () {
  // const notExpired = this.expiresAt > Date.now();
  const underLimit = !this.maxUsage || this.usedCount < this.maxUsage;
  return underLimit;
};

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
