import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { differenceInDays, parse, startOfDay } from "date-fns";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import {
  IBookingFilterRequest,
  IHotelBookingData,
} from "./hotelBooking.interface";

// create Hotel room Booking service
const createHotelRoomBooking = async (
  userId: string,
  roomId: string,
  data: IHotelBookingData
) => {
  const {
    name,
    email,
    phone,
    address,
    convertedPrice,
    displayCurrency,
    discountedPrice,
    rooms,
    adults,
    children,
    bookedFromDate,
    bookedToDate,
  } = data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const hotel = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      hotelRoomPriceNight: true,
      partnerId: true,
      hotelId: true,
      discount: true,
      category: true,
      hotelNumAdults: true,
      hotelNumChildren: true,
      hotelNumberOfRooms: true,
      hotel: {
        select: {
          id: true,
          hotelName: true,
        },
      }, // Hotel name for notification
    },
  });
  if (!hotel) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
  }

  // validate room availability
  // if (rooms > hotel.hotelNumberOfRooms) {
  //   throw new ApiError(
  //     httpStatus.BAD_REQUEST,
  //     `Only ${hotel.hotelNumberOfRooms} rooms available`
  //   );
  // }

  if (adults > hotel.hotelNumAdults) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Maximum ${hotel.hotelNumAdults} adults allowed in this room`
    );
  }

  if (children > hotel.hotelNumChildren) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Maximum ${hotel.hotelNumChildren} children allowed in this room`
    );
  }

  if (
    convertedPrice == null ||
    displayCurrency == null ||
    rooms == null ||
    adults == null ||
    children == null ||
    !bookedFromDate ||
    !bookedToDate
  ) {
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
  // const roomPrice = hotel.hotelRoomPriceNight;
  // price not 0 or null
  if (!convertedPrice || convertedPrice <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid room price");
  }

  let totalPrice = convertedPrice * rooms * numberOfNights;

  // apply discount if available
  // if (hotel.discount && hotel.discount > 0) {
  //   totalPrice -= (totalPrice * hotel.discount) / 100;
  // }

  // apply discount if available
  if (discountedPrice && discountedPrice > 0) {
    totalPrice -= (totalPrice * discountedPrice) / 100;
  }

  // check for overlapping bookings
  const overlappingBooking = await prisma.hotel_Booking.findFirst({
    where: {
      roomId,
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
      name,
      email,
      phone,
      address,
      totalPrice: Number(totalPrice.toFixed(2)),
      convertedPrice,
      displayCurrency,
      discountedPrice: discountedPrice ?? 0,
      roomId,
      userId,
      hotelId: hotel.hotelId!,
      partnerId: hotel.partnerId!,
      bookingStatus: BookingStatus.PENDING,
      category: hotel.category as string,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      totalPrice: true,
      convertedPrice: true,
      displayCurrency: true,
      discountedPrice: true,
      rooms: true,
      adults: true,
      children: true,
      bookedFromDate: true,
      bookedToDate: true,
      userId: true,
      roomId: true,
      hotelId: true,
      partnerId: true,
      bookingStatus: true,
      category: true,
    },
  });

  return result;
};

// get all hotel room bookings
const getAllHotelBookings = async (partnerId: string) => {
  // find partner
  const partner = await prisma.user.findUnique({ where: { id: partnerId } });
  if (!partner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const result = await prisma.hotel_Booking.findMany({
    where: { id: partner.id },
    include: {
      room: {
        select: {
          id: true,
          hotelRoomType: true,
          hotelRoomCapacity: true,
          hotelRoomPriceNight: true,
          hotelRoomImages: true,
          hotelRating: true,
          discount: true,
          category: true,
          partnerId: true,
        },
      },
      hotel: {
        select: {
          id: true,
          hotelName: true,
          partnerId: true,
          hotelCity: true,
          hotelCountry: true,
        },
      },
      payment: {
        where: { status: PaymentStatus.PAID },
        select: {
          id: true,
          provider: true,
          status: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          contactNumber: true,
        },
      },
    },
  });

  if (result.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, "No bookings found");
  }

  return result;
};

// get all my hotel room bookings
const getAllMyHotelBookings = async (userId: string) => {
  // find user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const result = await prisma.hotel_Booking.findMany({
    where: { userId, bookingStatus: BookingStatus.CONFIRMED },
    include: {
      room: {
        select: {
          id: true,
          hotelRoomType: true,
          hotelRoomCapacity: true,
          hotelRoomPriceNight: true,
          hotelRoomImages: true,
          hotelRating: true,
          discount: true,
          category: true,
          partnerId: true,
        },
      },
      hotel: {
        select: {
          id: true,
          hotelName: true,
          partnerId: true,
          hotelCity: true,
          hotelCountry: true,
          businessLogo: true,
        },
      },
      payment: {
        where: { status: PaymentStatus.PAID },
        select: {
          id: true,
          provider: true,
          status: true,
          amount: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          contactNumber: true,
        },
      },
    },
  });

  return result;
};

// get hotel room booking by id
const getHotelBookingById = async (partnerId: string, bookingId: string) => {
  const booking = await prisma.hotel_Booking.findUnique({
    where: { id: bookingId, partnerId },
    include: {
      room: {
        select: {
          id: true,
          hotelRoomPriceNight: true,
          discount: true,
          category: true,
          partnerId: true,
        },
      },
      hotel: {
        select: {
          id: true,
          hotelName: true,
          partnerId: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          contactNumber: true,
        },
      },
    },
  });
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (booking.hotel?.partnerId !== partnerId) {
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
