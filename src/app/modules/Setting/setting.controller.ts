import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { SettingService } from "./setting.service";

// verify email and phone number
const verifyEmailAndPhoneNumber = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const result = await SettingService.verifyEmailAndPhoneNumber(userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Email and phone number verified successfully",
      data: result,
    });
  }
);

const createOrUpdateAbout = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const result = await SettingService.createOrUpdateAbout(data);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "About App section saved successfully",
    data: result,
  });
});

const getAbout = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingService.getAbout();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "About App fetched successfully",
    data: result,
  });
});

// create or update customer contact info
const createCustomerContactInfo = catchAsync(
  async (req: Request, res: Response) => {
    const data = req.body;
    const result = await SettingService.createCustomerContactInfo(data);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Customer contact info saved successfully",
      data: result,
    });
  }
);

// get customer contact info
const getCustomerContactInfo = catchAsync(
  async (req: Request, res: Response) => {
    const result = await SettingService.getCustomerContactInfo();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Customer contact info fetched successfully",
      data: result,
    });
  }
);

// updateNotificationSettings
const updateNotificationSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingService.updateNotificationSettings(req.user.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notification settings updated",
    data: result,
  });
});

export const SettingController = {
  verifyEmailAndPhoneNumber,
  createOrUpdateAbout,
  getAbout,
  createCustomerContactInfo,
  getCustomerContactInfo,
  updateNotificationSettings
};
