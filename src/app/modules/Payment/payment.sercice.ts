import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import stripe from "../../../helpars/stripe";
import {
  BookingStatus,
  EveryServiceStatus,
  PaymentStatus,
} from "@prisma/client";
import config from "../../../config";
import Stripe from "stripe";
import { ServiceType } from "./Stripe/stripe";

// service configuration for different booking types
const serviceConfig = {
  SERVICE: {
    bookingModel: prisma.service_booking,
    serviceModel: prisma.service,
    serviceTypeField: "serviceId",
    bookingToServiceField: "serviceId",
    nameField: "serviceName",
  },
  HOTEL: {
    bookingModel: prisma.hotel_Booking,
    serviceModel: prisma.hotel,
    serviceTypeField: "hotelId",
    bookingToServiceField: "hotelId",
    nameField: "propertyName",
  },
} as const;

import {
  BookingNotificationService,
  IBookingNotificationData,
  ServiceTypes,
} from "../../../shared/notificationService";
import emailSender from "../../../helpars/emailSender";

// --------------------------- Stripe ---------------------------
// stripe account onboarding
const stripeAccountOnboarding = async (userId: string) => {
  // find user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // if user already has stripe account
  if (user.stripeAccountId) {
    const account = await stripe.accounts.retrieve(user.stripeAccountId);

    const cardPayments = account.capabilities?.card_payments;
    const transfers = account.capabilities?.transfers;
    const requirements = account.requirements?.currently_due || [];

    // if verified
    if (cardPayments === "active" && transfers === "active") {
      // update DB to mark as connected
      await prisma.user.update({
        where: { id: user.id },
        data: { isStripeConnected: true },
      });

      return {
        status: "verified",
        message: "Stripe account verified successfully.",
        capabilities: account.capabilities,
      };
    }

    // if not verified → generate onboarding link
    const accountLinks = await stripe.accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: `${config.stripe.refreshUrl}?accountId=${user.stripeAccountId}`,
      return_url: `${config.stripe.returnUrl}?accountId=${user.stripeAccountId}`,
      type: "account_onboarding",
    });

    // update DB to store stripeAccountId & mark connected
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeAccountId: user.stripeAccountId,
        isStripeConnected: true,
      },
    });

    return {
      status: requirements.length > 0 ? "requirements_due" : "pending",
      message:
        requirements.length > 0
          ? "Additional information required for Stripe verification."
          : "Your Stripe account verification is under review.",
      requirements,
      onboardingLink: accountLinks.url,
    };
  }

  // if user has no stripe account → create new account
  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    email: user?.email,
    business_type: "individual",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    settings: {
      payouts: {
        schedule: {
          delay_days: 2, // minimum allowed
        },
      },
    },
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${config.stripe.refreshUrl}?accountId=${account.id}`,
    return_url: `${config.stripe.returnUrl}?accountId=${account.id}`,
    type: "account_onboarding",
  });

  // update DB with stripeAccountId & mark connected
  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeAccountId: account.id,
      isStripeConnected: true,
    },
  });

  return {
    status: "pending",
    message: "Your Stripe account verification is under review.",
    capabilities: account.capabilities,
    onboardingLink: accountLink.url,
  };
};

// checkout session on stripe for hotel
const createStripeCheckoutSessionForHotel = async (
  userId: string,
  bookingId: string,
  description: string,
) => {
  // find user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

  // find booking
  const booking = await prisma.hotel_Booking.findUnique({
    where: { id: bookingId, userId: userId },
  });

  if (!booking) throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");

  // find provider
  const provider = await prisma.user.findUnique({
    where: { id: booking.partnerId || "" },
  });

  if (!provider || !provider.stripeAccountId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Property Owner not onboarded with Stripe",
    );
  }

  // amount (convert USD → cents)
  const amount = Math.round(booking.totalPrice * 100);

  // create Stripe checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Hotel Booking",
            description: description || "Service payment",
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    // success_url: config.stripe.checkout_success_url,
    success_url: `${config.stripe}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: config.stripe.checkout_cancel_url,
    // full amount goes to property owner
    payment_intent_data: {
      transfer_data: {
        destination: provider.stripeAccountId, // property owner gets full amount
      },
      description,
    },
    metadata: {
      userId,
      bookingId,
      // partnerId: provider.id,
    },
  });

  // retrieve payment intent from session
  let paymentIntentId = checkoutSession.payment_intent as string;

  // fallback: if payment_intent is null, we'll update it later in the webhook
  if (!paymentIntentId) {
    console.warn(
      "Payment intent not available at session creation, will be updated in webhook",
    );
  }

  // update DB with checkoutSessionId
  await prisma.hotel_Booking.update({
    where: { id: bookingId },
    data: {
      checkoutSessionId: checkoutSession.id,
    },
  });

  // create payment record
  await prisma.payment.create({
    data: {
      amount: booking.totalPrice,
      description,
      currency: "usd",
      sessionId: checkoutSession.id,
      paymentIntentId: paymentIntentId,
      status: PaymentStatus.UNPAID,
      provider: "STRIPE",
      serviceType: "HOTEL",
      partnerId: provider?.id,
      userId,
      hotel_bookingId: booking?.id,
      hotelId: booking?.hotelId,
    },
  });

  return {
    id: checkoutSession.id,
    url: checkoutSession.url,
  };
};

