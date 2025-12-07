import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { PrivacyController } from "./policy.controller";
import { privacyPolicyValidation } from "./policy.validation";

const router = express.Router();

// create or update privacy policy
router.patch(
  "/",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(privacyPolicyValidation.createPrivacyPolicySchema),
  PrivacyController.createOrUpdatePolicy
);

// get all privacy policy
router.get(
  "/",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.USER,
    UserRole.PROPERTY_OWNER,
    UserRole.SERVICE_PROVIDER
  ),
  PrivacyController.getAllPolicy
);

export const privacyPolicyRoute = router;
