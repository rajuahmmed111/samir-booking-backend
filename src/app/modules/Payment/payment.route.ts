import express from "express";
import { PaymentController } from "./payment.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// ------------------------------stripe routes-----------------------------
// stripe account onboarding
router.post(
  "/stripe-account-onboarding",
  auth(UserRole.USER, UserRole.PROPERTY_OWNER, UserRole.SERVICE_PROVIDER),
  PaymentController.stripeAccountOnboarding
);

// checkout session on stripe
router.post(
  "/create-stripe-checkout-session/:serviceType/:bookingId",
  auth(UserRole.USER, UserRole.PROPERTY_OWNER, UserRole.SERVICE_PROVIDER),
  PaymentController.createStripeCheckoutSession
);

// stripe webhook payment
router.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }), // important: keep raw body
  PaymentController.stripeHandleWebhook
);

// cancel booking stripe
router.post(
  "/stripe-cancel-booking/:serviceType/:bookingId",
  auth(UserRole.USER, UserRole.PROPERTY_OWNER, UserRole.SERVICE_PROVIDER),
  PaymentController.cancelStripeBooking
);

// get my all my transactions
router.get(
  "/my-orders",
  auth(UserRole.USER, UserRole.PROPERTY_OWNER, UserRole.SERVICE_PROVIDER),
  PaymentController.getMyTransactions
);

export const paymentRoutes = router;
