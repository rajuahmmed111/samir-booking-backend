import * as bcrypt from "bcrypt";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { IPaginationOptions } from "../../../interfaces/paginations";
import {
  IFilterRequest,
  IProfileImageResponse,
  IUpdateUser,
  SafeUser,
} from "./user.interface";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { searchableFields } from "./user.constant";
import { IGenericResponse } from "../../../interfaces/common";
import { IUploadedFile } from "../../../interfaces/file";
import { uploadFile } from "../../../helpars/fileUploader";
import { Request } from "express";
import { getDateRange } from "../../../helpars/filterByDate";
import emailSender from "../../../helpars/emailSender";
import { createOtpEmailTemplate } from "../../../utils/createOtpEmailTemplate";

// create user
const createUser = async (
  payload: any,
  passportFiles?: Express.Multer.File[],
) => {
  // check if email exists
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User already exists");
  }

  // hash password
  const hashedPassword = await bcrypt.hash(payload.password, 12);

  // upload passport/NID files to cloudinary
  const passportOrNIDUrls: string[] = [];
  if (passportFiles && passportFiles.length > 0) {
    for (const file of passportFiles) {
      const uploaded = await uploadFile.uploadToCloudinary(file);
      if (uploaded?.secure_url) {
        passportOrNIDUrls.push(uploaded.secure_url);
      }
    }
  }

  const userData = {
    ...payload,
    password: hashedPassword,
    passportOrNID: passportOrNIDUrls,
  };

  if (payload.location && !payload.address) {
    userData.address = payload.location;
    delete userData.location;
  } else if (payload.location) {
    delete userData.location;
  }

  // create user
  const user = await prisma.user.create({
    data: userData,
  });

  return user;
};

// create SERVICE_PROVIDER (it's inactive, because it's not verified)
const createServiceProvider = async (
  payload: any,
  passportFiles?: Express.Multer.File[],
  profileImageFile?: Express.Multer.File,
) => {
  // check if email exists
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User already exists");
  }

  // validate required files
  if (!profileImageFile) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Profile image is required");
  }

  if (!passportFiles || passportFiles.length === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Passport/NID documents are required",
    );
  }

  // hash password
  const hashedPassword = await bcrypt.hash(payload.password, 12);

  // upload passport/NID files to cloudinary
  const passportOrNIDUrls: string[] = [];
  if (passportFiles && passportFiles.length > 0) {
    for (const file of passportFiles) {
      const uploaded = await uploadFile.uploadToCloudinary(file);
      if (uploaded?.secure_url) {
        passportOrNIDUrls.push(uploaded.secure_url);
      }
    }
  }

  // upload profile image
  let profileImageUrl = "";
  if (profileImageFile) {
    const uploadedProfile =
      await uploadFile.uploadToCloudinary(profileImageFile);
    if (uploadedProfile?.secure_url) {
      profileImageUrl = uploadedProfile.secure_url;
    }
  }

  const userData = {
    ...payload,
    password: hashedPassword,
    passportOrNID: passportOrNIDUrls,
    profileImage: profileImageUrl,
    role: UserRole.SERVICE_PROVIDER,
    status: UserStatus.INACTIVE,
  };

  // create user
  const user = await prisma.user.create({
    data: userData,
  });

  return user;
};

