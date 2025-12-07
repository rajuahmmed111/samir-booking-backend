import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { differenceInDays, parse, startOfDay } from "date-fns";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { IHotelBookingData } from "./hotelBooking.interface";

// create Hotel room Booking service
const createHotelRoomBooking = async (
  userId: string,
  hotelId: string,
  data: IHotelBookingData
) => {
  const { basePrice, bookedFromDate, bookedToDate } = data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      id: true,
      basePrice: true,
      partnerId: true,
    },
  });
  if (!hotel) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
  }

  if (!basePrice || !bookedFromDate || !bookedToDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing required fields");
  }

  // calculate number of nights
  const fromDate = parse(bookedFromDate, "yyyy-MM-dd", new Date());
  const toDate = parse(bookedToDate, "yyyy-MM-dd", new Date());
  const today = startOfDay(new Date());

  if (fromDate < today) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Cannot book for past dates");
  }

  const numberOfNights = differenceInDays(toDate, fromDate);

  if (numberOfNights <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid booking date range");
  }

  // calculate base price
  const hotelPrice = hotel.basePrice;
  // price not 0 or null
  if (!hotelPrice || hotelPrice === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid hotel base price");
  }

  // apply discount if available
  // if (hotel.discount && hotel.discount > 0) {
  //   totalPrice -= (totalPrice * hotel.discount) / 100;
  // }

  // check for overlapping bookings
  const overlappingBooking = await prisma.hotel_Booking.findFirst({
    where: {
      hotelId,
      bookingStatus: { not: BookingStatus.CANCELLED }, // ignore cancelled bookings
      OR: [
        {
          bookedFromDate: { lte: bookedToDate },
          bookedToDate: { gte: bookedFromDate },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (overlappingBooking) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This hotel is already booked for the selected dates"
    );
  }

  // create booking
  const result = await prisma.hotel_Booking.create({
    data: {
      ...data,

      totalPrice: Number(totalPrice.toFixed(2)),

      userId,
      hotelId: hotel?.id,
      partnerId: hotel.partnerId!,
      bookingStatus: BookingStatus.PENDING,
    },
  });

  return result;
};

// get all hotel  bookings
const getAllHotelBookings = async (partnerId: string) => {
  // find partner
  const partner = await prisma.user.findUnique({ where: { id: partnerId } });
  if (!partner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const result = await prisma.hotel_Booking.findMany({
    where: { id: partner.id },
  });

  if (result.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, "No bookings found");
  }

  return result;
};

// get all my hotel bookings
const getAllMyHotelBookings = async (userId: string) => {
  // find user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const result = await prisma.hotel_Booking.findMany({
    where: { userId, bookingStatus: BookingStatus.CONFIRMED },
  });

  return result;
};

// get hotel booking by id
const getHotelBookingById = async (partnerId: string, bookingId: string) => {
  const booking = await prisma.hotel_Booking.findUnique({
    where: { id: bookingId, partnerId },
  });
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (booking?.partnerId !== partnerId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not authorized to update this booking"
    );
  }
  return booking;
};

// update booking status
const updateBookingStatus = async (
  partnerId: string,
  bookingId: string,
  bookingStatus: "CONFIRMED" | "CANCELLED"
) => {
  const findPartner = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!findPartner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const booking = await prisma.hotel_Booking.findUnique({
    where: { id: bookingId, partnerId },
    include: {
      hotel: true,
    },
  });
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (booking.partnerId !== partnerId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not authorized to update this booking"
    );
  }

  const updatedBooking = await prisma.hotel_Booking.update({
    where: { id: bookingId },
    data: {
      bookingStatus,
    },
  });

  return updatedBooking;
};

export const HotelBookingService = {
  createHotelRoomBooking,
  getAllHotelBookings,
  getAllMyHotelBookings,
  getHotelBookingById,
  updateBookingStatus,
};
