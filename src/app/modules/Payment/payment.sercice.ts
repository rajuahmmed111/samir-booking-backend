import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import stripe from "../../../helpars/stripe";
import {
  BookingStatus,
  EveryServiceStatus,
  PaymentStatus,
  UserStatus,
} from "@prisma/client";
import config from "../../../config";
import Stripe from "stripe";
import {
  mapStripeStatusToPaymentStatus,
  serviceConfig,
  ServiceType,
} from "./Stripe/stripe";
import axios from "axios";
import {
  BookingNotificationService,
  IBookingNotificationData,
  ServiceTypes,
} from "../../../shared/notificationService";
import * as crypto from "crypto";
import emailSender from "../../../helpars/emailSender";

const callback_url = "https://paystack.com/pay";
const payStackBaseUrl = "https://api.paystack.co";
const headers = {
  Authorization: `Bearer ${config.payStack.secretKey}`,
  "Content-Type": "application/json",
};

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

const ensureUserStripeAccount = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

  // Create onboarding link helper
  const createOnboardingLink = async (accountId: string) => {
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${config.stripe.refreshUrl}?accountId=${accountId}`,
      return_url: `${config.stripe.returnUrl}?accountId=${accountId}`,
      type: "account_onboarding",
    });
    return link.url;
  };

  // If user has no Stripe account → create one
  if (!user.stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: { payouts: { schedule: { delay_days: 2 } } },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeAccountId: account.id, isStripeConnected: false },
    });

    const onboardingLink = await createOnboardingLink(account.id);
    return { status: "onboarding_required", onboardingLink };
  }

  // User has a Stripe account → check capabilities
  const account = await stripe.accounts.retrieve(user.stripeAccountId);

  if (
    account.capabilities?.card_payments !== "active" ||
    account.capabilities?.transfers !== "active"
  ) {
    const onboardingLink = await createOnboardingLink(user.stripeAccountId);
    return { status: "onboarding_required", onboardingLink };
  }

  // Optional: check balance
  const balance = await stripe.balance.retrieve({
    stripeAccount: user.stripeAccountId,
  });

  return { status: "active", stripeAccountId: user.stripeAccountId, balance };
};

// checkout session on stripe
const createStripeCheckoutSession = async (
  userId: string,
  bookingId: string,
  description: string,
  country: string
) => {
  let booking: any;
  let service: any;
  let partner: any;
  let serviceName: string;
  let partnerId: string;
  let totalPrice: number;

  // find user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");



  // find partner
  partner = await prisma.user.findUnique({ where: { id: partnerId } });
  if (!partner || !partner.stripeAccountId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Provider not onboarded with Stripe"
    );
  }

  // amount (convert USD → cents)
  const amount = Math.round(totalPrice * 100);

  // add 5% vat
  const vatPercentage = 5;
  const vatAmount = Math.round(amount * (vatPercentage / 100));

  // total amount with 5% vat
  const totalWithVAT = amount + vatAmount;
  // console.log("totalWithVAT", totalWithVAT);

  // 15% admin commission
  const adminCommissionPercentage = 15;
  const adminCommission = Math.round(
    amount * (adminCommissionPercentage / 100)
  );

  // total admin earnings
  const adminFee = adminCommission + vatAmount;
  // console.log("adminFee", adminFee);

  // service fee (partner earnings)
  const serviceFee = totalWithVAT - adminFee;

  // currency support added
  const currency = booking.displayCurrency?.toLowerCase() || "usd";

  // create Stripe checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: serviceName || "Service Booking",
            description: description || "Service payment",
          },
          unit_amount: totalWithVAT,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${config.stripe.checkout_success_url}`,
    cancel_url: `${config.stripe.checkout_cancel_url}`,
    payment_intent_data: {
      application_fee_amount: adminFee, // goes to Admin
      transfer_data: { destination: partner.stripeAccountId }, // goes to Partner
      description,
    },
    metadata: {
      bookingId: booking.id,
      userId,
      serviceType,
    },
  });

  // update booking with checkoutSessionId
  switch (serviceType) {
    case "HOTEL":
      await prisma.hotel_Booking.update({
        where: { id: booking.id },
        data: { checkoutSessionId: checkoutSession.id },
      });
      break;
  }

  await prisma.payment.create({
    data: {
      amount: totalWithVAT / 100,
      description,
      currency: checkoutSession.currency,
      sessionId: checkoutSession.id,
      paymentMethod: checkoutSession.payment_method_types.join(","),
      status: PaymentStatus.UNPAID,
      provider: "STRIPE",
      payable_name: partner.fullName ?? "",
      payable_email: partner.email,
      country: partner.country ?? "",
      admin_commission: adminCommission / 100,
      service_fee: serviceFee / 100,
      vat_amount: vatAmount / 100,
      serviceType,
      partnerId,
      userId,
      hotel_bookingId: serviceType === "HOTEL" ? booking.id : undefined,
    },
  });

  return {
    checkoutUrl: checkoutSession.url,
    checkoutSessionId: checkoutSession.id,
  };
};

