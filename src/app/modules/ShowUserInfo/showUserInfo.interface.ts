export type IShowUserInfoFilterRequest = {
  searchTerm?: string | undefined;
  isShow?: boolean | undefined;
};

export type IUserFilterRequest = {
  searchTerm?: string | undefined;
  fullName?: string | undefined;
  serviceType?: string | undefined;
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
  profileImage: string;
  passportOrNID?: string[];
  contactNumber: string | null;
  address: string | null;
  country: string | null;
  createdAt: Date;
  updatedAt: Date;
  averageServiceRating?: number | null;
  services?: {
    id: string;
    serviceType: string;
    serviceRating: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
};