// checkout session on stripe for service
const createStripeCheckoutSessionForService = async (
  userId: string,
  bookingId: string,
  description: string,
) => {
  // find user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

  // find booking
  const booking = await prisma.service_booking.findUnique({
    where: { id: bookingId, userId: userId },
  });

  if (!booking) throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");

  // find provider
  const provider = await prisma.user.findUnique({
    where: { id: booking.providerId || "" },
  });

  if (!provider || !provider.stripeAccountId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Provider not onboarded with Stripe",
    );
  }

  // amount (convert USD → cents)
  const amount = Math.round(booking.totalPrice * 100);

  // create Stripe checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: booking.serviceName,
            description: description || "Service payment",
          },
          unit_amount: amount, // total amount
        },
        quantity: 1,
      },
    ],
    mode: "payment",

    success_url: config.stripe.checkout_success_url,
    cancel_url: config.stripe.checkout_cancel_url,

    // full amount goes to provider
    // payment_intent_data: {
    //   capture_method: "manual", // hold in platform account
    //   transfer_data: {
    //     destination: provider.stripeAccountId, // provider gets full amount
    //   },
    //   description,
    // },

    // for hold and release later with split payment
    payment_intent_data: {
      capture_method: "manual", // hold in platform account
      description,
    },

    metadata: {
      bookingId: booking.id,
      userId,
      providerId: provider.id,
      serviceName: booking.serviceName,
    },
  });

  // retrieve payment intent from session
  let paymentIntentId = checkoutSession.payment_intent as string;

  // fallback: if payment_intent is null, we'll update it later in the webhook
  if (!paymentIntentId) {
    console.warn(
      "Payment intent not available at session creation, will be updated in webhook",
    );
  }

  // update booking
  await prisma.service_booking.update({
    where: { id: booking.id },
    data: { checkoutSessionId: checkoutSession.id },
  });

  // create payment record
  await prisma.payment.create({
    data: {
      amount: booking.totalPrice,
      description,
      currency: "usd",
      sessionId: checkoutSession.id,
      paymentIntentId: paymentIntentId,
      status: PaymentStatus.UNPAID,
      provider: "STRIPE",
      serviceType: "SERVICE",
      providerId: provider?.id,
      userId,
      service_bookingId: booking?.id,
      hotelId: booking?.hotelId,
    },
  });

  return {
    checkoutUrl: checkoutSession.url,
    checkoutSessionId: checkoutSession.id,
  };
};

// stripe webhook payment
// const stripeHandleWebhook = async (event: Stripe.Event) => {
//   switch (event.type) {
//     // case 1:checkout session completed
//     case "checkout.session.completed": {
//       const session = event.data.object as Stripe.Checkout.Session;
//       const sessionId = session.id;
//       const paymentIntentId = session.payment_intent as string;

//       // retrieve paymentIntent
//       const paymentIntent =
//         await stripe.paymentIntents.retrieve(paymentIntentId);

//       if (!paymentIntent.latest_charge) {
//         throw new ApiError(
//           httpStatus.BAD_REQUEST,
//           "No charge found in PaymentIntent",
//         );
//       }

