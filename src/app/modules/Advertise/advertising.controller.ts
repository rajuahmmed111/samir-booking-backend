import httpStatus from "http-status";
import { AdvertisingServices } from "./advertising.service";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Request, Response } from "express";
import { uploadFile } from "../../../helpars/fileUploader";

// create advertising
const createAdvertising = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const data = req.body;

  // if video is uploaded → upload to cloudinary
  if (req.file) {
    const cloudinaryResponse = await uploadFile.uploadToCloudinary(req.file);
    if (cloudinaryResponse?.secure_url) {
      data.videoUrl = cloudinaryResponse.secure_url;
    }
  }

  const result = await AdvertisingServices.createAdvertising(adminId, data);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Advertising created successfully",
    data: result,
  });
});

// get all advertising
const getAllAdvertising = catchAsync(async (req: Request, res: Response) => {
  const result = await AdvertisingServices.getAllAdvertising();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Advertising fetched successfully",
    data: result,
  });
});

// get single advertising
const getSingleAdvertising = catchAsync(async (req: Request, res: Response) => {
  const advertisingId = req.params.advertisingId;
  const result = await AdvertisingServices.getSingleAdvertising(advertisingId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Advertising fetched successfully",
    data: result,
  });
});

// delete advertising
const deleteAdvertising = catchAsync(async (req: Request, res: Response) => {
  const advertisingId = req.params.advertisingId;
  const result = await AdvertisingServices.deleteAdvertising(advertisingId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Advertising deleted successfully",
    data: result,
  });
});

// update advertising
const updateAdvertising = catchAsync(async (req: Request, res: Response) => {
  const advertisingId = req.params.advertisingId;
  const data = req.body;

  // if video is uploaded → upload to cloudinary
  if (req.file) {
    const cloudinaryResponse = await uploadFile.uploadToCloudinary(req.file);
    if (cloudinaryResponse?.secure_url) {
      data.videoUrl = cloudinaryResponse.secure_url;
    }
  }

  const result = await AdvertisingServices.updateAdvertising(
    advertisingId,
    data
  );
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Advertising updated successfully",
    data: result,
  });
});

export const AdvertisingController = {
  createAdvertising,
  getAllAdvertising,
  getSingleAdvertising,
  deleteAdvertising,
  updateAdvertising,
};
