import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { FaqService } from "./faq.service";
import { Request, Response } from "express";

// create faq
const createFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqService.createFaq(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Faq created successfully !",
    data: result,
  });
});

// get all faq
const getAllFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqService.getAllFaq();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Faq retrieved successfully !",
    data: result,
  });
});

// get single faq
const getSingleFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqService.getSingleFaq(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Faq retrieved successfully !",
    data: result,
  });
});

// update faq
const updateFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqService.updateFaq(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Faq updated successfully !",
    data: result,
  });
});

// delete faq
const deleteFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqService.deleteFaq(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Faq deleted successfully !",
    data: result,
  });
});

export const FaqController = {
  createFaq,
  getAllFaq,
  getSingleFaq,
  updateFaq,
  deleteFaq,
};