//       // find Payment
//       const payment = await prisma.payment.findFirst({
//         where: { sessionId },
//       });

//       if (!payment) {
//         // console.log(`No payment found for session: ${sessionId}`);
//         break;
//       }

//       // update payment to PAID and set paymentIntentId
//       await prisma.payment.update({
//         where: { id: payment.id },
//         data: {
//           status: PaymentStatus.PAID,
//           paymentIntentId: paymentIntentId,
//         },
//       });

//       // update booking & service status
//       const configs = serviceConfig[payment.serviceType as ServiceType];
//       if (!configs) {
//         return;
//       }

//       // get bookingId from payment based on service type
//       let bookingId: string | undefined;
//       if (payment.serviceType === "SERVICE") {
//         bookingId = payment.service_bookingId || undefined;

//         // update payment status to PAID
//         await prisma.payment.update({
//           where: { id: payment.id },
//           data: {
//             status: PaymentStatus.IN_HOLD,
//           },
//         });
//       } else if (payment.serviceType === "HOTEL") {
//         bookingId = payment.hotel_bookingId || undefined;
//       }

//       const booking = await (configs.bookingModel as any).findUnique({
//         where: { id: bookingId },
//       });

//       if (!booking) {
//         return;
//       }

//       // validate required fields before proceeding
//       const userId = booking.userId;
//       const partnerId =
//         payment.serviceType === "SERVICE"
//           ? booking.providerId
//           : booking.partnerId;

//       if (!userId || !partnerId) {
//         console.error("Missing required fields in booking:", {
//           bookingId,
//           userId,
//           partnerId,
//           serviceType: payment.serviceType,
//           providerId: booking.providerId,
//           hotelPartnerId: booking.partnerId,
//         });
//         return;
//       }

//       // update booking status → CONFIRMED
//       const updateResult = await (configs.bookingModel as any).update({
//         where: { id: booking.id },
//         data: { bookingStatus: BookingStatus.CONFIRMED },
//       });

//       // update service EveryServiceStatus
//       if (payment.serviceType === "SERVICE") {
//         if (!booking.serviceId) {
//           console.error("Missing serviceId in booking:", booking);
//           return;
//         }

//         // update booking status to NEED_ACCEPT
//         await (configs.bookingModel as any).update({
//           where: { id: booking.id },
//           data: { bookingStatus: BookingStatus.NEED_ACCEPT },
//         });

//         // update service status to WAITING_FOR_ACCEPT
//         await (configs.serviceModel as any).update({
//           where: { id: booking.serviceId },
//           // data: { isBooked: EveryServiceStatus.BOOKED },
//           data: { isBooked: EveryServiceStatus.WAITING_FOR_ACCEPT },
//         });
//       }

//       // update hotel status
//       if (payment.serviceType === "HOTEL") {
//         if (!booking.hotelId) {
//           console.error("Missing hotelId in booking:", booking);
//           return;
//         }
//         await (configs.serviceModel as any).update({
//           where: { id: booking.hotelId },
//           data: { availableForBooking: EveryServiceStatus.BOOKED },
//         });
//       }

//       // ---------- send notification ----------
//       const notificationServiceId = (booking as any)[
//         configs.bookingToServiceField
//       ];
//       const service = await (configs.serviceModel as any).findUnique({
//         where: { id: notificationServiceId },
//       });
//       if (!service) return;

//       const notificationData: IBookingNotificationData = {
//         bookingId: booking.id,
//         userId: booking.userId,
//         partnerId: partnerId,
//         serviceTypes: payment.serviceType as ServiceTypes,
//         serviceName: service[configs.nameField],
//         totalPrice: booking.totalPrice,
//         // bookedFromDate:
//         //   (booking as any).bookedFromDate || (booking as any).date,
//         // bookedToDate: (booking as any).bookedToDate,
//         // quantity:
//         //   (booking as any).rooms ||
//         //   (booking as any).adults ||
//         //   (booking as any).number_of_security ||
//         //   1,
//       };

//       await BookingNotificationService.sendBookingNotifications(
//         notificationData,
//       );

//       // ---------- send confirmation email ----------
//       try {
//         const user = await prisma.user.findUnique({
//           where: { id: booking.userId },
//         });

