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
