import { Router } from "express";
import subscriptionController from "./subscription.controller";
import SubscriptionValidationZodSchema from "./subscription.validation";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";

const router = Router();

// ----------------------------subscription plan--------------------------------

// create subscription plan
router.post(
  "/plan/create",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  validateRequest(SubscriptionValidationZodSchema.createSubscriptionZodSchema),
  subscriptionController.createSubscriptionPlan
);

// get all subscriptions plan
router.get(
  "/plan/retrieve/search",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  subscriptionController.getAllSubscriptionsPlan
);

// get single subscription plan
router.get(
  "/plan/retrieve/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  subscriptionController.getSpecificSubscriptionPlan
);

// update subscription plan
router.patch(
  "/plan/update/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  subscriptionController.updateSpecificSubscriptionPlan
);

// delete subscription plan
router.delete(
  "/plan/delete/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  subscriptionController.deleteSpecificSubscriptionPlan
);

// ----------------------------subscription--------------------------------

export const subscriptionRoutes = router;
