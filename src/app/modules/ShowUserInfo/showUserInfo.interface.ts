import { UserRole, UserStatus } from "@prisma/client";

export type IShowUserInfoFilterRequest = {
  searchTerm?: string | undefined;
  isShow?: boolean | undefined;
};

export interface ICreateShowUserInfo {
  providerId: string;
  propertyOwnerId: string;
}

export interface IUpdateShowUserInfo {
  isShow: boolean;
}

export type SafeUserWithShowUserInfo = {
  id: string;
  fullName: string | null;
  email: string;
  profileImage: string;
  passportOrNID?: string[];
  contactNumber: string | null;
  address: string | null;
  country: string | null;
  role: UserRole;
  fcmToken?: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  showUserInfo?: {
    id: string;
    isShow: boolean;
    propertyOwnerId: string;
    providerId: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};
