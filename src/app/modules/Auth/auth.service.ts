import { UserRole, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import httpStatus from "http-status";
import { JwtPayload, Secret } from "jsonwebtoken";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import emailSender from "../../../helpars/emailSender";
import { jwtHelpers } from "../../../helpars/jwtHelpers";
import prisma from "../../../shared/prisma";
import {
  ILoginRequest,
  ILoginResponse,
  ISignupRequest,
  ISignupResponse,
} from "./auth.interface";

// login user
const loginUser = async (payload: ILoginRequest): Promise<ILoginResponse> => {
  const { email, password, fcmToken, role } = payload;

  const userData = await prisma.user.findFirst({
    where: { email: email, status: UserStatus.ACTIVE, role: role as UserRole },
  });

  if (!userData) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (userData.status === UserStatus.INACTIVE) {
    throw new ApiError(httpStatus.FORBIDDEN, "Your account is inactive");
  }

  if (!password || !userData.password) {
    throw new Error("Password is required");
  }

  const isCorrectPassword = await bcrypt.compare(password, userData.password);

  if (!isCorrectPassword) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "incorrect credentials!");
  }

  // update fcm token
  let updatedFcmToken = userData;
  if (fcmToken) {
    try {
      updatedFcmToken = await prisma.user.update({
        where: { id: userData.id },
        data: { fcmToken: fcmToken },
      });
    } catch (error) {
      console.error("Failed to update FCM token:", error);
      // Don't throw error here, login should still work
    }
  }

  // generate token
  const accessToken = jwtHelpers.generateToken(
    {
      id: userData.id,
      email: userData.email,
      role: userData.role,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.expires_in as string
  );

  const refreshToken = jwtHelpers.generateToken(
    {
      id: userData.id,
      email: userData.email,
      role: userData.role,
    },
    config.jwt.refresh_token_secret as Secret,
    config.jwt.refresh_token_expires_in as string
  );

  const result = {
    accessToken,
    refreshToken,
    user: {
      fcmToken: updatedFcmToken.fcmToken,
    },
  };

  return result;
};

// social login (Google / Facebook)
const socialLogin = async (payload: any) => {
  const { email, fcmToken, fullName, role } = payload;

  // if user already exist
  let user = await prisma.user.findFirst({
    where: { email: email, status: UserStatus.ACTIVE },
  });

  // if user not exist then create
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        fullName,
        role,
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 12),
        status: UserStatus.ACTIVE,
      },
    });
  }

  // if user is inactive
  if (user.status === UserStatus.INACTIVE) {
    throw new ApiError(httpStatus.FORBIDDEN, "Your account is inactive");
  }

  // fcm token update
  if (fcmToken) {
    try {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { fcmToken },
      });
    } catch (error) {
      console.error("Failed to update FCM token:", error);
    }
  }

  // access Token Generate
  const accessToken = jwtHelpers.generateToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.expires_in as string
  );

  // refresh Token Generate
  const refreshToken = jwtHelpers.generateToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwt.refresh_token_secret as Secret,
    config.jwt.refresh_token_expires_in as string
  );

  return {
    accessToken,
    refreshToken,
    user: {
      fcmToken: user.fcmToken,
      isHotel: user.isHotel,
      isSecurity: user.isSecurity,
      isCar: user.isCar,
      isAttraction: user.isAttraction,
    },
  };
};

// website login after booking
const loginWebsite = async (payload: ISignupRequest) => {
  const { fullName, email, password, contactNumber, country, fcmToken, role } =
    payload;

  // check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "User already exists with this email"
    );
  }

  // use default password if not provided
  const finalPassword = password && password.length >= 6 ? password : "123456";

  // hash password
  const hashedPassword = await bcrypt.hash(finalPassword, 12);

  // create user
  const newUser = await prisma.user.create({
    data: {
      fullName,
      email,
      password: hashedPassword,
      contactNumber: contactNumber || null,
      country: country || null,
      role: (role as UserRole) || UserRole.USER,
      status: UserStatus.ACTIVE,
      fcmToken: fcmToken || "",
    },
  });

  // generate token
  const accessToken = jwtHelpers.generateToken(
    {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.expires_in as string
  );

  const refreshToken = jwtHelpers.generateToken(
    {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    },
    config.jwt.refresh_token_secret as Secret,
    config.jwt.refresh_token_expires_in as string
  );

  const result: ISignupResponse = {
    accessToken,
    refreshToken,
    user: {
      id: newUser.id,
      fullName: newUser.fullName,
      email: newUser.email,
      profileImage: newUser.profileImage,
      contactNumber: newUser.contactNumber,
      country: newUser.country,
      role: newUser.role,
      fcmToken: newUser.fcmToken,
      isHotel: newUser.isHotel,
      isSecurity: newUser.isSecurity,
      isCar: newUser.isCar,
      isAttraction: newUser.isAttraction,
    },
  };

  return result;
};