//         if (user?.email) {
//           const subject = `🎉 Your ${payment.serviceType} booking is confirmed!`;
//           const html = `
//             <div style="font-family: Arial; padding: 20px;">
//               <h2>Hi ${user.fullName || "User"},</h2>
//               <p>Your <strong>${
//                 payment.serviceType
//               }</strong> booking has been confirmed successfully.</p>
//               <p><b>Payment ID:</b> ${payment.id}</p>
//               <p><b>Total Paid:</b> ${payment.amount} ${
//                 booking.displayCurrency || "USD"
//               }</p>
//               <p><b>Status:</b> Confirmed ✅</p>
//               <br/>
//               <p>Thanks for booking with us!</p>
//               <p>– Team Tim</p>
//             </div>
//           `;
//           await emailSender(subject, user.email, html);
//         }
//       } catch (error) {
//         console.error("❌ Email sending failed:", error);
//       }

//       break;
//     }

//     default:
//       // ignore other events
//       break;
//   }
// };

// stripe webhook payment
const stripeHandleWebhook = async (event: Stripe.Event) => {
  switch (event.type) {
    // checkout session completed
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const sessionId = session.id;
      const paymentIntentId = session.payment_intent as string;

      if (!paymentIntentId) break;

      // find Payment
      const payment = await prisma.payment.findFirst({
        where: { sessionId },
      });

      if (!payment) break;

      // store paymentIntentId
      await prisma.payment.update({
        where: { id: payment.id },
        data: { paymentIntentId },
      });

      const configs = serviceConfig[payment.serviceType as ServiceType];
      if (!configs) break;

      let bookingId: string | undefined;

      if (payment.serviceType === "SERVICE")
        bookingId = payment.service_bookingId || undefined;
      else if (payment.serviceType === "HOTEL")
        bookingId = payment.hotel_bookingId || undefined;

      if (!bookingId) break;

      const booking = await (configs.bookingModel as any).findUnique({
        where: { id: bookingId },
      });

      if (!booking) break;

      const partnerId =
        payment.serviceType === "SERVICE"
          ? booking.providerId
          : booking.partnerId;
      if (!booking.userId || !partnerId) break;

      // update booking status
      if (payment.serviceType === "SERVICE") {
        // await (configs.bookingModel as any).update({
        //   where: { id: booking.id },
        //   data: { bookingStatus: BookingStatus.NEED_ACCEPT },
        // });
        // await (configs.serviceModel as any).update({
        //   where: { id: booking.serviceId },
        //   data: { isBooked: EveryServiceStatus.WAITING_FOR_ACCEPT },
        // });
      } else if (payment.serviceType === "HOTEL") {
        await (configs.bookingModel as any).update({
          where: { id: booking.id },
          data: { bookingStatus: BookingStatus.CONFIRMED },
        });

        await (configs.serviceModel as any).update({
          where: { id: booking.hotelId },
          data: { availableForBooking: EveryServiceStatus.BOOKED },
        });

        // for HOTEL, mark payment as PAID immediately
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.PAID },
        });
      }

      // ------------------- send notifications for HOTEL bookings immediately after checkout -------------------
      if (payment.serviceType === "HOTEL") {
        try {
          const notificationData: IBookingNotificationData = {
            bookingId: booking.id,
            userId: booking.userId || undefined, // user who booked
            partnerId: payment.partnerId || undefined, // hotel owner
            serviceTypes: ServiceTypes.HOTEL,
            serviceName: booking.propertyName,
            totalPrice: payment.amount,
            hotelId: payment.hotelId || undefined,
          };

          await BookingNotificationService.sendBookingNotifications(
            notificationData,
          );
        } catch (notificationError) {
          console.error(
            "HOTEL notification sending failed:",
            notificationError,
          );
          // don't fail the webhook if notification fails
        }
      }

      break;
    }

    // payment hold update (manual capture required)
    case "payment_intent.amount_capturable_updated": {
      const intent = event.data.object as Stripe.PaymentIntent;

      const payment = await prisma.payment.findFirst({
        where: { paymentIntentId: intent.id },
      });

      if (!payment) break;

      // only SERVICE payments go to HOLD
      if (payment.serviceType !== "SERVICE") break;

      if (payment.status === PaymentStatus.IN_HOLD) break;

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.IN_HOLD },
      });

      // ------------------- send notifications for SERVICE bookings after payment hold is established -------------------
      try {
        // find the booking
        const booking = await prisma.service_booking.findFirst({
          where: { id: payment.service_bookingId || undefined },
        });

        if (booking) {
          const notificationData: IBookingNotificationData = {
            bookingId: booking.id,
            userId: booking.userId || undefined, // property owner who booked
            providerId: booking.providerId || undefined, // service provider for service bookings
            serviceTypes: ServiceTypes.SERVICE,
            serviceName: booking.serviceName || booking.property,
            totalPrice: payment.amount,
            // hotelId: payment.hotelId || undefined,
            serviceId: booking.serviceId || undefined,
          };

          await BookingNotificationService.sendBookingNotifications(
            notificationData,
          );

          // send payment request notification to property owner
          await BookingNotificationService.sendPaymentRequestNotification(
            notificationData,
          );
        }
      } catch (notificationError) {
        console.error(
          "SERVICE notification sending failed:",
          notificationError,
        );
        // Don't fail the webhook if notification fails
      }

      break;
    }

    default:
      break;
  }
};

