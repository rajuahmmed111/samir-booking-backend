import { Request, Response } from "express";
import catchAsync from "../../../../shared/catchAsync";
import sendResponse from "../../../../shared/sendResponse";
import httpStatus from "http-status";
import { OtpService } from "./phone.service";

// send otp to phone number
const sendOtpToPhoneNumber = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { contactNumber } = req.body;
  const result = await OtpService.sendOtpToPhoneNumber(userId, contactNumber);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Otp sent successfully",
    data: result,
  });
});

// verify otp
const verifyPhoneOtp = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { otp } = req.body;
  const result = await OtpService.verifyPhoneOtp(userId, otp);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Otp verified successfully",
    data: result,
  });
});

export const OtpController = {
  sendOtpToPhoneNumber,
  verifyPhoneOtp,
};
