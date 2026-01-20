import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ShowUserInfoService } from "./showUserInfo.service";
import { Request, Response } from "express";
import { pick } from "../../../shared/pick";
import { paginationFields } from "../../../constants/pagination";
import { filterField } from "./showUserInfo.constant";

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

// get all show user info
const getAllShowUserInfo = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await ShowUserInfoService.getAllShowUserInfo(filter, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All show user info retrieved successfully",
    data: result,
  });
});

export const ShowUserInfoController = {
  createShowUserInfo,
  updateShowUserInfo,
  getAllShowUserInfo,
};
