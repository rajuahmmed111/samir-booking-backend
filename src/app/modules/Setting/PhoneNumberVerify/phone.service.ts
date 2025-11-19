import httpStatus from "http-status";
import ApiError from "../../../../errors/ApiErrors";
import prisma from "../../../../shared/prisma";
import { generateOtp } from "../../../../utils/generateOtp";
import twilio from "twilio";
import config from "../../../../config";

const client = twilio(config.twilio.accountSid, config.twilio.authToken);

const sendOtpToPhoneNumber = async (userId: string, contactNumber: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

  const randomOtp = generateOtp(4);
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

  try {
    // Send SMS
    const sms = await client.messages.create({
      body: `🔐 Your verification code is: ${randomOtp}`,
      from: process.env.TWILIO_PHONE_NUMBER || "+14199888443",
      to: contactNumber.startsWith("+") ? contactNumber : `+${contactNumber}`,
    });

    // save otp
    await prisma.user.update({
      where: { id: user.id },
      data: { otp: randomOtp, otpExpiry, contactNumber },
    });

    return {
      success: true,
      message: "OTP sent successfully",
      sid: sms.sid,
    };
  } catch (error: any) {
    console.error("Twilio Error:", error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to send OTP: ${error.message}`
    );
  }
};

// verify otp
const verifyPhoneOtp = async (
  userId: string,
  otp: string,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  if (!user.otp || !user.otpExpiry)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "No OTP found. Please request again."
    );

  // check expiry
  if (user.otpExpiry < new Date()) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "OTP has expired. Please request again."
    );
  }

  // check match
  if (user.otp !== otp) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid OTP");
  }

  // mark as verified
  await prisma.user.update({
    where: { id: user.id },
    data: {
      isPhoneVerified: true,
      otp: null,
      otpExpiry: null,
    },
  });

  return {
    success: true,
    message: "Phone number verified successfully",
  };
};

export const OtpService = {
  sendOtpToPhoneNumber,
  verifyPhoneOtp,
};
