import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Request, Response } from "express";
import { TermsServices } from "./terms.service";

// create terms and conditions
const createTerms = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const termsData = req.body;
  const result = await TermsServices.createTerms(adminId, termsData);

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

// get single terms and conditions
const getSingleTerms = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await TermsServices.getSingleTerms(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Terms and Conditions fetched successfully",
    data: result,
  });
});

// update terms and conditions
const updateTerms = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const termId = req.params.id;
  const result = await TermsServices.updateTermsByAdminId(adminId, termId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Terms and Conditions updated successfully",
    data: result,
  });
});

export const TermsController = {
  createTerms,
  getTerms,
  getSingleTerms,
  updateTerms,
};
