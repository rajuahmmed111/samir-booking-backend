import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Request, Response } from "express";
import { TermsServices } from "./terms.service";

// create or update terms and conditions
const createOrUpdateTerms = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const { description } = req.body;
  const result = await TermsServices.createOrUpdateTerms(adminId, description);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Terms and Conditions created successfully",
    data: result,
  });
});

// get terms and conditions
const getTerms = catchAsync(async (req: Request, res: Response) => {
  const result = await TermsServices.getTerms();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Terms and Conditions fetched successfully",
    data: result,
  });
});

export const TermsController = {
  createOrUpdateTerms,
  getTerms,
};
