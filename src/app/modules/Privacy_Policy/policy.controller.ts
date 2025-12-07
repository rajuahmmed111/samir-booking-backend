import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Request, Response } from "express";
import { PrivacyServices } from "./policy.service";

// create or update privacy policy
const createOrUpdatePolicy = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const { description } = req.body;

  const result = await PrivacyServices.createOrUpdatePolicy(adminId, description);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Privacy Policy updated successfully",
    data: result,
  });
});

// get all privacy policy
const getAllPolicy = catchAsync(async (req: Request, res: Response) => {
  const result = await PrivacyServices.getAllPolicy();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Privacy Policy fetched successfully",
    data: result,
  });
});

export const PrivacyController = {
  getAllPolicy,
  createOrUpdatePolicy,
};
