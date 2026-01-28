import { Request, Response } from "express";

import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { SubscriptionService } from "./subscription.service";
import config from "../../../config";
import stripe from "../../../helpars/stripe";
import Stripe from "stripe";
import { filterField } from "./subscription.constant";
import { paginationFields } from "../../../constants/pagination";
import { pick } from "../../../shared/pick";

// ----------------------------subscription plan--------------------------------

// create subscription plan
const createSubscriptionPlan = catchAsync(
  async (req: Request, res: Response) => {
    const subscription = req.body;
    const userId = req.user?.id;
    const newSubscription = await SubscriptionService.createSubscriptionPlan(
      subscription,
      userId,
    );
    if (!newSubscription) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Failed to create new subscription!",
      );
    }
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Subscription created successfully",
      data: newSubscription,
    });
  },
);

// get all subscriptions plan
const getAllSubscriptionsPlan = catchAsync(
  async (req: Request, res: Response) => {
    const { query } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 8;

    const skip = (page - 1) * limit;
    const subscriptions = await SubscriptionService.getAllSubscriptionsPlan(
      query as string,
      skip,
      limit,
    );

    const totalSubscriptions = subscriptions.length || 0;
    const totalPages = Math.ceil(totalSubscriptions / limit);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Subscriptions retrieved successfully",
      data: subscriptions,
    });
  },
);

// get specific subscription plan by id
const getSpecificSubscriptionPlan = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const subscription =
      await SubscriptionService.getSpecificSubscriptionPlan(id);
    if (!subscription) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Subscription not found!");
    }
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Subscription retrieved successfully",
      data: subscription,
    });
  },
);

// update specific subscription plan
const updateSpecificSubscriptionPlan = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    const updatedSubscription =
      await SubscriptionService.updateSpecificSubscriptionPlan(id, data);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Subscription updated successfully",
      data: updatedSubscription,
    });
  },
);

// deleting specific subscription plan
const deleteSpecificSubscriptionPlan = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const deletedSubscription =
      await SubscriptionService.deleteSpecificSubscriptionPlan(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Subscription deleted successfully",
      data: deletedSubscription,
    });
  },
);

// ----------------------------subscription--------------------------------

// get all purchase subscription
const getAllPurchaseSubscription = catchAsync(
  async (req: Request, res: Response) => {
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const subscriptions = await SubscriptionService.getAllPurchaseSubscription(
      filter,
      options,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Subscriptions retrieved successfully",
      data: subscriptions,
    });
  },
);

// get my purchase subscription
const getMyPurchaseSubscription = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const subscriptions =
      await SubscriptionService.getMyPurchaseSubscription(userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Subscriptions retrieved successfully",
      data: subscriptions,
    });
  },
);

// create subscription
const createSubscription = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { planId } = req.body;

  const subscription = await SubscriptionService.createSubscription(
    userId,
    planId,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Subscription created successfully",
    data: subscription,
  });
});

// create checkout session for subscription
const createCheckoutSessionForSubscription = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user?.id;
  const { planId } = req.body;
  const session =
    await SubscriptionService.createCheckoutSessionForSubscription(
      userId,
      planId,
    );
  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Checkout session created",
    data: session,
  });
};

// Webhook handlers for payment providers
const handleStripeWebhook = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  if (!sig) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing stripe signature", "");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody!, // RAW BODY
      sig,
      config.stripe.webhookSecret_2 as string,
    );
  } catch (err: any) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Webhook Error: ${err.message}`,
      "",
    );
  }

  try {
    await SubscriptionService.handleStripeWebhook(event);
    res.json({ received: true });
  } catch (err) {
    res.status(500).send(`Webhook processing error.`);
  }
});

export const SubscriptionController = {
  createSubscriptionPlan,
  getAllSubscriptionsPlan,
  getSpecificSubscriptionPlan,
  updateSpecificSubscriptionPlan,
  deleteSpecificSubscriptionPlan,

  getAllPurchaseSubscription,
  getMyPurchaseSubscription,
  createSubscription,
  createCheckoutSessionForSubscription,
  handleStripeWebhook,
};
