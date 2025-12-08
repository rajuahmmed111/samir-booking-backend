import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { HotelBookingService } from "./hotelBooking.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

// create hotel booking
const createHotelRoomBooking = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const hotelId = req.params.hotelId;
    // const passportFiles = req.files as Express.Multer.File[];

    const result = await HotelBookingService.createHotelRoomBooking(
      userId,
      hotelId,
      req.body,
      // passportFiles
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Hotel Booking created successfully",
      data: result,
    });
  }
);

// get all hotel bookings
const getAllHotelBookings = catchAsync(async (req: Request, res: Response) => {
  const partnerId = req.user?.id;
  const result = await HotelBookingService.getAllHotelBookings(partnerId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotel bookings fetched successfully",
    data: result,
  });
});

// get all my hotel bookings
const getAllMyHotelBookings = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const result = await HotelBookingService.getAllMyHotelBookings(userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My hotel bookings fetched successfully",
      data: result,
    });
  }
);

// get hotel booking by id
const getHotelBookingById = catchAsync(async (req: Request, res: Response) => {
  const partnerId = req.user?.id;
  const bookingId = req.params.bookingId;
  const result = await HotelBookingService.getHotelBookingById(
    partnerId,
    bookingId
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotel booking fetched successfully",
    data: result,
  });
});



// create travelers with passport images
const createTravelers = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.bookingId;
  const travelersData = req.body.travelers || [];
  const passportFiles = req.files as Express.Multer.File[];

  const result = await HotelBookingService.createTravelers(
    bookingId,
    travelersData,
    passportFiles
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Travelers created successfully",
    data: result,
  });
});

export const HotelBookingController = {
  createHotelRoomBooking,
  getAllHotelBookings,
  getAllMyHotelBookings,
  getHotelBookingById,
  createTravelers,
};
