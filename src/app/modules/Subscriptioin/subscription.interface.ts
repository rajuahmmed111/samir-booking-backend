import { Currency, ValidityType } from "@prisma/client";

export type ISubscriptionFilterRequest = {
  searchTerm?: string | undefined;
  status?: string | undefined;
};

export interface ICreateSubscriptionPlan {
  name: string;
  price: {
    currency: Currency;
    amount: number;
  };
  validity: {
    type: ValidityType;
    value: number;
  };
  features: string[];
}