// create role for supper admin
const createRoleSupperAdmin = async (payload: any) => {
  // check if email exists
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email, status: UserStatus.ACTIVE },
  });
  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User already exists");
  }

  // hash password
  const hashedPassword = await bcrypt.hash(payload.password, 12);

  const user = await prisma.user.create({
    data: {
      ...payload,
      password: hashedPassword,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
};

// verify otp and create user
const verifyOtpAndCreateUser = async (email: string, otp: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.otp !== otp) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid OTP");
  }

  // OTP expired check
  if (!user.otpExpiry || user.otpExpiry < new Date()) {
    // delete user if expired
    await prisma.user.delete({ where: { id: user.id } });
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "OTP has expired, please register again",
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      otp: null,
      otpExpiry: null,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      isEmailVerified: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

// get all users (but last i change this api . all users, property owners, service providers)
const getAllUsers = async (
  params: IFilterRequest,
  options: IPaginationOptions,
): Promise<IGenericResponse<SafeUser[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, timeRange, ...filterData } = params;

  const filters: Prisma.UserWhereInput[] = [];

  // Filter for active users and role USER only
  // filters.push({
  //   role: UserRole.USER,
  //   status: UserStatus.ACTIVE,
  // });

  // text search
  if (params?.searchTerm) {
    filters.push({
      OR: searchableFields.map((field) => ({
        [field]: {
          contains: params.searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  // Exact search filter
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  // timeRange filter
  if (timeRange) {
    const dateRange = getDateRange(timeRange);
    if (dateRange) {
      filters.push({
        createdAt: dateRange,
      });
    }
  }

  const where: Prisma.UserWhereInput = { AND: filters };

  const result = await prisma.user.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? {
            [options.sortBy]: options.sortOrder,
          }
        : {
            createdAt: "desc",
          },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const total = await prisma.user.count({ where });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

// get all property owners
const getAllPropertyOwners = async (
  params: IFilterRequest,
  options: IPaginationOptions,
): Promise<IGenericResponse<SafeUser[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, timeRange, ...filterData } = params;

  const filters: Prisma.UserWhereInput[] = [];

  // Filter for active users and role PROPERTY_OWNER only
  filters.push({
    role: UserRole.PROPERTY_OWNER,
    status: UserStatus.ACTIVE,
  });

  // text search
  if (params?.searchTerm) {
    filters.push({
      OR: searchableFields.map((field) => ({
        [field]: {
          contains: params.searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  // Exact search filter
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  // timeRange filter
  if (timeRange) {
    const dateRange = getDateRange(timeRange);
    if (dateRange) {
      filters.push({
        createdAt: dateRange,
      });
    }
  }

  const where: Prisma.UserWhereInput = { AND: filters };

  const result = await prisma.user.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? {
            [options.sortBy]: options.sortOrder,
          }
        : {
            createdAt: "desc",
          },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const businessPartnerIds = result.map((partner) => partner.id);

  const serviceFeeByPartner = await prisma.payment.groupBy({
    by: ["partnerId"],
    where: {
      partnerId: {
        in: businessPartnerIds,
      },
      isDeleted: false,
    },
  });

  // add totalServiceFee
  const usersWithServiceFee = result.map((user) => ({
    ...user,
  }));

  const total = await prisma.user.count({ where });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: usersWithServiceFee,
  };
};

// get all blocked users
const getAllBlockedUsers = async (
  params: IFilterRequest,
  options: IPaginationOptions,
): Promise<IGenericResponse<SafeUser[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, timeRange, ...filterData } = params;

  const filters: Prisma.UserWhereInput[] = [];

  // Filter for INACTIVE users
  filters.push({
    status: UserStatus.INACTIVE,
  });

  // text search
  if (params?.searchTerm) {
    filters.push({
      OR: searchableFields.map((field) => ({
        [field]: {
          contains: params.searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  // Exact search filter
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  // timeRange filter
  if (timeRange) {
    const dateRange = getDateRange(timeRange);
    if (dateRange) {
      filters.push({
        createdAt: dateRange,
      });
    }
  }

  const where: Prisma.UserWhereInput = { AND: filters };

  const result = await prisma.user.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? {
            [options.sortBy]: options.sortOrder,
          }
        : {
            createdAt: "desc",
          },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const businessPartnerIds = result.map((partner) => partner.id);

  const serviceFeeByPartner = await prisma.payment.groupBy({
    by: ["partnerId"],
    where: {
      partnerId: {
        in: businessPartnerIds,
      },
      isDeleted: false,
    },
  });

  // add totalServiceFee
  const usersWithServiceFee = result.map((user) => ({
    ...user,
  }));

  const total = await prisma.user.count({ where });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: usersWithServiceFee,
  };
};

// update  user status access admin (active to inactive)
const updateUserStatusActiveToInActive = async (id: string) => {
  // find user
  const user = await prisma.user.findUnique({
    where: { id, status: UserStatus.ACTIVE },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }

  const result = await prisma.user.update({
    where: {
      id,
    },
    data: {
      status: UserStatus.INACTIVE,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return result;
};

// update  user status access admin (inactive to active)
const updateUserStatusInActiveToActive = async (id: string) => {
  // find user
  const user = await prisma.user.findUnique({
    where: { id, status: UserStatus.INACTIVE },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }

  const result = await prisma.user.update({
    where: {
      id,
    },
    data: {
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return result;
};

// get user by id
const getUserById = async (id: string): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      isStripeConnected: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  return user;
};

// get all admin
const getAllAdmins = async () => {
  const result = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return result;
};

// update user (info + profile image)
const updateUser = async (
  id: string,
  updates: IUpdateUser,
  file?: IUploadedFile,
): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id, status: UserStatus.ACTIVE },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // profile image upload if provided
  let profileImageUrl = user.profileImage;
  if (file) {
    const cloudinaryResponse = await uploadFile.uploadToCloudinary(file);
    profileImageUrl = cloudinaryResponse?.secure_url!;
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...updates,
      profileImage: profileImageUrl,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      fcmToken: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

// get my profile
const getMyProfile = async (id: string) => {
  const user = await prisma.user.findFirst({
    where: { id, status: UserStatus.ACTIVE },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      isStripeConnected: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};

// update user profile image
const updateUserProfileImage = async (
  id: string,
  req: Request,
): Promise<IProfileImageResponse> => {
  console.log(req.file, "req.file in user service");
  const userInfo = await prisma.user.findUnique({
    where: { id, status: UserStatus.ACTIVE },
  });
  if (!userInfo) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const file = req.file as IUploadedFile;
  if (file) {
    const cloudinaryResponse = await uploadFile.uploadToCloudinary(file);
    req.body.profilePhoto = cloudinaryResponse?.secure_url;
  }

  const profileInfo = await prisma.user.update({
    where: {
      email: userInfo.email,
    },
    data: { profileImage: req.body.profilePhoto },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
    },
  });
  return profileInfo;
};

// delete my account
const deleteMyAccount = async (userId: string) => {
  const result = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });

  if (!result) {
    throw new Error("User not found");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.INACTIVE },
  });
};

// delete user access admin
const deleteUserAccessAdmin = async (userId: string) => {
  // check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!existingUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  await prisma.user.delete({
    where: { id: existingUser.id },
  });
};

export const UserService = {
  createUser,
  createServiceProvider,
  createRoleSupperAdmin,
  verifyOtpAndCreateUser,
  getAllPropertyOwners,
  getAllBlockedUsers,
  getAllUsers,
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
