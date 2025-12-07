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

  // find hotel
  const findHotel = await prisma.hotel.findUnique({
    where: { id: data?.hotelId },
  });
  if (!findHotel) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
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

  // validate that the booking date is not in the past
  const bookingDate = new Date(data.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

  if (bookingDate < today) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot book for past dates. Please select a future date."
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
  // console.log("availability", availability);

  // check if the requested time slot is available
  const isTimeSlotAvailable = availability.slots.some(
    (slot: any) =>
      slot.from.replace(/\s+/g, " ").trim() ===
        data.timeSlot.from.replace(/\s+/g, " ").trim() &&
      slot.to.replace(/\s+/g, " ").trim() ===
        data.timeSlot.to.replace(/\s+/g, " ").trim()
  );
  // console.log("isTimeSlotAvailable", isTimeSlotAvailable);
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
      hotelId: findHotel?.id,
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

// get all service active bookings for user
const getAllServiceActiveBookingsOfUser = async (
  userId: string,
  filters: IServiceFilterRequest
) => {
  const { searchTerm, bookingStatus, date } = filters;
  const andConditions = [];

  // filter by userId (user can only see their own bookings)
  andConditions.push({ userId, bookingStatus: BookingStatus.CONFIRMED });

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

// get all service past bookings for user
const getAllServicePastBookingsOfUser = async (
  userId: string,
  filters: IServiceFilterRequest
) => {
  const { searchTerm, bookingStatus, date } = filters;
  const andConditions = [];

  // filter by userId (user can only see their own bookings)
  andConditions.push({
    userId,
    bookingStatus: {
      in: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
    },
  });

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
  const bookingInfo = await prisma.service_booking.findFirst({
    where: {
      id: bookingId,
      userId,
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
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              contactNumber: true,
            },
          },
        },
      },
      payments: true,
    },
  });

  if (!bookingInfo) {
    throw new ApiError(httpStatus.NOT_FOUND, "Service booking not found");
  }

  const hotelId = bookingInfo?.hotelId;
  let hotelInfo = null;
  if (hotelId) {
    hotelInfo = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: {
        guards: true,
      },
    });
  }

  // merge hotelInfo into bookingInfo
  return {
    ...bookingInfo,
    hotelInfo,
  };
};

// get all service bookings for provider by providerId
const getAllServiceBookingsOfProvider = async (
  providerId: string,
  filter?: string
) => {
  // find provider
  const provider = await prisma.user.findUnique({
    where: {
      id: providerId,
    },
  });
  if (!provider) {
    throw new ApiError(httpStatus.NOT_FOUND, "Provider not found");
  }

  let whereClause: any = { providerId };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (filter === "new-requests") {
    // New Requests: CONFIRMED bookings for today or future dates
    whereClause.bookingStatus = BookingStatus.CONFIRMED;
    whereClause.date = {
      gte: today.toISOString().split("T")[0],
    };
  } else if (filter === "ongoing") {
    // Ongoing: CONFIRMED bookings where date is in the past (before today)
    whereClause.bookingStatus = BookingStatus.CONFIRMED;
    whereClause.date = {
      lt: today.toISOString().split("T")[0],
    };
  } else if (filter === "completed") {
    // Completed: COMPLETED bookings
    whereClause.bookingStatus = BookingStatus.COMPLETED;
  }
  // if no filter return all

  const result = await prisma.service_booking.findMany({
    where: whereClause,
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

export const ServiceBookingService = {
  createServiceBooking,
  getAllServiceActiveBookingsOfUser,
  getAllServicePastBookingsOfUser,
  getSingleServiceBooking,
  getAllServiceBookingsOfProvider,
};
