import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Request, Response } from "express";
import { PrivacyServices } from "./policy.service";

// create privacy policy
const createPolicy = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const result = await PrivacyServices.createPolicy(adminId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Privacy Policy created successfully",
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

// get privacy policy by id
const getSinglePolicy = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await PrivacyServices.getSinglePolicy(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Privacy Policy fetched successfully",
    data: result,
  });
});

// update privacy policy
const updatePolicy = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const policyId = req.params.id;

  const result = await PrivacyServices.updatePolicyByAdminId(
    adminId,
    policyId,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Privacy Policy updated successfully",
    data: result,
  });
});

export const PrivacyController = {
  createPolicy,
  getAllPolicy,
  getSinglePolicy,
  updatePolicy,
};
