import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { RecordProofVideoService } from "./recordProofVideo.service";
import { Request, Response } from "express";

// create record proof video starting
const createRecordProofVideoStarting = catchAsync(
  async (req: Request, res: Response) => {
    const files = req.files;
    const bookingId = req.params.bookingId;
    const userId = req.user?.id;

    const videoStartingFiles = !Array.isArray(files)
      ? files?.recordProofVideoStarting || []
      : [];

    const result = await RecordProofVideoService.createRecordProofVideoStarting(
      bookingId,
      userId,
      videoStartingFiles,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Record proof video starting created successfully",
      data: result,
    });
  },
);

// update record proof video ending
const updateRecordProofVideoEnding = catchAsync(
  async (req: Request, res: Response) => {
    const files = req.files;
    const bookingId = req.params.bookingId;
    const userId = req.user?.id;

    const videoEndingFiles = !Array.isArray(files)
      ? files?.recordProofVideoEnding || []
      : [];

    const result = await RecordProofVideoService.updateRecordProofVideoEnding(
      bookingId,
      userId,
      videoEndingFiles,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Record proof video ending updated successfully",
      data: result,
    });
  },
);

export const RecordProofVideoController = {
  createRecordProofVideoStarting,
  updateRecordProofVideoEnding,
};
