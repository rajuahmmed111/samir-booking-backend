import { UserRole } from "@prisma/client";
import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { authValidation } from "./auth.validation";

const router = express.Router();

// login user
router.post("/login", AuthController.loginUser);

// create user and login facebook and google
router.post("/social-login", AuthController.socialLogin);

// website login after booking
router.post("/login-website", AuthController.loginWebsite);


// refresh token
router.post("/refresh-token", AuthController.refreshToken);

// user logout route
router.post(
  "/logout",
  auth(
    UserRole.USER,
    UserRole.BUSINESS_PARTNER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN
  ),
  AuthController.logoutUser
);

//change password
router.put(
  "/change-password",
  auth(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.USER,
    UserRole.BUSINESS_PARTNER
  ),
  validateRequest(authValidation.changePasswordValidationSchema),
  AuthController.changePassword
);

// forgot password
router.post("/forgot-password", AuthController.forgotPassword);

// verity otp
router.post("/verify-otp", AuthController.verifyOtp);

// reset password
router.post(
  "/reset-password",
  validateRequest(authValidation.resetPasswordSchema),
  AuthController.resetPassword
);

export const authRoutes = router;
