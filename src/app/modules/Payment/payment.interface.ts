export interface IPaymentData {
  paymentMethod: string;
  currency?: string;
}

export interface IFlutterwaveSubAccountData {
  account_bank: string;
  account_number: string;
  business_name: string;
  business_email: string;
  business_contact: string;
  business_contact_mobile: string;
  business_mobile: string;
  country: string;
  meta: {
    userId: string;
  };
}

export interface IFlutterwavePaymentData {
  tx_ref: string;
  amount: number;
  currency: string;
  redirect_url: string;
  customer: {
    email: string;
    phonenumber: string;
    name: string;
  };
  subaccounts: Array<{
    id: string;
    transaction_split_ratio: number;
  }>;
  customizations: {
    title: string;
    description: string;
    logo: string;
  };
}
