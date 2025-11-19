import { Currency, ValidityType } from "@prisma/client";

export interface ICreateSubscription {
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
