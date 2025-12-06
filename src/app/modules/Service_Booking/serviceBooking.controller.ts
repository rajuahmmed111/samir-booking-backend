import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ServiceBookingService } from "./serviceBooking.service";
import { Request, Response } from "express";
import { IServiceFilterRequest } from "./serviceBooking.interface";
import { pick } from "../../../shared/pick";

// create service booking
const createServiceBooking = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const serviceId = req.params.serviceId;
  const result = await ServiceBookingService.createServiceBooking(
    userId,
    serviceId,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service Booking created successfully",
    data: result,
  });
});

// get all service active bookings for a user
const getAllServiceActiveBookingsOfUser = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const filters = pick(req.query, ["searchTerm", "bookingStatus", "date"]);
    const result =
      await ServiceBookingService.getAllServiceActiveBookingsOfUser(
        userId,
        filters as IServiceFilterRequest
      );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service bookings retrieved successfully",
      data: result,
    });
  }
);

// get all service past bookings for a user
const getAllServicePastBookingsOfUser = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const filters = pick(req.query, ["searchTerm", "bookingStatus", "date"]);
    const result = await ServiceBookingService.getAllServicePastBookingsOfUser(
      userId,
      filters as IServiceFilterRequest
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service bookings retrieved successfully",
      data: result,
    });
  }
);

// get single service booking
const getSingleServiceBooking = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const bookingId = req.params.bookingId;
    const result = await ServiceBookingService.getSingleServiceBooking(
      bookingId,
      userId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service booking retrieved successfully",
      data: result,
    });
  }
);

// update service booking
const updateServiceBooking = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const bookingId = req.params.bookingId;
  const result = await ServiceBookingService.updateServiceBooking(
    bookingId,
    userId,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service booking updated successfully",
    data: result,
  });
});

export const ServiceBookingController = {
  createServiceBooking,
  getAllServiceActiveBookingsOfUser,
  getAllServicePastBookingsOfUser,
  getSingleServiceBooking,
  updateServiceBooking,
};
