import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { FinanceService } from "./finance.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { pick } from "../../../shared/pick";
import { filterField } from "./finance.constant";
import { paginationFields } from "../../../constants/pagination";

// get all finances
const getAllFinances = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await FinanceService.getAllFinances(filter, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Finances fetched successfully",
    data: result,
  });
});

// get all service providers finances
const getAllProvidersFinances = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.params.partnerId;
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result = await FinanceService.getAllProvidersFinances(
      partnerId,
      filter,
      options
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Finances fetched successfully",
      data: result,
    });
  }
);

// get all users finance
const getAllUsersFinances = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await FinanceService.getAllUsersFinances(
    userId,
    filter,
    options
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Finances fetched successfully",
    data: result,
  });
});

// get single service provider finances
const getSingleProviderFinance = catchAsync(
  async (req: Request, res: Response) => {
    const paymentId = req.params.paymentId;
    const result = await FinanceService.getSingleProviderFinance(paymentId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Finance fetched successfully",
      data: result,
    });
  }
);

export const FinanceController = {
  getAllFinances,
  getAllProvidersFinances,
  getAllUsersFinances,
  getSingleProviderFinance,
};
