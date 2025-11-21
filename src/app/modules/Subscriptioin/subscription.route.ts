import express from "express";
import SubscriptionValidationZodSchema from "./subscription.validation";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { SubscriptionController } from "./subscription.controller";

const router = express.Router();

// ----------------------------subscription plan--------------------------------

// create subscription plan
router.post(
  "/plan/create",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  validateRequest(SubscriptionValidationZodSchema.createSubscriptionZodSchema),
  SubscriptionController.createSubscriptionPlan
);

// get all subscriptions plan
router.get(
  "/plan/retrieve/search",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  SubscriptionController.getAllSubscriptionsPlan
);

// get single subscription plan
router.get(
  "/plan/retrieve/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  SubscriptionController.getSpecificSubscriptionPlan
);

// update subscription plan
router.patch(
  "/plan/update/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  SubscriptionController.updateSpecificSubscriptionPlan
);

// delete subscription plan
router.delete(
  "/plan/delete/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  SubscriptionController.deleteSpecificSubscriptionPlan
);

// ----------------------------subscription--------------------------------
router.post(
  "/create",
  auth(UserRole.USER),
  SubscriptionController.createSubscription
);

// create checkout session for subscription
router.post(
  "/checkout",
  auth(UserRole.USER),
  SubscriptionController.createCheckoutSession
);

router.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  SubscriptionController.handleStripeWebhook
);

export const subscriptionRoutes = router;
