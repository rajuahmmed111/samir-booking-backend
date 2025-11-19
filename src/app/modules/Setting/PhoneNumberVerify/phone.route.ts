import express from "express";
import { OtpController } from "./phone.controller";
import auth from "../../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// send otp to phone number
router.post(
  "/send-otp",
  auth(
    UserRole.USER,
    UserRole.BUSINESS_PARTNER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN
  ),
  OtpController.sendOtpToPhoneNumber
);

// verify otp
router.post(
  "/verify-otp",
  auth(
    UserRole.USER,
    UserRole.BUSINESS_PARTNER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN
  ),
  OtpController.verifyPhoneOtp
);

export const phoneRoute = router;