// refresh token
const refreshToken = async (token: string) => {
  let decodedData;

  try {
    decodedData = jwtHelpers.verifyToken(
      token,
      config.jwt.refresh_token_secret as string
    ) as JwtPayload;
    console.log(decodedData);
  } catch (err) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Your not authorized");
  }

  const isUserExist = await prisma.user.findUnique({
    where: {
      email: decodedData?.email,
      status: UserStatus.ACTIVE,
    },
  });
  if (!isUserExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const newAccessToken = jwtHelpers.generateToken(
    { id: isUserExist.id, email: isUserExist.email, role: isUserExist.role },
    config.jwt.jwt_secret as Secret,
    config.jwt.expires_in as string
  );

  return {
    accessToken: newAccessToken,
  };
};

// change password
const changePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string
) => {
  const userData = await prisma.user.findUnique({
    where: {
      id: userId,
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      password: true,
    },
  });
  if (!userData) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const isPasswordMatch: boolean = await bcrypt.compare(
    oldPassword,
    userData.password
  );
  if (!isPasswordMatch) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Password is incorrect");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: {
      id: userData.id,
    },
    data: {
      password: hashedPassword,
    },
  });

  return {
    message: "Password changed successfully",
  };
};

// forgot password
const forgotPassword = async (payload: { email: string }) => {
  const userData = await prisma.user.findUnique({
    where: {
      email: payload.email,
      status: UserStatus.ACTIVE,
    },
  });
  if (!userData) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // generate 4 digit otp
  const randomOtp = Math.floor(1000 + Math.random() * 9000);
  // expire time 5 min otp
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Verification</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; line-height: 1.6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #FF7600; background-image: linear-gradient(135deg, #FF7600, #45a049); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">OTP Verification</h1>
        </div>
        <div style="padding: 20px 12px; text-align: center;">
            <p style="font-size: 18px; color: #333333; margin-bottom: 10px;">Hello,</p>
            <p style="font-size: 18px; color: #333333; margin-bottom: 20px;">Your OTP for verifying your account is:</p>
            <p style="font-size: 36px; font-weight: bold; color: #FF7600; margin: 20px 0; padding: 10px 20px; background-color: #f0f8f0; border-radius: 8px; display: inline-block; letter-spacing: 5px;">${randomOtp}</p>
            <p style="font-size: 16px; color: #555555; margin-bottom: 20px; max-width: 400px; margin-left: auto; margin-right: auto;">Please enter this OTP to complete the verification process. This OTP is valid for 5 minutes.</p>
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="font-size: 14px; color: #888888; margin-bottom: 4px;">Thank you for choosing our service!</p>
                <p style="font-size: 14px; color: #888888; margin-bottom: 0;">If you didn't request this OTP, please ignore this email.</p>
            </div>
        </div>
        <div style="background-color: #f9f9f9; padding: 10px; text-align: center; font-size: 12px; color: #999999;">
            <p style="margin: 0;">© ${new Date().getFullYear()} My Financial Trading. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

  await emailSender("OTP", userData.email, html);

  await prisma.user.update({
    where: {
      id: userData.id,
    },
    data: {
      otp: randomOtp.toString(),
      otpExpiry: otpExpiry,
    },
  });

  return {
    message: "OTP sent successfully",
  };
};

// forgot password
// const forgotPassword = async (payload: { email: string }) => {
//   const userData = await prisma.user.findUnique({
//     where: {
//       email: payload.email,
//     },
//   });
//   if (!userData) {
//     throw new ApiError(httpStatus.NOT_FOUND, "User not found");
//   }

