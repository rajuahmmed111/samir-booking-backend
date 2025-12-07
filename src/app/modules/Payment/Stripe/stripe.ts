import { PaymentStatus } from "@prisma/client";
import prisma from "../../../../shared/prisma";

export const mapStripeStatusToPaymentStatus = (
  stripeStatus: string
): PaymentStatus => {
  switch (stripeStatus) {
    case "unpaid":
      return PaymentStatus.UNPAID;
    case "paid":
      return PaymentStatus.PAID;
    case "no_payment_required":
      return PaymentStatus.PAID;
    case "refunded":
    case "partially_refunded":
      return PaymentStatus.REFUNDED;
    default:
      return PaymentStatus.UNPAID;
  }
};

export type ServiceType = "HOTEL" | "SERVICE";

// https://243102737055.signin.aws.amazon.com/console
// Raju

// ytZ9W_RU

// raju@2025#
