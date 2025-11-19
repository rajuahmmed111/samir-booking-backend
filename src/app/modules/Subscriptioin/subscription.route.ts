import { Router } from "express";
import subscriptionController from "./subscription.controller";
import SubscriptionValidationZodSchema from "./subscription.validation";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";

const router = Router();

// create subscription
router.post(
  "/create",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  validateRequest(SubscriptionValidationZodSchema.createSubscriptionZodSchema),
  subscriptionController.createSubscription
);

// get all subscriptions
router.get(
  "/retrieve/search",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  subscriptionController.getSubscriptions
);

// get single subscription
router.get(
  "/retrieve/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  subscriptionController.getSpecificSubscriptionById
);

// update subscription
router.patch(
  "/update/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  subscriptionController.updateSpecificSubscription
);

// delete subscription
router.delete(
  "/delete/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  subscriptionController.deleteSpecificSubscription
);

export const subscriptionRoutes = router;
