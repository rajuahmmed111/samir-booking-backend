import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { ReviewService } from "./review.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

// create hotel review
const createHotelReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { roomId, rating, comment } = req.body;

  const result = await ReviewService.createHotelReview(
    userId,
    roomId,
    rating,
    comment
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Review created successfully",
    data: result,
  });
});

// create service review
const createServiceReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { serviceId, rating, comment } = req.body;

  const result = await ReviewService.createServiceReview(
    userId,
    serviceId,
    rating,
    comment
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Review created successfully",
    data: result,
  });
});

export const ReviewController = {
  createHotelReview,
  createServiceReview,
};
