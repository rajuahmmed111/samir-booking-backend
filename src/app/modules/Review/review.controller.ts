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

// get all reviews
const getAllReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getAllReviews();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reviews fetched successfully",
    data: result,
  });
});

// get all hotel reviews by hotel id
const getAllHotelReviewsByHotelId = catchAsync(
  async (req: Request, res: Response) => {
    const hotelId = req.params.hotelId;
    const result = await ReviewService.getAllHotelReviewsByHotelId(hotelId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Reviews fetched successfully",
      data: result,
    });
  }
);

export const ReviewController = {
  createHotelReview,
  getAllReviews,
  getAllHotelReviewsByHotelId,
};
