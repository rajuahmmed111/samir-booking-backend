import { UserRole, UserStatus } from "@prisma/client";

export type TUser = {
  fullName?: string;
  email: string;
  password: string;
  profileImage?: string;
  contactNumber?: string;
  address?: string;
  country?: string;
  role: UserRole;
  status: UserStatus;
};

export type IUpdateUser = {
  fullName?: string;
  email?: string;
  contactNumber?: string;
  address?: string;
  country?: string;
  profileImage?: string;
};

export type IFilterRequest = {
  searchTerm?: string | undefined;
  fullName?: string | undefined;
  email?: string | undefined;
  contactNumber?: string | undefined;
  country?: string | undefined;
  status?: string | undefined;
  timeRange?: string | undefined;
};

export type SafeUser = {
  id: string;
  fullName: string | null;
  email: string;
  profileImage: string;
  // passportOrNID?: string[];
  contactNumber: string | null;
  address: string | null;
  country: string | null;
  role: UserRole;
  fcmToken?: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type IProfileImageResponse = {
  id: string;
  fullName: string | null;
  email: string;
  profileImage: string | null;
};
