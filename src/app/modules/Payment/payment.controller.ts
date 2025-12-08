import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { PaymentService } from "./payment.sercice";
import ApiError from "../../../errors/ApiErrors";
import config from "../../../config";
import stripe from "../../../helpars/stripe";
import Stripe from "stripe";
import { ServiceType } from "./Stripe/stripe";

// stripe account onboarding
const stripeAccountOnboarding = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const result = await PaymentService.stripeAccountOnboarding(userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stripe account onboarding successfully",
      data: result,
    });
  }
);

// checkout session on stripe for hotel
const createStripeCheckoutSessionForHotel = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { bookingId } = req.params;
    const { description } = req.body;

    const result = await PaymentService.createStripeCheckoutSessionForHotel(
      userId,
      bookingId,
      description
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Checkout session created successfully",
      data: result,
    });
  }
);

// checkout session on stripe for service
const createStripeCheckoutSessionForService = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { bookingId } = req.params;
    const { description } = req.body;

    const result = await PaymentService.createStripeCheckoutSessionForService(
      userId,
      bookingId,
      description
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Checkout session created successfully",
      data: result,
    });
  }
);

// stripe webhook payment
const stripeHandleWebhook = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  if (!sig) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing stripe signature", "");
  }

  let event: Stripe.Event;

  try {
    if (!req.rawBody) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Raw body not available", "");
    }

    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      config.stripe.webhookSecret as string
    );
  } catch (err: any) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Webhook Error: ${err.message}`,
      ""
    );
  }

  const result = await PaymentService.stripeHandleWebhook(event);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stripe webhook payment successfully",
    data: result,
  });
});

// stripe cancel booking
const cancelStripeBooking = catchAsync(async (req, res) => {
  const { serviceType, bookingId } = req.params;
  const userId = req.user?.id;

  const result = await PaymentService.cancelStripeBooking(
    serviceType as ServiceType,
    bookingId,
    userId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking cancelled successfully",
    data: result,
  });
});

// get my all my transactions
const getMyTransactions = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await PaymentService.getMyTransactions(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My transactions fetched successfully",
    data: result,
  });
});

export const PaymentController = {
  stripeAccountOnboarding,
  stripeHandleWebhook,
  cancelStripeBooking,
  getMyTransactions,
  createStripeCheckoutSessionForHotel,
  createStripeCheckoutSessionForService,
};
