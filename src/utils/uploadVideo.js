const fs = require("fs");
const multer = require("multer");
const path = require("path");
const axios = require("axios");
// config multer
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, path.join(__dirname, "./../", "uploads"));
  },
  filename: (req, file, callback) => {
    // إنشاء اسم ملف فريد لمنع تداخل الأسماء
    // استخدام timestamp (الوقت الحالي) واسم الملف الأصلي هو طريقة شائعة
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    callback(
      null,
      file.fieldname +
        "-" +
        uniqueSuffix +
        "." +
        file.originalname.split(".").pop()
    );
  },
});
const baseUrl = process.env.BASE_URL;

const upload = multer({
  storage: storage,
});
exports.setUploads = upload.single("file");

const videoLibraryId = process.env.VIDEO_LIBRARY_ID;
const bunnyApiKey = process.env.BUNNY_API_KEY;

exports.uploadVideo = async (title, file) => {
  const fetchVideoId = await axios.post(
    `${baseUrl}/library/${videoLibraryId}/videos`,
    {
      title: title,
    },
    {
      headers: {
        AccessKey: bunnyApiKey,
        "Content-Type": "application/json",
      },
    }
  );
  const videoId = fetchVideoId.data.guid;

  const uploadUrl = `${baseUrl}/library/${videoLibraryId}/videos/${videoId}`;
  // read the file
  const fileContent = fs.readFileSync(file.path);

  const video = await axios.put(uploadUrl, fileContent, {
    // upload the file to my Library
    headers: {
      AccessKey: bunnyApiKey,
      "Content-Type": "application/octet-stream",
    },
    maxBodyLength: Infinity,
  });
  const videoDetailsResponse = await axios.get(
    `${baseUrl}/library/${videoLibraryId}/videos/${videoId}`,
    {
      headers: {
        AccessKey: bunnyApiKey,
      },
    }
  );

  const videoDetails = videoDetailsResponse.data;
  const videoFormat = videoDetails.mediaType; // تنسيق الفيديو
  const videoDuration = videoDetails.length;
  // deleting file
  fs.unlink(file.path, (err) => {
    console.log(`${file.path} was deleted`);
  });

  return {
    videoId,
    videoFormat,
    videoDuration,
  };
};
exports.removeVideo = async (videoId) => {
  try {
    const res = await axios.delete(
      `${baseUrl}/library/${videoLibraryId}/videos/${videoId}`,
      {
        headers: {
          AccessKey: bunnyApiKey,
          "Content-Type": "application/json",
        },
      }
    );
    return true
  } catch (error) {
    console.log("Error When Deleting Video", error);
    return false
  }
};
exports.analytics = async ()=>{
  
}
