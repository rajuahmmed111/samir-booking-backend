import { BookingStatus, ServiceStatus, UserStatus } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import {
  ICreateServiceBooking,
  IUpdateServiceBooking,
  IServiceFilterRequest,
} from "./serviceBooking.interface";

// create service booking
const createServiceBooking = async (
  userId: string,
  serviceId: string,
  data: ICreateServiceBooking
) => {
  // find user
  const findUser = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });
  if (!findUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // find service
  const findService = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      availability: {
        include: {
          slots: true,
        },
      },
    },
  });
  if (!findService) {
    throw new ApiError(httpStatus.NOT_FOUND, "Service not found");
  }

  if (findService.serviceStatus !== ServiceStatus.ACTIVE) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Service is not available for booking"
    );
  }

  // check if the requested date and day is available
  const availability = findService.availability.find(
    (avail: any) => avail.day.toLowerCase() === data.day.toLowerCase()
  );
  if (!availability) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Service is not available on ${data.day}`
    );
  }

  // check if the requested time slot is available
  const isTimeSlotAvailable = availability.slots.some(
    (slot: any) =>
      slot.from === data.timeSlot.from && slot.to === data.timeSlot.to
  );
  if (!isTimeSlotAvailable) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Requested time slot is not available"
    );
  }

  // check for existing bookings at the same time slot
  const existingBooking = await prisma.service_booking.findFirst({
    where: {
      serviceId,
      date: data.date,
      day: data.day,
      bookingStatus: {
        in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      },
    },
  });
  if (existingBooking) {
    throw new ApiError(httpStatus.CONFLICT, "This time slot is already booked");
  }

  const result = await prisma.service_booking.create({
    data: {
      userId,
      serviceId,
      providerId: findService.providerId,
      property: data.property,
      serviceName: data.serviceName,
      date: data.date,
      day: data.day,
      timeSlot: data.timeSlot,
      totalPrice: data.totalPrice,
      specialInstructions: data.specialInstructions,
      bookingStatus: BookingStatus.PENDING,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      service: {
        select: {
          id: true,
          serviceName: true,
          serviceType: true,
          price: true,
        },
      },
    },
  });
  return result;
};

// get all service bookings (for a user or provider)
const getAllServiceBookings = async (
  userId: string,
  filters: IServiceFilterRequest
) => {
  const { searchTerm, bookingStatus, date } = filters;
  const andConditions = [];

  // filter by userId (user can only see their own bookings)
  andConditions.push({ userId });

  // filter by booking status
  if (bookingStatus) {
    andConditions.push({ bookingStatus });
  }

  // filter by date
  if (date) {
    andConditions.push({ date });
  }

  // search by property name or service name
  if (searchTerm) {
    andConditions.push({
      OR: [
        { property: { contains: searchTerm } },
        { serviceName: { contains: searchTerm } },
      ],
    });
  }

  const whereCondition = {
    AND: andConditions,
  };

  const result = await prisma.service_booking.findMany({
    where: whereCondition,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      service: {
        select: {
          id: true,
          serviceName: true,
          serviceType: true,
          price: true,
          coverImage: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return result;
};

// get single service booking
const getSingleServiceBooking = async (bookingId: string, userId: string) => {
  const result = await prisma.service_booking.findFirst({
    where: {
      id: bookingId,
      userId, // ensure user can only access their own bookings
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      service: {
        select: {
          id: true,
          serviceName: true,
          serviceType: true,
          description: true,
          price: true,
          coverImage: true,
          providerId: true,
        },
      },
      payments: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Service booking not found");
  }

  return result;
};

// update service booking
const updateServiceBooking = async (
  bookingId: string,
  userId: string,
  data: IUpdateServiceBooking
) => {
  // check if booking exists and belongs to user
  const existingBooking = await prisma.service_booking.findFirst({
    where: {
      id: bookingId,
      userId,
    },
  });

  if (!existingBooking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Service booking not found");
  }

  // prevent status updates for confirmed/completed bookings
  if (
    existingBooking.bookingStatus === BookingStatus.CONFIRMED &&
    data.bookingStatus &&
    data.bookingStatus !== BookingStatus.CONFIRMED
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot modify confirmed booking"
    );
  }

  if (existingBooking.bookingStatus === BookingStatus.COMPLETED) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot modify completed booking"
    );
  }

  const result = await prisma.service_booking.update({
    where: { id: bookingId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      service: {
        select: {
          id: true,
          serviceName: true,
          serviceType: true,
          price: true,
        },
      },
    },
  });

  return result;
};

export const ServiceBookingService = {
  createServiceBooking,
  getAllServiceBookings,
  getSingleServiceBooking,
  updateServiceBooking,
};
