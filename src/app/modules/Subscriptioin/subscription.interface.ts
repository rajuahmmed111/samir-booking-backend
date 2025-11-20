import { Currency, ValidityType } from "@prisma/client";

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
