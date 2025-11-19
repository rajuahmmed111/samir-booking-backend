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

// create intent on stripe
const createStripePaymentIntent = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { serviceType, bookingId } = req.params;
    const { description, country } = req.body;

    const normalizedServiceType = serviceType.toUpperCase() as "HOTEL";

    const result = await PaymentService.createStripePaymentIntent(
      userId,
      normalizedServiceType,
      bookingId,
      description,
      country
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

// --------------------------- pay-stack ---------------------------
//
// bank list
const getPayStackBanks = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getPayStackBanks();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Banks fetched successfully",
    data: result,
  });
});

// get sub account list
const getPayStackSubAccounts = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const result = await PaymentService.getPayStackSubAccounts(userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Sub accounts fetched successfully",
      data: result,
    });
  }
);

// account verify
const verifyPayStackAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { account_number, bank_code } = req.body;
    const result = await PaymentService.verifyPayStackAccount(
      account_number,
      bank_code
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Account verified successfully",
      data: result,
    });
  }
);

// pay-stack sub account
const payStackAccountSubAccount = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const accountData = req.body;
    const result = await PaymentService.payStackAccountSubAccount(
      userId,
      accountData
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Pay-stack account sub account add successfully",
      data: result,
    });
  }
);

// create checkout session on pay-stack
const createCheckoutSessionPayStack = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { serviceType, bookingId } = req.params;
    const { description } = req.body;
    const normalizedServiceType = serviceType.toUpperCase() as
      | "CAR"
      | "HOTEL"
      | "SECURITY"
      | "ATTRACTION";

    const result = await PaymentService.createCheckoutSessionPayStack(
      userId,
      normalizedServiceType,
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

// charge card (in-app payment)
const chargeCardPayStack = catchAsync(async (req: Request, res: Response) => {
  // const { reference, card, amount } = req.body;
  console.log(req.body, "req.body");
  const result = await PaymentService.chargeCardPayStack(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.success ? "Payment successful" : "Payment failed",
    data: result,
  });
});

// pay-stack webhook payment
const payStackHandleWebhook = catchAsync(
  async (req: Request, res: Response) => {
    // let event: any;

    const result = await PaymentService.payStackHandleWebhook(req);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Paystack webhook payment successfully",
      data: result,
    });
  }
);

// pay-stack cancel booking
const cancelPayStackBooking = catchAsync(async (req, res) => {
  const { serviceType, bookingId } = req.params;
  const userId = req.user?.id;
  const result = await PaymentService.cancelPayStackBooking(
    serviceType,
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

// ------------------------------ website payment ------------------------------
// checkout session on stripe
const createStripeCheckoutSessionWebsite = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { serviceType, bookingId } = req.params;
    const { description, country } = req.body;

    const normalizedServiceType = serviceType.toUpperCase() as "HOTEL";

    const result = await PaymentService.createStripeCheckoutSessionWebsite(
      userId,
      normalizedServiceType,
      bookingId,
      description,
      country
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Checkout session created successfully",
      data: result,
    });
  }
);



export const PaymentController = {
  stripeAccountOnboarding,
  createStripePaymentIntent,
  stripeHandleWebhook,
  cancelStripeBooking,
  getPayStackBanks,
  getPayStackSubAccounts,
  verifyPayStackAccount,
  payStackAccountSubAccount,
  createCheckoutSessionPayStack,
  chargeCardPayStack,
  payStackHandleWebhook,
  cancelPayStackBooking,
  getMyTransactions,
  createStripeCheckoutSessionWebsite,
};