// cancel booking service stripe
const cancelStripeBooking = async (
  serviceType: ServiceType,
  bookingId: string,
  userId: string,
) => {
  // Get config for the service type
  const serviceCfg = serviceConfig[serviceType.toUpperCase() as ServiceType];
  // console.log(serviceCfg, "serviceCfg");
  if (!serviceCfg) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid service type");
  }

  const bookingModel = serviceCfg.bookingModel;
  const serviceModel = serviceCfg.serviceModel;

  // Fetch booking with payment and user
  const booking = await (bookingModel as any).findUnique({
    where: { id: bookingId, userId },
    include: { payment: true, user: true },
  });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  const payment = booking.payment?.[0];
  if (!payment || !payment.payment_intent) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "No payment found for this booking",
    );
  }

  // Find partner (service provider)
  const partner = await prisma.user.findUnique({
    where: { id: payment.partnerId },
  });
  if (!partner || !partner.stripeAccountId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Partner has no connected Stripe account",
    );
  }

  // Refund full amount
  await stripe.refunds.create({
    payment_intent: payment.payment_intent,
    amount: Math.round(payment.amount * 100),
  });

  // Reverse transfer to partner if applicable
  if (payment.transfer_id && payment.service_fee > 0) {
    await stripe.transfers.createReversal(payment.transfer_id, {
      amount: payment.service_fee,
    });
  }

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.REFUNDED },
  });

  // Update booking status → CANCELLED
  await (bookingModel as any).update({
    where: { id: bookingId },
    data: { bookingStatus: BookingStatus.CANCELLED },
  });

  // update service status → AVAILABLE
  const serviceId = (booking as any)[serviceCfg.bookingToServiceField];
  if (serviceId) {
    await (serviceModel as any).update({
      where: { id: serviceId },
      data: { isBooked: EveryServiceStatus.AVAILABLE },
    });
  }

  // Send cancellation notification
  const service = serviceId
    ? await (serviceModel as any).findUnique({ where: { id: serviceId } })
    : null;

  const notificationData: IBookingNotificationData = {
    bookingId: booking.id,
    userId: booking.userId,
    partnerId: booking.partnerId,
    serviceTypes: serviceType.toUpperCase() as ServiceTypes,
    serviceName: service?.[serviceCfg.nameField] || "",
    totalPrice: booking.totalPrice,
  };

  await BookingNotificationService.sendCancelNotifications(notificationData);

  return { bookingId, status: "CANCELLED" };
};

// get my all my transactions
const getMyTransactions = async (userId: string) => {
  const transactions = await prisma.payment.findMany({
    where: { userId, status: PaymentStatus.PAID },
  });

  if (!transactions || transactions.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, "No transactions found");
  }

  return transactions;
};

export const PaymentService = {
  stripeAccountOnboarding,
  stripeHandleWebhook,
  cancelStripeBooking,
  getMyTransactions,
  createStripeCheckoutSessionForHotel,
  createStripeCheckoutSessionForService,
};
