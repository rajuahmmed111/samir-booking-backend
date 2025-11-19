import multer from "multer";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { IUploadedFile } from "../interfaces/file";
import config from "../config";

dotenv.config();

// Create uploads folder if not exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// allowed file types
const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/avif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.chart",
  "application/vnd.oasis.opendocument.graphics",
  "application/vnd.oasis.opendocument.image",
  "application/vnd.oasis.opendocument.text-master",
  "text/plain",
  "text/csv",
  "text/html",
  "text/markdown",
  "text/xml",
  "text/json",
  "application/json",
  "application/octet-stream",
  "video/mp4",
  "video/mpeg",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/quicktime",
  "video/x-flv",
  "video/webm",
  "video/3gpp",
  "video/3gpp2",
  "video/ogg",
  "video/x-matroska",
];

// File filter
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"));
  }
};

// Multer disk storage (local temporary before S3 upload)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`),
});
// Multer middleware
const upload = multer({ storage, fileFilter });

// Different upload groups
const profileImage = upload.single("profileImage");
const hotelLogo = upload.single("businessLogo");
const hotelImages = upload.array("hotelImages", 5);
const hotelRoomImages = upload.array("hotelRoomImages", 5);
const hotelDocs = upload.array("hotelDocs", 5);

const securityLogo = upload.single("securityLogo");
const securityImages = upload.array("securityImages", 5);
const securityDocs = upload.array("securityDocs", 5);

const carBusinessLogo = upload.single("businessLogo");
const carImages = upload.array("carImages", 5);
const carDocs = upload.array("carDocs", 5);

const attractionBusinessLogo = upload.single("businessLogo");
const attractionImages = upload.array("attractionImages", 5);
const attractionDocs = upload.array("attractionDocs", 5);

const uploadMessageImages = upload.array("messageImages", 5);
const newsImage = upload.array("image", 5);
const advertiseVideo = upload.single("advertiseVideo");
const invertorRelationImage = upload.single("invertorRelationImage");

// -------------------- AWS S3 CONFIG --------------------
const s3 = new S3Client({
  region: config.s3_bucket.aws_bucket_region,
  credentials: {
    accessKeyId: config.s3_bucket.aws_bucket_accesskey!,
    secretAccessKey: config.s3_bucket.aws_bucket_secret_key!,
  },
  
});

// Upload to S3
const uploadToS3 = async (
  file: Express.Multer.File,
  folder = "uploads"
): Promise<string> => {
  if (!fs.existsSync(file.path)) throw new Error("File not found");

  const fileStream = fs.createReadStream(file.path);
  const fileName = `${folder}/${Date.now()}-${file.originalname.replace(
    /\s+/g,
    "-"
  )}`;

  const params = {
    Bucket: config.s3_bucket.aws_bucket_name!,
    Key: fileName,
    Body: fileStream,
    ContentType: file.mimetype,
  };

  try {
    await s3.send(new PutObjectCommand(params));
    fs.unlinkSync(file.path); // delete local file
    return `https://${config.s3_bucket.aws_bucket_name}.s3.${config.s3_bucket.aws_bucket_region}.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error("S3 Upload Error:", error);
    throw error;
  }
};
// -------------------- EXPORT --------------------
export const uploadFile = {
  upload,
  profileImage,
  hotelLogo,
  hotelImages,
  hotelRoomImages,
  hotelDocs,

  securityLogo,
  securityImages,
  securityDocs,

  carBusinessLogo,
  carImages,
  carDocs,

  attractionBusinessLogo,
  attractionImages,
  attractionDocs,

  uploadMessageImages,
  newsImage,
  advertiseVideo,
  invertorRelationImage,

  uploadToS3, // ✅ AWS upload function instead of Cloudinary
};
