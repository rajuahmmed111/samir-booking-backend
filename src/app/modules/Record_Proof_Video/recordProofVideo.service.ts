import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { uploadFile } from "../../../helpars/fileUploader";

// create record proof video starting
const createRecordProofVideoStarting = async (
  bookingId: string,
  userId: string,
  videoStartingFiles?: Express.Multer.File[],
) => {
  // video starting upload
  let videoStartingPaths: string[] = [];
  if (videoStartingFiles && videoStartingFiles.length > 0) {
    for (const file of videoStartingFiles) {
      const uploaded = await uploadFile.uploadToCloudinary(file);
      if (!uploaded?.secure_url) {
        throw new Error("Cloudinary upload failed for starting video");
      }
      videoStartingPaths.push(uploaded.secure_url);
    }
  }

  // find booking
  const booking = await prisma.service_booking.findFirst({
    where: { id: bookingId, userId },
  });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  // create record proof video starting
  const result = await prisma.startAndEndProofVideo.create({
    data: {
      recordProofVideoStarting: videoStartingPaths,
      isStartedVideo: true,
      isEndedVideo: false,
      serviceId: booking.serviceId,
      bookingId,
    },
  });

  return result;
};

// update record proof video ending
const updateRecordProofVideoEnding = async (
  bookingId: string,
  userId: string,
  videoEndingFiles?: Express.Multer.File[],
) => {
  // video ending upload
  let videoEndingPaths: string[] = [];
  if (videoEndingFiles && videoEndingFiles.length > 0) {
    for (const file of videoEndingFiles) {
      const uploaded = await uploadFile.uploadToCloudinary(file);
      if (!uploaded?.secure_url) {
        throw new Error("Cloudinary upload failed for ending video");
      }
      videoEndingPaths.push(uploaded.secure_url);
    }
  }

  // find booking
  const booking = await prisma.service_booking.findFirst({
    where: { id: bookingId, userId },
  });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  // find existing proof video
  const existingProof = await prisma.startAndEndProofVideo.findFirst({
    where: {
      isStartedVideo: true,
      isEndedVideo: false,
    },
  });

  if (!existingProof) {
    throw new ApiError(httpStatus.NOT_FOUND, "No starting proof video found");
  }

  // update record proof video ending
  const result = await prisma.startAndEndProofVideo.update({
    where: { id: existingProof.id },
    data: {
      recordProofVideoEnding: videoEndingPaths,
      isEndedVideo: true,
      serviceId: booking.serviceId,
      bookingId,
    },
  });

  return result;
};

export const RecordProofVideoService = {
  createRecordProofVideoStarting,
  updateRecordProofVideoEnding,
};