// stripe webhook payment
const stripeHandleWebhook = async (event: Stripe.Event) => {
  switch (event.type) {
    // case 1: checkout session completed (Website)
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const sessionId = session.id;
      const paymentIntentId = session.payment_intent as string;

      // retrieve paymentIntent
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      if (!paymentIntent.latest_charge) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "No charge found in PaymentIntent"
        );
      }

      // calculate provider received
      let providerReceived = 0;
      if (paymentIntent.transfer_data?.destination) {
        const amountReceived = paymentIntent.amount_received ?? 0;
        const applicationFee = paymentIntent.application_fee_amount ?? 0;
        providerReceived = amountReceived - applicationFee; // not USD
      }

      // find Payment
      const payment = await prisma.payment.findFirst({
        where: { sessionId },
      });

      if (!payment) {
        // console.log(`No payment found for session: ${sessionId}`);
        break;
      }

      // update payment to PAID
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          payment_intent: paymentIntentId,
          service_fee: providerReceived / 100,
        },
      });

      // update booking & service status
      const config = serviceConfig[payment.serviceType as ServiceType];
      if (!config) return;

      const bookingId = (payment as any)[config.serviceTypeField];

      // update booking totalPrice = paid amount (amount includes 5% VAT)
      await config.bookingModel.update({
        where: { id: bookingId },
        data: { totalPrice: payment.amount },
      });

      // // update booking & service status
      // const config = serviceConfig[payment.serviceType as ServiceType];
      // if (!config) return;

      // const bookingId = (payment as any)[config.serviceTypeField];
      const booking = await config.bookingModel.findUnique({
        where: { id: bookingId },
      });
      if (!booking) return;

      // update booking status → CONFIRMED
      await config.bookingModel.update({
        where: { id: booking.id },
        data: { bookingStatus: BookingStatus.CONFIRMED },
      });

      // update service status → BOOKED
      const serviceId = (booking as any)[config.bookingToServiceField];
      if (serviceId) {
        await config.serviceModel.update({
          where: { id: serviceId },
          data: { isBooked: EveryServiceStatus.BOOKED },
        });
      }

      // ---------- send notification ----------
      const service = await config.serviceModel.findUnique({
        where: { id: serviceId },
      });
      if (!service) return;

      const notificationData: IBookingNotificationData = {
        bookingId: booking.id,
        userId: booking.userId,
        partnerId: booking.partnerId,
        serviceTypes: payment.serviceType as ServiceTypes,
        serviceName: service[config.nameField],
        totalPrice: booking.totalPrice,
        // bookedFromDate:
        //   (booking as any).bookedFromDate || (booking as any).date,
        // bookedToDate: (booking as any).bookedToDate,
        // quantity:
        //   (booking as any).rooms ||
        //   (booking as any).adults ||
        //   (booking as any).number_of_security ||
        //   1,
      };

      await BookingNotificationService.sendBookingNotifications(
        notificationData
      );

      // ---------- send confirmation email ----------
      try {
        const user = await prisma.user.findUnique({
          where: { id: booking.userId },
        });

        if (user?.email) {
          const subject = `🎉 Your ${payment.serviceType} booking is confirmed!`;
          const html = `
            <div style="font-family: Arial; padding: 20px;">
              <h2>Hi ${user.fullName || "User"},</h2>
              <p>Your <strong>${
                payment.serviceType
              }</strong> booking has been confirmed successfully.</p>
              <p><b>Payment ID:</b> ${payment.id}</p>
              <p><b>Total Paid:</b> ${payment.amount} ${
            booking.displayCurrency || "USD"
          }</p>
              <p><b>Status:</b> Confirmed ✅</p>
              <br/>
              <p>Thanks for booking with us!</p>
              <p>– Team Tim</p>
            </div>
          `;
          await emailSender(subject, user.email, html);
        }
      } catch (error) {
        console.error("❌ Email sending failed:", error);
      }

      break;
    }

    // case 2: payment intent succeeded (App)
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      const paymentIntentId = paymentIntent.id;

      // find payment
      const payment = await prisma.payment.findFirst({
        where: { sessionId: paymentIntentId },
      });
      if (!payment) {
        // console.log(`No payment found for payment intent: ${paymentIntentId}`);
        break;
      }

      let providerReceived = 0;
      if (paymentIntent.transfer_data?.destination) {
        const amountReceived = paymentIntent.amount_received ?? 0;
        const applicationFee = paymentIntent.application_fee_amount ?? 0;
        providerReceived = amountReceived - applicationFee;
      }

      // update payment to PAID
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status:
            paymentIntent.status === "succeeded"
              ? PaymentStatus.PAID
              : PaymentStatus.UNPAID,
          payment_intent: paymentIntentId,
          service_fee: providerReceived,
        },
      });

      // update booking & service status
      const config = serviceConfig[payment.serviceType as ServiceType];
      if (!config) return;

      const bookingId = (payment as any)[config.serviceTypeField];
      const booking = await config.bookingModel.findUnique({
        where: { id: bookingId },
      });
      if (!booking) return;

      // update booking status → CONFIRMED
      await config.bookingModel.update({
        where: { id: booking.id },
        data: { bookingStatus: BookingStatus.CONFIRMED },
      });

      // update service status → BOOKED
      const serviceId = (booking as any)[
        `${payment.serviceType.toLowerCase()}Id`
      ];
      if (serviceId) {
        await config.serviceModel.update({
          where: { id: serviceId },
          data: { isBooked: EveryServiceStatus.BOOKED },
        });
      }

      // if booking service type SECURITY hoy tahole security protocol ar id dore hiredCount +1 hobe and payment status jodi paid hoy
      if (
        payment.serviceType === "SECURITY" &&
        payment.status === PaymentStatus.PAID
      ) {
        await config.serviceModel.update({
          where: { id: serviceId },
          data: { hiredCount: { increment: 1 } },
        });
      }

      // ---------- send notification ----------
      const service = await config.serviceModel.findUnique({
        where: { id: serviceId },
      });
      if (!service) return;

      const notificationData: IBookingNotificationData = {
        bookingId: booking.id,
        userId: booking.userId,
        partnerId: booking.partnerId,
        serviceTypes: payment.serviceType as ServiceTypes,
        serviceName: service[config.nameField],
        totalPrice: booking.totalPrice,
        // bookedFromDate:
        //   (booking as any).bookedFromDate || (booking as any).date,
        // bookedToDate: (booking as any).bookedToDate,
        // quantity:
        //   (booking as any).rooms ||
        //   (booking as any).adults ||
        //   (booking as any).number_of_security ||
        //   1,
      };

      await BookingNotificationService.sendBookingNotifications(
        notificationData
      );
      break;
    }

    default:
      // ignore other events
      break;
  }
};

// cancel booking service stripe
const cancelStripeBooking = async (
  serviceType: ServiceType,
  bookingId: string,
  userId: string
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
  const booking = await bookingModel.findUnique({
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
      "No payment found for this booking"
    );
  }

  // Find partner (service provider)
  const partner = await prisma.user.findUnique({
    where: { id: payment.partnerId },
  });
  if (!partner || !partner.stripeAccountId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Partner has no connected Stripe account"
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
  await bookingModel.update({
    where: { id: bookingId },
    data: { bookingStatus: BookingStatus.CANCELLED },
  });

  // update service status → AVAILABLE
  const serviceId = (booking as any)[serviceCfg.bookingToServiceField];
  if (serviceId) {
    await serviceModel.update({
      where: { id: serviceId },
      data: { isBooked: EveryServiceStatus.AVAILABLE },
    });
  }

  // Send cancellation notification
  const service = serviceId
    ? await serviceModel.findUnique({ where: { id: serviceId } })
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
  createStripeCheckoutSession,
};
