import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Request, Response } from "express";
import { uploadFile } from "../../../helpars/fileUploader";
import { InvestorRelationsServices } from "./investor.service";

// create investor relations
const createInvestorRelations = catchAsync(
  async (req: Request, res: Response) => {
    const adminId = req.user?.id;
    const data = req.body;

    // if video is uploaded → upload to cloudinary
    if (req.file) {
      const cloudinaryResponse = await uploadFile.uploadToCloudinary(req.file);
      if (cloudinaryResponse?.secure_url) {
        data.imageUrl = cloudinaryResponse.secure_url;
      }
    }

    const result = await InvestorRelationsServices.createInvestorRelations(
      adminId,
      data
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Investor Relations created successfully",
      data: result,
    });
  }
);

// get all investor relations
const getAllInvestorRelations = catchAsync(
  async (req: Request, res: Response) => {
    const result = await InvestorRelationsServices.getAllInvestorRelations();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Investor Relations fetched successfully",
      data: result,
    });
  }
);

// get single investor relations by investorId
const getSingleInvestorRelation = catchAsync(
  async (req: Request, res: Response) => {
    const investorId = req.params.investorId;
    const result = await InvestorRelationsServices.getSingleInvestorRelation(
      investorId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Investor Relations fetched successfully",
      data: result,
    });
  }
);

// delete investor relations by investorId
const deleteInvestorRelation = catchAsync(
  async (req: Request, res: Response) => {
    const investorId = req.params.investorId;
    const result = await InvestorRelationsServices.deleteInvestorRelation(
      investorId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Investor Relations deleted successfully",
      data: result,
    });
  }
);

// update investor relations by investorId
const updateInvestorRelation = catchAsync(
  async (req: Request, res: Response) => {
    const investorId = req.params.investorId;
    const data = req.body;

    // if video is uploaded → upload to cloudinary
    if (req.file) {
      const cloudinaryResponse = await uploadFile.uploadToCloudinary(req.file);
      if (cloudinaryResponse?.secure_url) {
        data.imageUrl = cloudinaryResponse.secure_url;
      }
    }

    const result = await InvestorRelationsServices.updateInvestorRelation(
      investorId,
      data
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "InvestorRelations updated successfully",
      data: result,
    });
  }
);

export const InvestorRelationsController = {
  createInvestorRelations,
  getAllInvestorRelations,
  getSingleInvestorRelation,
  deleteInvestorRelation,
  updateInvestorRelation,
};
