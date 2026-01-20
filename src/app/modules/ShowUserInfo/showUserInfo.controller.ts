import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ShowUserInfoService } from "./showUserInfo.service";
import { Request, Response } from "express";

// create show user info for property owner by providerId
const createShowUserInfo = catchAsync(async (req: Request, res: Response) => {
  const providerId = req.params.providerId;
  const propertyOwnerId = req.user?.id;
  const result = await ShowUserInfoService.createShowUserInfo(
    providerId,
    propertyOwnerId,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Show user info created successfully",
    data: result,
  });
});

// update show user info
const updateShowUserInfo = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ShowUserInfoService.updateShowUserInfo(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Show user info updated successfully",
    data: result,
  });
});

export const ShowUserInfoController = {
  createShowUserInfo,
  updateShowUserInfo,
};
