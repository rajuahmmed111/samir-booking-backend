import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { RefundPolicyService } from "./refund_policy.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

// create or update refund_policy
const createOrUpdateRefundPolicy = catchAsync(
  async (req: Request, res: Response) => {
    const { description } = req.body;
    const result =
      await RefundPolicyService.createOrUpdateRefundPolicy(
        description
      );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Refund policy created successfully",
      data: result,
    });
  }
);

// get all refund_policy
const getAllRefundPolicy = catchAsync(
  async (req: Request, res: Response) => {
    const result = await RefundPolicyService.getAllRefundPolicy();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Refund policy retrieved successfully",
      data: result,
    });
  }
);

export const RefundPolicyController = {
  createOrUpdateRefundPolicy,
  getAllRefundPolicy,
};
