import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ShowUserInfoService } from "./showUserInfo.service";
import { Request, Response } from "express";
import { pick } from "../../../shared/pick";
import { paginationFields } from "../../../constants/pagination";
import { filterField } from "./showUserInfo.constant";

// get all service provider for property owner
const getAllServiceProvidersForPropertyOwner = catchAsync(
  async (req: Request, res: Response) => {
    const options = pick(req.query, paginationFields);
    const filter = pick(req.query, filterField);

    const result =
      await ShowUserInfoService.getAllServiceProvidersForPropertyOwner(
        filter,
        options,
      );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service Providers fetched successfully",
      data: result,
    });
  },
);

export const ShowUserInfoController = {
  getAllServiceProvidersForPropertyOwner,
};
