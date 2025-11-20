import { Router } from "express";
import subscriptionController from "./subscription.controller";
import SubscriptionValidationZodSchema from "./subscription.validation";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";

const router = Router();

// create subscription plan
router.post(
  "/create",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  validateRequest(SubscriptionValidationZodSchema.createSubscriptionZodSchema),
  subscriptionController.createSubscriptionPlan
);

// get all subscriptions plan
router.get(
  "/retrieve/search",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  subscriptionController.getAllSubscriptionsPlan
);

// get single subscription plan
router.get(
  "/retrieve/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  subscriptionController.getSpecificSubscriptionPlan
);

// update subscription plan
router.patch(
  "/update/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  subscriptionController.updateSpecificSubscriptionPlan
);

// delete subscription plan
router.delete(
  "/delete/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  subscriptionController.deleteSpecificSubscriptionPlan
);

export const subscriptionRoutes = router;
