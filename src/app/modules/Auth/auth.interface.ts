export type ILoginResponse = {
  accessToken: string;
  refreshToken: string;
  user?: {
    fcmToken?: string | null;
    isHotel?: boolean | null;
    isSecurity?: boolean | null;
    isCar?: boolean | null;
    isAttraction?: boolean | null;
  };
};

export interface ILoginRequest {
  email: string;
  password: string;
  fcmToken?: string;
  role: string;
}

export interface ISignupRequest {
  fullName: string;
  email: string;
  password: string;
  contactNumber: string;
  country: string;
  fcmToken?: string;
  role: string;
}

export interface ISignupResponse {
  accessToken: string;
  refreshToken: string;
  user?: {
    id: string;
    fullName: string | null;
    email: string;
    profileImage: string;
    contactNumber: string | null;
    country: string | null;
    role: string;
    fcmToken?: string | null;
    isHotel?: boolean | null;
    isSecurity?: boolean | null;
    isCar?: boolean | null;
    isAttraction?: boolean | null;
  };
}