//   const resetPassToken = jwtHelpers.generateToken(
//     { email: userData.email, role: userData.role },
//     config.jwt.reset_pass_secret as Secret,
//     config.jwt.reset_pass_token_expires_in as string
//   );

//   const resetPassLink =
//     config.reset_pass_link + `?userId=${userData.id}&token=${resetPassToken}`;

//   await emailSender(
//     "Reset Your Password",
//     userData.email,
//     `<!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Password Reset Request</title>
// </head>
// <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; margin: 0; padding: 20px; line-height: 1.6; color: #333333;">
//     <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
//         <div style="background-color: #FF7600; padding: 30px 20px; text-align: center;">
//             <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Password Reset Request</h1>
//         </div>
//         <div style="padding: 40px 30px;">
//             <p style="font-size: 16px; margin-bottom: 20px;">Dear User,</p>

//             <p style="font-size: 16px; margin-bottom: 30px;">We received a request to reset your password. Click the button below to reset your password:</p>

//             <div style="text-align: center; margin-bottom: 30px;">
//                 <a href=${resetPassLink} style="display: inline-block; background-color: #FF7600; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: 600; transition: background-color 0.3s ease;">
//                     Reset Password
//                 </a>
//             </div>

//             <p style="font-size: 16px; margin-bottom: 20px;">If you did not request a password reset, please ignore this email or contact support if you have any concerns.</p>

//             <p style="font-size: 16px; margin-bottom: 0;">Best regards,<br>Your Support Team</p>
//         </div>
//         <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #6c757d;">
//             <p style="margin: 0 0 10px;">This is an automated message, please do not reply to this email.</p>
//             <p style="margin: 0;">© ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
//         </div>
//     </div>
// </body>
// </html>`
//   );
//   return {
//     message: "Reset password link sent via your email successfully",
//     resetPassLink,
//   };
// };

// verify otp
const verifyOtp = async (otp: string) => {
  const userData = await prisma.user.findFirst({
    where: {
      AND: [
        {
          otp: otp,
        },
      ],
    },
  });

  if (!userData) {
    throw new ApiError(404, "Your otp is incorrect");
  }

  if (userData.otpExpiry && userData.otpExpiry < new Date()) {
    throw new ApiError(400, "Your otp has been expired");
  }

  const accessToken = jwtHelpers.generateToken(
    {
      id: userData.id,
      email: userData.email,
      role: userData.role,
    },
    config.jwt.reset_pass_secret as Secret,
    config.jwt.reset_pass_token_expires_in as string
  );

  const refreshToken = jwtHelpers.generateToken(
    {
      id: userData.id,
      email: userData.email,
      role: userData.role,
    },
    config.jwt.refresh_token_secret as Secret,
    config.jwt.refresh_token_expires_in as string
  );

  await prisma.user.update({
    where: {
      id: userData.id,
    },
    data: {
      otp: null,
      otpExpiry: null,
      identifier: null,
    },
  });

  const result = {
    accessToken,
    refreshToken,
  };

  return result;
};

// reset password
const resetPassword = async (
  token: string,
  payload: { id: string; password: string; confirmPassword: string }
) => {
  const { id, password, confirmPassword } = payload;

  // Step 1: Check if passwords match
  if (password !== confirmPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Passwords do not match");
  }

  // Step 2: Get user
  const userData = await prisma.user.findUnique({
    where: { id },
  });

  if (!userData) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Step 3: Verify token
  let decodedToken;
  try {
    decodedToken = jwtHelpers.verifyToken(
      token,
      config.jwt.reset_pass_secret as Secret
    );
  } catch (error) {
    throw new ApiError(httpStatus.FORBIDDEN, "Invalid or expired token");
  }

  // Optional: Check if token payload matches user ID
  if (decodedToken.id !== id) {
    throw new ApiError(httpStatus.FORBIDDEN, "Token does not match user");
  }

  // Step 4: Hash the new password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Step 5: Update the user's password
  await prisma.user.update({
    where: { id },
    data: {
      password: hashedPassword,
      otp: null,
      otpExpiry: null,
    },
  });

  return { message: "Password reset successfully" };
};

export const AuthServices = {
  loginUser,
  socialLogin,
  loginWebsite,
  refreshToken,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
