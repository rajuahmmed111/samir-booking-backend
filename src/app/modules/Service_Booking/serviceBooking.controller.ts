import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ServiceBookingService } from "./serviceBooking.service";
import { Request, Response } from "express";
import { IServiceFilterRequest } from "./serviceBooking.interface";
import { pick } from "../../../shared/pick";
import { paginationFields } from "../../../constants/pagination";

// create service booking
const createServiceBooking = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const serviceId = req.params.serviceId;
  const result = await ServiceBookingService.createServiceBooking(
    userId,
    serviceId,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service Booking created successfully",
    data: result,
  });
});

// provider accept booking
const acceptBooking = catchAsync(async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const bookingId = req.params.bookingId;

  const result = await ServiceBookingService.acceptBooking(
    providerId,
    bookingId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking accepted",
    data: result,
  });
});

// provider in_progress booking
const inProgressBooking = catchAsync(async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const bookingId = req.params.bookingId;

  const result = await ServiceBookingService.inProgressBooking(
    providerId,
    bookingId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service marked as in-progress",
    data: result,
  });
});

// provider complete service
const completeBooking = catchAsync(async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const bookingId = req.params.bookingId;

  const result = await ServiceBookingService.completeBooking(
    providerId,
    bookingId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service marked as completed",
    data: result,
  });
});

// property owner confirm → CAPTURE payment
const confirmBookingAndReleasePaymentWithCaptureSplit = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const bookingId = req.params.bookingId;
    const paymentId = req.body.paymentId;
    // console.log(paymentId)

    const result =
      await ServiceBookingService.confirmBookingAndReleasePaymentWithCaptureSplit(
        userId,
        bookingId,
        paymentId,
      );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment released to provider",
      data: result,
    });
  },
);

// get all my active and past bookings for a property owner
const getAllServiceActiveAndPastBookings = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const filters = pick(req.query, [
      "searchTerm",
      "bookingStatus",
      "bookingType",
      "date",
    ]);
    const options = pick(req.query, paginationFields);
    const result =
      await ServiceBookingService.getAllServiceActiveAndPastBookings(
        userId,
        filters as IServiceFilterRequest,
        options,
      );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service bookings retrieved successfully",
      data: result,
    });
  },
);

// get single service booking
const getSingleServiceBooking = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const bookingId = req.params.bookingId;
    const result = await ServiceBookingService.getSingleServiceBooking(
      bookingId,
      userId,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service booking retrieved successfully",
      data: result,
    });
  },
);

// get all service bookings for provider by providerId
const getAllServiceBookingsOfProvider = catchAsync(
  async (req: Request, res: Response) => {
    const providerId = req.user?.id;
    const filter = req.query.filter as string;
    const result = await ServiceBookingService.getAllServiceBookingsOfProvider(
      providerId,
      filter,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service bookings retrieved successfully",
      data: result,
    });
  },
);

export const ServiceBookingController = {
  createServiceBooking,
  acceptBooking,
  inProgressBooking,
  completeBooking,
  confirmBookingAndReleasePaymentWithCaptureSplit,
  getAllServiceActiveAndPastBookings,
  getSingleServiceBooking,
  getAllServiceBookingsOfProvider,
};
