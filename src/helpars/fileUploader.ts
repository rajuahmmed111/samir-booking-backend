import multer from "multer";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { ICloudinaryUploadResponse, IUploadedFile } from "../interfaces/file";
import config from "../config";

// Create uploads folder if not exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// allowed file types
const allowedTypes = [
  // images
  "image/jpeg",
  "image/png",
  "image/avif",
  "image/webp",

  // documents
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx

  // archives
  "application/zip",

  // openDocument formats
  "application/vnd.oasis.opendocument.presentation", // .odp
  "application/vnd.oasis.opendocument.spreadsheet", // .ods
  "application/vnd.oasis.opendocument.text", // .odt
  "application/vnd.oasis.opendocument.chart",
  "application/vnd.oasis.opendocument.graphics",
  "application/vnd.oasis.opendocument.image",
  "application/vnd.oasis.opendocument.text-master",

  // text files
  "text/plain",
  "text/csv",
  "text/html",
  "text/markdown",
  "text/xml",
  "text/json",
  "application/json",
  "application/octet-stream",

  // video types
  "video/mp4", // MP4
  "video/mpeg", // MPEG
  "video/x-msvideo", // AVI
  "video/x-ms-wmv", // WMV
  "video/quicktime", // MOV
  "video/x-flv", // FLV
  "video/webm", // WEBM
  "video/3gpp", // 3GP
  "video/3gpp2", // 3G2
  "video/ogg", // OGG
  "video/x-matroska", // MKV
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

// Multer disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// Multer middleware
const upload = multer({ storage, fileFilter });

const profileImage = upload.single("profileImage");

const hotelLogo = upload.single("businessLogo");
const hotelImages = upload.array("hotelImages", 40);
const hotelRoomImages = upload.array("hotelRoomImages", 40);
const hotelDocs = upload.array("hotelDocs", 40);

const securityLogo = upload.single("securityLogo");
const securityImages = upload.array("securityImages", 40);
const securityDocs = upload.array("securityDocs", 40);

const carBusinessLogo = upload.single("businessLogo");
const carImages = upload.array("carImages", 40);
const carDocs = upload.array("carDocs", 40);

const attractionBusinessLogo = upload.single("businessLogo");
const attractionImages = upload.array("attractionImages", 40);
const attractionDocs = upload.array("attractionDocs", 40);

const uploadMessageImages = upload.array("messageImages", 40);

const newsImage = upload.array("image", 40);

const advertiseVideo = upload.single("advertiseVideo");

const invertorRelationImage = upload.single("invertorRelationImage");

// Cloudinary configuration
cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

// Cloudinary uploader function
const uploadToCloudinary = async (
  file: IUploadedFile
): Promise<ICloudinaryUploadResponse | undefined> => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(file.path)) {
      return reject(new Error(`File not found at ${file.path}`));
    }

    // Determine resource type based on MIME type
    let resourceType: "image" | "video" | "raw" = "raw";

    if (file.mimetype.startsWith("image/")) {
      resourceType = "image";
    } else if (file.mimetype.startsWith("video/")) {
      resourceType = "video";
    } else {
      resourceType = "raw"; // For PDF, DOCX, XLSX, ZIP, etc.
    }

    cloudinary.uploader.upload(
      file.path,
      { resource_type: resourceType },
      (error, result) => {
        // Delete local file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        if (error) {
          reject(error);
        } else {
          resolve(result as ICloudinaryUploadResponse | undefined);
        }
      }
    );
  });
};

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

  uploadToCloudinary,
};
