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
      offeredService: data.offeredService,
      newOfferedService: data.newOfferedService || [],
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
          // offered_services: true,
        },
      },
    },
  });
  return result;
};

// provider accept booking
const acceptBooking = async (providerId: string, bookingId: string) => {
  // find the booking
  const booking = await prisma.service_booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking || booking.providerId !== providerId) {
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
      data: { isBooked: EveryServiceStatus.ACCEPTED },
    }),
  ]);

  return { updatedBooking, updatedService };
};

// provider in_progress booking
const inProgressBooking = async (providerId: string, bookingId: string) => {
  const booking = await prisma.service_booking.findUnique({
    where: { id: bookingId, providerId },
    include: {
      service: {
        select: {
          id: true,
          isStartedVideo: true,
        },
      },
    },
  });

  if (!booking || booking.providerId !== providerId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Unauthorized");
  }

  // check if video is already started
  if (!booking.service?.isStartedVideo) {
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
      service: {
        select: {
          id: true,
          isStartedVideo: true,
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
      service: {
        select: {
          isStartedVideo: true,
          isEndedVideo: true,
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

  if (!booking.service?.isEndedVideo) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Service end video is required before completing booking",
    );
  }

  // update booking status
  return prisma.service_booking.update({
    where: { id: bookingId },
    data: { bookingStatus: BookingStatus.COMPLETED_BY_PROVIDER },
    select: {
      id: true,
      userId: true,
      providerId: true,
      bookingStatus: true,
      service: {
        select: {
          id: true,
          isStartedVideo: true,
          isEndedVideo: true,
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
};

// // property owner confirm → CAPTURE payment
// const confirmBookingAndReleasePaymentWithCaptureSplit = async (
//   userId: string,
//   bookingId: string,
//   paymentId: string,
// ) => {
//   // find payment
//   const payment = await prisma.payment.findFirst({
//     where: { id: paymentId, userId },
//   });

//   if (!payment || !payment.paymentIntentId || !payment.providerId) {
//     throw new ApiError(httpStatus.BAD_REQUEST, "Invalid payment");
//   }

//   if (payment.status !== PaymentStatus.IN_HOLD) {
//     throw new ApiError(httpStatus.BAD_REQUEST, "Payment not authorized");
//   }

//   // find booking
//   const booking = await prisma.service_booking.findFirst({
//     where: {
//       id: bookingId,
//       userId,
//       bookingStatus: BookingStatus.COMPLETED_BY_PROVIDER,
//     },
//   });

//   if (!booking)
//     throw new ApiError(
//       httpStatus.BAD_REQUEST,
//       "Booking not complete by provider",
//     );

//   if (payment.service_bookingId !== booking.id) {
//     throw new ApiError(
//       httpStatus.BAD_REQUEST,
//       "Payment does not belong to this booking",
//     );
//   }

//   // find service provider
//   const provider = await prisma.user.findUnique({
//     where: { id: payment.providerId },
//   });

//   if (!provider || !provider.stripeAccountId) {
//     throw new ApiError(
//       httpStatus.BAD_REQUEST,
//       "Provider Stripe account not found",
//     );
//   }

//   const totalAmount = Math.round(payment.amount * 100);
//   const adminAmount = Math.round((totalAmount * PLATFORM_PERCENT) / 100);
//   const providerAmount = totalAmount - adminAmount;

//   // capture payment
//   const capturedIntent = await stripe.paymentIntents.capture(
//     payment.paymentIntentId,
//   );

//   // retrieve the payment intent to get charges
//   const paymentIntent = await stripe.paymentIntents.retrieve(
//     payment.paymentIntentId,
//   ) as any;

//   const chargeId =
//     paymentIntent.latest_charge || paymentIntent.charges?.data?.[0]?.id;

//   if (!chargeId) {
//     throw new ApiError(
//       httpStatus.BAD_REQUEST,
//       "Charge not found after capture",
//     );
//   }

//   // transfer 90% to provider
//   await stripe.transfers.create(
//     {
//       amount: providerAmount,
//       currency: payment.currency || "usd",
//       destination: provider.stripeAccountId,
//       source_transaction: chargeId,
//     },
//     {
//       idempotencyKey: `transfer_${payment.id}`,
//     },
//   );

//   // update DB
//   await prisma.payment.update({
//     where: { id: payment.id },
//     data: {
//       status: PaymentStatus.PAID,
//       provider_amount: providerAmount / 100,
//       admin_amount: adminAmount / 100,
//     },
//   });

//   // capture payment if not already captured
//   // const paymentIntent = (await stripe.paymentIntents.retrieve(
//   //   payment.paymentIntentId,
//   // )) as any;

//   // console.log("Payment Intent Status:", paymentIntent.status);
//   // console.log(
//   //   "Payment Intent Charges:",
//   //   paymentIntent.charges?.data?.length || 0,
//   // );

//   // let chargeId: string;

//   // if (paymentIntent.status === "succeeded" && paymentIntent.latest_charge) {
//   //   // payment already captured, use existing charge
//   //   chargeId = paymentIntent.latest_charge;
//   // } else if (paymentIntent.status === "succeeded") {
//   //   // payment succeeded but no latest_charge, retrieve charges directly
//   //   if (!paymentIntent.charges?.data?.length) {
//   //     // if no charges in data array, check if latest_charge exists
//   //     if (paymentIntent.latest_charge) {
//   //       chargeId = paymentIntent.latest_charge;
//   //     } else {
//   //       throw new ApiError(
//   //         httpStatus.BAD_REQUEST,
//   //         "No charge found for succeeded payment",
//   //       );
//   //     }
//   //   } else {
//   //     chargeId = paymentIntent.charges.data[0].id;
//   //   }
//   // } else {
//   //   // capture payment
//   //   await stripe.paymentIntents.capture(payment.paymentIntentId);
//   //   const capturedIntent = (await stripe.paymentIntents.retrieve(
//   //     payment.paymentIntentId,
//   //   )) as any;
//   //   if (!capturedIntent.charges?.data?.length && !capturedIntent.latest_charge)
//   //     throw new ApiError(httpStatus.BAD_REQUEST, "No charge after capture");

//   //   // latest_charge if available, otherwise use charges data
//   //   chargeId =
//   //     capturedIntent.latest_charge || capturedIntent.charges.data[0].id;
//   // }

//   // // check if provider_amount already set to prevent duplicate transfer
//   // if (!payment.provider_amount) {
//   //   // check if original payment had automatic transfer
//   //   if (paymentIntent.transfer_data?.destination) {
//   //     // original payment already transferred full amount to provider
//   //     // just mark as paid without additional transfer
//   //     console.log(
//   //       "Original payment already transferred full amount to provider, skipping transfer.",
//   //     );
//   //   } else {
//   //     // create split transfer for manual capture payments
//   //     await stripe.transfers.create(
//   //       {
//   //         amount: providerAmount,
//   //         currency: payment.currency || "usd",
//   //         destination: provider.stripeAccountId,
//   //         source_transaction: chargeId,
//   //       },
//   //       {
//   //         idempotencyKey: `transfer_${payment.id}`, // safe retry
//   //       },
//   //     );
//   //   }
//   // } else {
//   //   console.log(
//   //     "Provider amount already transferred, skipping duplicate transfer.",
//   //   );
//   // }

//   // await prisma.payment.update({
//   //   where: { id: payment.id },
//   //   data: {
//   //     status: PaymentStatus.PAID,
//   //     provider_amount: providerAmount / 100,
//   //     admin_amount: adminAmount / 100,
//   //   },
//   // });

//   await prisma.service_booking.update({
//     where: { id: booking.id },
//     data: { bookingStatus: BookingStatus.CONFIRMED },
//   });
// };

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

  // filter by booking type (active=CONFIRMED, past=COMPLETED)
  if (bookingType) {
    if (bookingType === "active") {
      andConditions.push({ bookingStatus: BookingStatus.CONFIRMED });
    } else if (bookingType === "past") {
      andConditions.push({ bookingStatus: BookingStatus.COMPLETED });
    }
  } else {
    // default: show both active and past bookings
    andConditions.push({
      bookingStatus: {
        in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
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
            },
          },
          reviews: true,
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
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },
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
          serviceRating: true,
          serviceReviewCount: true,
          offered_services: true,
          coverImage: true,
        },
      },
    },
  });

  const total = await prisma.service_booking.count({ where: whereClause });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

export const ServiceBookingService = {
  createServiceBooking,
  acceptBooking,
  inProgressBooking,
  completeBooking,
  confirmBookingAndReleasePaymentWithCaptureSplit,
  getAllServiceActiveAndPastBookings,
  getSingleServiceBooking,
  getAllServiceBookingsOfProvider,
};
