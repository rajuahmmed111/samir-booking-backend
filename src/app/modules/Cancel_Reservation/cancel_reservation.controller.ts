import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { CancelReservationService } from "./cancel_reservation.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

// create or update cancel reservation
const createOrUpdateCancelReservation = catchAsync(
  async (req: Request, res: Response) => {
    const { description } = req.body;
    const result =
      await CancelReservationService.createOrUpdateCancelReservation(
        description
      );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Cancel reservation created successfully",
      data: result,
    });
  }
);

// get all cancel reservation
const getAllCancelReservation = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CancelReservationService.getAllCancelReservation();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Cancel reservation retrieved successfully",
      data: result,
    });
  }
);

export const CancelReservationController = {
  createOrUpdateCancelReservation,
  getAllCancelReservation,
};
