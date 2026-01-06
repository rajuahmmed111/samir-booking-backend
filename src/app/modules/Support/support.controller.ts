import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { SupportService } from "./support.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { pick } from "../../../shared/pick";
import { filterField } from "./support.constant";
import { paginationFields } from "../../../constants/pagination";

// create user report
const createUserReport = catchAsync(async (req: Request, res: Response) => {
  const reporterId = req.user?.id;
  const { reportedUserId, ...data } = req.body;
  const result = await SupportService.createUserReport(
    reporterId,
    reportedUserId,
    data
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User report created successfully",
    data: result,
  });
});

// get all support
const getAllSupport = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await SupportService.getAllSupport(filter, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support fetched successfully",
    data: result,
  });
});

// get my support
const getMySupport = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await SupportService.getMySupport(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support fetched successfully",
    data: result,
  });
});

// get support by id
const getSupportById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await SupportService.getSupportById(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support fetched successfully",
    data: result,
  });
});

// update my support
const updateMySupport = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const supportId = req.params.supportId;
  const data = req.body;
  const result = await SupportService.updateMySupport(userId, supportId, data);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support updated successfully",
    data: result,
  });
});

// delete my support
const deleteMySupport = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const supportId = req.params.supportId;
  const result = await SupportService.deleteMySupport(userId, supportId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support deleted successfully",
    data: result,
  });
});

// delete support
const deleteSupport = catchAsync(async (req: Request, res: Response) => {
  const supportId = req.params.supportId;
  const result = await SupportService.deleteSupport(supportId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support deleted successfully",
    data: result,
  });
});

export const SupportController = {
  createUserReport,
  getAllSupport,
  getMySupport,
  getSupportById,
  updateMySupport,
  deleteMySupport,
  deleteSupport,
};
