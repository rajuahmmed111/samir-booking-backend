import { Request, Response } from "express";

import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { SubscriptionService } from "./subscription.service";

// create subscription
const createSubscription = catchAsync(async (req: Request, res: Response) => {
  const subscription = req.body;
  const userId = req.user?.id;
  const newSubscription = await SubscriptionService.createSubscription(
    subscription,
    userId
  );
  if (!newSubscription) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Failed to create new subscription!"
    );
  }
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Subscription created successfully",
    data: newSubscription,
  });
});

// get all subscriptions
const getSubscriptions = catchAsync(async (req: Request, res: Response) => {
  const { query } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 8;

  const skip = (page - 1) * limit;
  const subscriptions = await SubscriptionService.getAllSubscriptions(
    query as string,
    skip,
    limit
  );

  const totalSubscriptions = subscriptions.length || 0;
  const totalPages = Math.ceil(totalSubscriptions / limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscriptions retrieved successfully",
    data: subscriptions,
  });
});

// get specific subscription by id
const getSpecificSubscriptionById = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const subscription = await SubscriptionService.getSpecificSubscription(id);
    if (!subscription) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Subscription not found!");
    }
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Subscription retrieved successfully",
      data: subscription,
    });
  }
);

// update specific subscription
const updateSpecificSubscription = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    const updatedSubscription =
      await SubscriptionService.updateSpecificSubscription(id, data);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Subscription updated successfully",
      data: updatedSubscription,
    });
  }
);

// deleting specific subscription
const deleteSpecificSubscription = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const deletedSubscription =
      await SubscriptionService.deleteSpecificSubscription(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Subscription deleted successfully",
      data: deletedSubscription,
    });
  }
);

export default {
  createSubscription,
  getSubscriptions,
  updateSpecificSubscription,
  deleteSpecificSubscription,
  getSpecificSubscriptionById,
};
