import {
  BookingStatus,
  EveryServiceStatus,
  PaymentStatus,
  ServiceStatus,
  UserStatus,
} from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import {
  ICreateServiceBooking,
  IServiceFilterRequest,
} from "./serviceBooking.interface";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import stripe from "../../../helpars/stripe";
import { BookingNotificationService } from "../../../shared/notificationService";

// create service booking
const createServiceBooking = async (
  userId: string,
  serviceId: string,
  data: ICreateServiceBooking,
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
      "Service is not available for booking",
    );
  }

  // validate that the booking date is not in the past
  const bookingDate = new Date(data.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

  if (bookingDate < today) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot book for past dates. Please select a future date.",
    );
  }

  // check if the requested date and day is available
  const availability = findService.availability.find(
    (avail: any) => avail.day.toLowerCase() === data.day.toLowerCase(),
  );
  if (!availability) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Service is not available on ${data.day}`,
    );
  }
  // console.log("availability", availability);

  // check if the requested time slot is available
  const isTimeSlotAvailable = availability.slots.some(
    (slot: any) =>
      slot.from.replace(/\s+/g, " ").trim() ===
        data.timeSlot.from.replace(/\s+/g, " ").trim() &&
      slot.to.replace(/\s+/g, " ").trim() ===
        data.timeSlot.to.replace(/\s+/g, " ").trim(),
  );
  // console.log("isTimeSlotAvailable", isTimeSlotAvailable);
  if (!isTimeSlotAvailable) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Requested time slot is not available",
    );
  }

  // check for existing bookings at the same time slot
  const existingBooking = await prisma.service_booking.findFirst({
    where: {
      serviceId,
      date: data.date,
      day: data.day,
      bookingStatus: {
        in: [
          // BookingStatus.PENDING,
          // BookingStatus.NEED_ACCEPT,
          BookingStatus.CONFIRMED,
        ],
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
      offeredService: data.offeredService,
      newOfferedService: data.newOfferedService || [],
      date: data.date,
      day: data.day,
      timeSlot: data.timeSlot,
      totalPrice: data.totalPrice,
      specialInstructions: data.specialInstructions,
      bookingStatus: BookingStatus.NEED_ACCEPT,
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
          // offered_services: true,
        },
      },
    },
  });

  // ------------send notification to service provider------------
  try {
    const notificationData = {
      bookingId: result.id,
      userId: result.userId || undefined, // property owner who booked
      providerId: result.providerId || undefined, // service provider
      serviceTypes: "SERVICE" as any,
      serviceName: result.serviceName,
      totalPrice: result.totalPrice,
      serviceId: result.serviceId || undefined,
    };

    await BookingNotificationService.sendBookingNotifications(notificationData);
  } catch (notificationError) {
    console.error("Create booking notification failed:", notificationError);
    // don't fail booking if notification fails
  }

  return result;
};

// provider accept booking
const acceptBooking = async (providerId: string, bookingId: string) => {
  // find the booking
  const booking = await prisma.service_booking.findFirst({
    where: {
      id: bookingId,
      providerId,
      bookingStatus: BookingStatus.NEED_ACCEPT,
    },
  });

  if (!booking) {
    throw new ApiError(httpStatus.FORBIDDEN, "Unauthorized");
  }

  // update both booking and service inside a transaction
  const [updatedBooking, updatedService] = await prisma.$transaction([
    prisma.service_booking.update({
      where: { id: bookingId },
      data: { bookingStatus: BookingStatus.CONFIRMED },
    }),
    prisma.service.update({
      where: { id: booking.serviceId! },
      data: { isBooked: EveryServiceStatus.BOOKED },
    }),
  ]);

  // ---------send notification to property owner---------
  try {
    const notificationData = {
      bookingId: booking.id,
      userId: booking.userId || undefined, // property owner who booked
      providerId: booking.providerId || undefined, // service provider who accepted
      serviceTypes: "SERVICE" as any,
      serviceName: booking.serviceName,
      totalPrice: booking.totalPrice,
      serviceId: booking.serviceId || undefined,
    };

    await BookingNotificationService.sendBookingAcceptNotification(
      notificationData,
    );
  } catch (notificationError) {
    console.error("Accept notification failed:", notificationError);
    // don't fail the booking if notification fails
  }

  return { updatedBooking, updatedService };
};

// provider in_progress booking
const inProgressBooking = async (providerId: string, bookingId: string) => {
  const booking = await prisma.service_booking.findFirst({
    where: {
      id: bookingId,
      providerId,
      bookingStatus: BookingStatus.CONFIRMED,
    },
    include: {
      startAndEndProofVideos: {
        select: {
          id: true,
          isStartedVideo: true,
        },
      },
      service: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!booking || booking.providerId !== providerId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Unauthorized");
  }

  if (!booking.startAndEndProofVideos?.isStartedVideo) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Service started video is required before in-progress booking",
    );
  }

  // update booking status
  return prisma.service_booking.update({
    where: { id: bookingId },
    data: { bookingStatus: BookingStatus.IN_WORKING },
    select: {
      id: true,
      userId: true,
      providerId: true,
      bookingStatus: true,
      startAndEndProofVideos: {
        select: {
          id: true,
          isStartedVideo: true,
          recordProofVideoStarting: true,
        },
      },
      service: {
        select: {
          id: true,
        },
      },
    },
  });
};

// provider complete booking
const completeBooking = async (providerId: string, bookingId: string) => {
  const booking = await prisma.service_booking.findFirst({
    where: {
      id: bookingId,
      providerId,
      bookingStatus: BookingStatus.IN_WORKING,
    },
    include: {
      startAndEndProofVideos: {
        select: {
          id: true,
          isStartedVideo: true,
          isEndedVideo: true,
        },
      },
      service: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!booking) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Booking is not in working state",
    );
  }

  if (booking.providerId !== providerId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Unauthorized");
  }

  const hasEndedVideo = booking.startAndEndProofVideos?.isEndedVideo;
  if (!hasEndedVideo) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Service end video is required before completing booking",
    );
  }

  // update booking status
  const result = await prisma.service_booking.update({
    where: { id: bookingId },
    data: { bookingStatus: BookingStatus.COMPLETED_BY_PROVIDER },
    select: {
      id: true,
      userId: true,
      serviceId: true,
      providerId: true,
      bookingStatus: true,
      startAndEndProofVideos: {
        select: {
          id: true,
          recordProofVideoStarting: true,
          isStartedVideo: true,
          recordProofVideoEnding: true,
          isEndedVideo: true,
        },
      },
      service: {
        select: {
          id: true,
          serviceName: true,
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
        },
      },
    },
  });

  // --------- send notification to service provider ---------
  try {
    const notificationData = {
      bookingId: result.id,
      userId: result.userId || undefined, // property owner who confirmed
      providerId: result.providerId || undefined, // service provider
      serviceTypes: "SERVICE" as any,
      serviceName: result.service?.serviceName || "",
      totalPrice: result.payments[0]?.amount || 0,
      serviceId: result.serviceId || undefined,
    };

    await BookingNotificationService.sendBookingCompleteNotification(
      notificationData,
    );
  } catch (notificationError) {
    console.error("Complete booking notification failed:", notificationError);
    // don't fail booking if notification fails
  }

  return result;
};

// provider reject booking
// const rejectBooking = async (userId: string, bookingId: string) => {
//   // find booking
//   const booking = await prisma.service_booking.findFirst({
//     where: { id: bookingId, providerId: userId },
//   });

//   if (!booking) {
//     throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
//   }

//   if (booking.bookingStatus !== BookingStatus.NEED_ACCEPT) {
//     throw new ApiError(
//       httpStatus.BAD_REQUEST,
//       "Only confirmed bookings can be rejected",
//     );
//   }

//   // find payment
//   const payment = await prisma.payment.findFirst({
//     where: { service_bookingId: bookingId },
//   });

//   if (!payment) {
//     throw new ApiError(httpStatus.BAD_REQUEST, "Payment not found");
//   }

//   // refund payment to property owner
//   if (payment.paymentIntentId) {
//     try {
//       // For manual capture payments, cancel the payment intent instead of refunding
//       await stripe.paymentIntents.cancel(payment.paymentIntentId);
//     } catch (error) {
//       console.error("Payment intent cancellation failed:", error);
//       throw new ApiError(httpStatus.BAD_REQUEST, "Failed to cancel payment");
//     }
//   }

//   // update booking status
//   await prisma.service_booking.update({
//     where: { id: bookingId },
//     data: { bookingStatus: BookingStatus.REJECTED },
//   });

//   // update payment status
//   await prisma.payment.update({
//     where: { id: payment.id },
//     data: { status: PaymentStatus.REFUNDED },
//   });

//   return { message: "Booking rejected successfully" };
// };
// provider reject booking
const rejectBooking = async (providerId: string, bookingId: string) => {
  // find booking
  const booking = await prisma.service_booking.findFirst({
    where: { id: bookingId, providerId },
  });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (booking.bookingStatus !== BookingStatus.NEED_ACCEPT) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Only confirmed bookings can be rejected by provider",
    );
  }

  // update both booking and service inside a transaction
  const [updatedBooking, updatedService] = await prisma.$transaction([
    prisma.service_booking.update({
      where: { id: bookingId },
      data: { bookingStatus: BookingStatus.REJECTED },
    }),
    prisma.service.update({
      where: { id: booking.serviceId! },
      data: { isBooked: EveryServiceStatus.AVAILABLE },
    }),
  ]);

  // send notification to property owner
  try {
    const notificationData = {
      bookingId: booking.id,
      userId: booking.userId || undefined, // property owner who made booking
      providerId: booking.providerId || undefined, // service provider who rejected
      serviceTypes: "SERVICE" as any,
      serviceName: booking.serviceName,
      totalPrice: booking.totalPrice,
      serviceId: booking.serviceId || undefined,
    };

    await BookingNotificationService.sendRejectBookingNotification(
      notificationData,
    );
  } catch (notificationError) {
    console.error("Reject booking notification failed:", notificationError);
    // don't fail booking if notification fails
  }

  return { updatedBooking, updatedService };
};

// cancel booking from property owner
const cancelBookingByPropertyOwner = async (
  userId: string,
  bookingId: string,
) => {
  // find booking
  const booking = await prisma.service_booking.findFirst({
    where: { id: bookingId, userId },
  });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (booking.bookingStatus !== BookingStatus.CONFIRMED) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Only confirmed bookings can be cancelled by property owner",
    );
  }

  // update both booking and service inside a transaction
  const [updatedBooking, updatedService] = await prisma.$transaction([
    prisma.service_booking.update({
      where: { id: bookingId },
      data: { bookingStatus: BookingStatus.REJECTED },
    }),
    prisma.service.update({
      where: { id: booking.serviceId! },
      data: { isBooked: EveryServiceStatus.AVAILABLE },
    }),
  ]);

  // send notification to service provider
  try {
    const notificationData: any = {
      bookingId: booking.id,
      userId: booking.userId, // property owner who cancelled
      providerId: booking.providerId, // service provider who receives notification
      serviceTypes: "SERVICE" as any,
      serviceName: booking.serviceName,
      totalPrice: booking.totalPrice,
      serviceId: booking.serviceId,
    };

    await BookingNotificationService.sendCancelBookingByPropertyOwnerNotification(
      notificationData,
    );
  } catch (notificationError) {
    console.error("Cancel booking notification failed:", notificationError);
    // don't fail booking if notification fails
  }

  return { updatedBooking, updatedService };
};

const PLATFORM_PERCENT = 10;
// property owner confirm → CAPTURE payment
const confirmBookingAndReleasePaymentWithCaptureSplit = async (
  userId: string,
  bookingId: string,
  paymentId: string,
) => {
  // find payment
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId },
  });

  if (!payment || !payment.paymentIntentId || !payment.providerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid payment");
  }

  if (payment.status !== PaymentStatus.IN_HOLD) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Payment not in hold state");
  }

  // find booking
  const booking = await prisma.service_booking.findFirst({
    where: {
      id: bookingId,
      userId,
      bookingStatus: BookingStatus.COMPLETED_BY_PROVIDER,
    },
  });

  if (!booking) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Booking not completed by provider",
    );
  }

  if (payment.service_bookingId !== booking.id) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Payment does not belong to this booking",
    );
  }

  // find provider
  const provider = await prisma.user.findUnique({
    where: { id: payment.providerId },
  });

  if (!provider || !provider.stripeAccountId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Provider Stripe account not found",
    );
  }

  const totalAmount = Math.round(payment.amount * 100);
  const adminAmount = Math.round((totalAmount * PLATFORM_PERCENT) / 100);
  const providerAmount = totalAmount - adminAmount;

  // CAPTURE payment (returns updated intent)
  const capturedIntent = await stripe.paymentIntents.capture(
    payment.paymentIntentId,
    {
      idempotencyKey: `capture_${payment.id}`,
    },
  );

  const chargeId = capturedIntent.latest_charge as string | null;

  if (!chargeId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Charge not found after capture",
    );
  }

  // transfer provider share
  await stripe.transfers.create(
    {
      amount: providerAmount,
      currency: payment.currency || "usd",
      destination: provider.stripeAccountId,
      source_transaction: chargeId,
    },
    {
      idempotencyKey: `transfer_${payment.id}_${capturedIntent.latest_charge}`,
    },
  );

  // update payment
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.PAID,
      provider_amount: providerAmount / 100,
      admin_amount: adminAmount / 100,
    },
  });

  // final booking status
  await prisma.service_booking.update({
    where: { id: booking.id },
    data: {
      bookingStatus: BookingStatus.COMPLETED,
    },
  });

  // send notification to service provider
  try {
    const notificationData = {
      bookingId: booking.id,
      userId: booking.userId || undefined, // property owner who confirmed
      providerId: booking.providerId || undefined, // service provider
      serviceTypes: "SERVICE" as any,
      serviceName: booking.serviceName,
      totalPrice: payment.amount,
      serviceId: booking.serviceId || undefined,
    };

    await BookingNotificationService.sendConfirmBookingAndReleasePaymentWithCaptureSplit(
      notificationData,
    );
  } catch (notificationError) {
    console.error("Confirm booking notification failed:", notificationError);
    // don't fail booking if notification fails
  }
};

// get all my active and past bookings for a property owner
const getAllServiceActiveAndPastBookings = async (
  userId: string,
  filters: IServiceFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, bookingStatus, bookingType, date } = filters;
  const andConditions = [];

  // filter by userId (user can only see their own bookings)
  andConditions.push({ userId });

  // filter by booking type (active=CONFIRMED, IN_WORKING, COMPLETED_BY_PROVIDER, past=COMPLETED)
  if (bookingType) {
    if (bookingType === "active") {
      andConditions.push({
        bookingStatus: {
          in: [
            BookingStatus.NEED_ACCEPT,
            BookingStatus.CONFIRMED,
            BookingStatus.IN_WORKING,
            BookingStatus.COMPLETED_BY_PROVIDER,
          ],
        },
      });
    } else if (bookingType === "past") {
      andConditions.push({ bookingStatus: BookingStatus.COMPLETED });
    }
  } else {
    // default: show both active and past bookings
    andConditions.push({
      bookingStatus: {
        in: [
          BookingStatus.CONFIRMED,
          BookingStatus.IN_WORKING,
          BookingStatus.COMPLETED_BY_PROVIDER,
          BookingStatus.COMPLETED,
        ],
      },
    });
  }

  // filter by specific booking status
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

  const where = {
    AND: andConditions,
  };

  const result = await prisma.service_booking.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },
    include: {
      startAndEndProofVideos: {
        select: {
          id: true,
          recordProofVideoStarting: true,
          recordProofVideoEnding: true,
        },
      },
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
          serviceRating: true,
          user: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

  const total = await prisma.service_booking.count({ where });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

// get single service booking
const getSingleServiceBooking = async (bookingId: string, userId: string) => {
  const bookingInfo = await prisma.service_booking.findFirst({
    where: {
      id: bookingId,
      // userId,
    },
    include: {
      startAndEndProofVideos: {
        select: {
          id: true,
          recordProofVideoStarting: true,
          recordProofVideoEnding: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          contactNumber: true,
          profileImage: true,
          role: true,
          address: true,
          country: true,
        },
      },
      service: {
        select: {
          id: true,
          serviceName: true,
          serviceType: true,
          address: true,
          experience: true,
          description: true,
          offered_services: true,
          serviceRating: true,
          serviceReviewCount: true,
          coverImage: true,
          providerId: true,

          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              contactNumber: true,
              profileImage: true,
              role: true,
              address: true,
              country: true,
            },
          },
          reviews: true,
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
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
      select: {
        id: true,
        propertyTitle: true,
        propertyAddress: true,
        propertyDescription: true,
        hotelRating: true,
        hotelReviewCount: true,
        uploadPhotosOrVideos: true,
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
  filter?: string,
  options: IPaginationOptions = {},
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

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

  if (filter === "new-requests") {
    // New Requests: NEED_ACCEPT bookings
    whereClause.bookingStatus = BookingStatus.NEED_ACCEPT;
  } else if (filter === "accepted") {
    // Confirmed: CONFIRMED bookings
    whereClause.bookingStatus = BookingStatus.CONFIRMED;
  } else if (filter === "ongoing") {
    // Ongoing: IN_WORKING bookings
    whereClause.bookingStatus = {
      in: [BookingStatus.IN_WORKING, BookingStatus.COMPLETED_BY_PROVIDER],
    };
  } else if (filter === "completed") {
    // Completed: COMPLETED bookings
    whereClause.bookingStatus = BookingStatus.COMPLETED;
  }
  // if no filter return all

  const result = await prisma.service_booking.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },
    include: {
      startAndEndProofVideos: {
        select: {
          id: true,
          recordProofVideoStarting: true,
          recordProofVideoEnding: true,
        },
      },
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
          serviceRating: true,
          serviceReviewCount: true,
          offered_services: true,
          coverImage: true,
        },
      },
    },
  });

  // get inventory items for each booking using hotelId
  const bookingsWithInventory = await Promise.all(
    result.map(async (booking) => {
      let inventoryItems: any[] = [];

      if (booking.hotelId) {
        inventoryItems = await prisma.inventoryItem.findMany({
          where: { hotelId: booking.hotelId },
          select: {
            id: true,
            name: true,
            quantity: true,
            missingQuantity: true,
            description: true,
          },
        });
      }

      return {
        ...booking,
        inventoryItems,
      };
    }),
  );

  const total = await prisma.service_booking.count({ where: whereClause });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: bookingsWithInventory,
  };
};

export const ServiceBookingService = {
  createServiceBooking,
  acceptBooking,
  inProgressBooking,
  completeBooking,
  rejectBooking,
  cancelBookingByPropertyOwner,
  confirmBookingAndReleasePaymentWithCaptureSplit,
  getAllServiceActiveAndPastBookings,
  getSingleServiceBooking,
  getAllServiceBookingsOfProvider,
};
