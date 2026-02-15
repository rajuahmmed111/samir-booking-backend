import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { UserService } from "./user.service";
import { pick } from "../../../shared/pick";
import { filterField } from "./user.constant";
import { paginationFields } from "../../../constants/pagination";
import { IUploadedFile } from "../../../interfaces/file";

// create user
const createUser = catchAsync(async (req: Request, res: Response) => {
  const userData = req.body;
  const passportFiles = req.files as Express.Multer.File[];

  const result = await UserService.createUser(userData, passportFiles);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User created successfully",
    data: result,
  });
});

// create role for supper admin
const createRoleSupperAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const userData = req.body;
    const result = await UserService.createRoleSupperAdmin(userData);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "OTP generated and sent to email successfully",
      data: result,
    });
  },
);

// verify user
const verifyOtpAndCreateUser = catchAsync(
  async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    const result = await UserService.verifyOtpAndCreateUser(email, otp);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User verified successfully",
      data: result,
    });
  },
);

// get all users
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await UserService.getAllUsers(filter, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users fetched successfully",
    data: result,
  });
});

// get all property owners
const getAllPropertyOwners = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await UserService.getAllPropertyOwners(filter, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property Owners fetched successfully",
    data: result,
  });
});


// get all blocked users
const getAllBlockedUsers = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await UserService.getAllBlockedUsers(filter, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Business Partners fetched successfully",
    data: result,
  });
});

// update  user status access admin (active to inactive)
const updateUserStatusActiveToInActive = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await UserService.updateUserStatusActiveToInActive(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Admin status updated successfully",
      data: result,
    });
  },
);

// update  user status access admin (inactive to active)
const updateUserStatusInActiveToActive = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await UserService.updateUserStatusInActiveToActive(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Admin status updated successfully",
      data: result,
    });
  },
);

// get user by id
const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await UserService.getUserById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User fetched successfully",
    data: { ...user, password: undefined },
  });
});

// get all admins
const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await UserService.getAllAdmins();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admins fetched successfully",
    data: result,
  });
});

// update user (info + profile image)
const updateUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const data = req.body;
  const file = req.file as IUploadedFile | undefined;

  const result = await UserService.updateUser(userId, data, file);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User profile updated successfully",
    data: result,
  });
});

// get my profile
const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.user;

  const result = await UserService.getMyProfile(id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "My profile retrieved successfully",
    data: result,
  });
});

// update my  profile image
const updateUserProfileImage = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.user;
    const result = await UserService.updateUserProfileImage(id, req);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "My profile image updated successfully",
      data: result,
    });
  },
);

// delete my account
const deleteMyAccount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await UserService.deleteMyAccount(userId);

  // clear the token cookie
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My account deleted successfully",
    data: result,
  });
});

// delete user access admin
const deleteUserAccessAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.params.id;

    await UserService.deleteUserAccessAdmin(userId);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Admin deleted successfully",
      data: undefined,
    });
  },
);

export const UserController = {
  createUser,
  createRoleSupperAdmin,
  verifyOtpAndCreateUser,
  getAllUsers,
  getAllPropertyOwners,
  getAllBlockedUsers,
  updateUserStatusActiveToInActive,
  updateUserStatusInActiveToActive,
  getUserById,
  getAllAdmins,
  updateUser,
  getMyProfile,
  updateUserProfileImage,
  deleteMyAccount,
  deleteUserAccessAdmin,
};
