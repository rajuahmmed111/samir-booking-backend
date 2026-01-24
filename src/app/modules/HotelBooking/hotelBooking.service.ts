import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { differenceInDays, parse, startOfDay } from "date-fns";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { IHotelBookingData } from "./hotelBooking.interface";
import { uploadFile } from "../../../helpars/fileUploader";

// create Hotel Booking service
const createHotelRoomBooking = async (
  userId: string,
  hotelId: string,
  data: IHotelBookingData,
) => {
  const { basePrice, bookedFromDate, bookedToDate } = data;

  // find user
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // find hotel
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      id: true,
      basePrice: true,
      partnerId: true,
      weeklyOffers: true,
      monthlyOffers: true,
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
  // console.log(numberOfNights);

  if (numberOfNights <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid booking date range");
  }

  // calculate base price
  let totalPrice = basePrice * numberOfNights;
  // price not 0 or null
  if (!totalPrice || totalPrice === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid hotel base price");
  }

  // apply weekly discount (7 days or more)
  if (numberOfNights >= 7 && numberOfNights < 30 && hotel.weeklyOffers) {
    const weeklyDiscount = (totalPrice * hotel.weeklyOffers) / 100;
    totalPrice -= weeklyDiscount;
  }
  // apply monthly discount (30 days or more)
  else if (numberOfNights >= 30 && hotel.monthlyOffers) {
    const monthlyDiscount = (totalPrice * hotel.monthlyOffers) / 100;
    totalPrice -= monthlyDiscount;
  }

  // check for overlapping bookings
  const overlappingBooking = await prisma.hotel_Booking.findFirst({
    where: {
      hotelId,
      bookingStatus: BookingStatus.CONFIRMED, // ignore cancelled bookings
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
      "This hotel is already booked for the selected dates",
    );
  }

  const result = await prisma.hotel_Booking.create({
    data: {
      totalPrice: Number(totalPrice.toFixed(2)),
      bookedFromDate,
      bookedToDate,
      personOfGuests: data.personOfGuests,
      userId,
      hotelId: hotel?.id,
      partnerId: hotel.partnerId!,
      bookingStatus: BookingStatus.PENDING,
    },
  });

  return result;
};

// get all hotel  bookings
const getAllHotelBookings = async (partnerId: string, filter?: string) => {
  // find partner
  const partner = await prisma.user.findUnique({ where: { id: partnerId } });
  if (!partner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  let whereClause: any = { partnerId };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split("T")[0];

  if (filter === "new-requests") {
    // New Requests: Bookings created today with CONFIRMED status
    whereClause.bookingStatus = BookingStatus.CONFIRMED;
    whereClause.createdAt = {
      gte: today,
    };
  } else if (filter === "ongoing") {
    // Ongoing: All CONFIRMED bookings (regardless of date)
    whereClause.bookingStatus = BookingStatus.CONFIRMED;
  } else if (filter === "completed") {
    // Completed: All COMPLETED bookings
    whereClause.bookingStatus = BookingStatus.COMPLETED;
  }
  // if no filter return all

  const result = await prisma.hotel_Booking.findMany({
    where: whereClause,
    include: {
      hotel: true,
      payment: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return result;
};

// get single hotel booking for owner
const getSingleHotelBookingForOwner = async (partnerId: string) => {
  // find partner
  const partner = await prisma.user.findUnique({ where: { id: partnerId } });
  if (!partner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const result = await prisma.hotel_Booking.findFirst({
    where: { partnerId: partner.id, bookingStatus: BookingStatus.CONFIRMED },
    include: {
      hotel: true,
      payment: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "No bookings found");
  }

  return result;
};

// get single my hotel booking
const getSingleMyHotelBookingForUser = async (userId: string) => {
  // find user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const result = await prisma.hotel_Booking.findFirst({
    where: { userId, bookingStatus: BookingStatus.CONFIRMED },
    include: {
      hotel: true,
      payment: true,
    },
  });

  if (!result) {
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
    include: {
      hotel: true,
      payment: true,
    },
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
      "You are not authorized to update this booking",
    );
  }
  return booking;
};

// create travelers with passport images for booking
const createTravelers = async (
  bookingId: string,
  travelersData: { fullName: string }[],
  passportFiles?: Express.Multer.File[],
) => {
  const booking = await prisma.hotel_Booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  const travelers: any = [];

  for (let i = 0; i < travelersData.length; i++) {
    const traveler = travelersData[i];
    let passportImageUrl: string | undefined;

    // upload passport image if available
    if (passportFiles && passportFiles[i]) {
      const uploaded = await uploadFile.uploadToCloudinary(passportFiles[i]);
      if (uploaded?.secure_url) {
        passportImageUrl = uploaded.secure_url;
      }
    }

    const createdTraveler = await prisma.traveler.create({
      data: {
        fullName: traveler.fullName,
        passportImageUrl: passportImageUrl || "",
        bookingId: bookingId,
      },
    });

    travelers.push(createdTraveler);
  }

  return travelers;
};

export const HotelBookingService = {
  createHotelRoomBooking,
  getAllHotelBookings,
  getSingleHotelBookingForOwner,
  getAllMyHotelBookings,
  getSingleMyHotelBookingForUser,
  getHotelBookingById,
  createTravelers,
};
