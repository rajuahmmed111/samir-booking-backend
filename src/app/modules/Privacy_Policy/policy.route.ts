import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { PrivacyController } from "./policy.controller";
import { privacyPolicyValidation } from "./policy.validation";

const router = express.Router();

// get all privacy policy
router.get(
  "/",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.USER,
    UserRole.BUSINESS_PARTNER
  ),
  PrivacyController.getAllPolicy
);

// get privacy policy by id
router.get(
  "/:id",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.USER,
    UserRole.BUSINESS_PARTNER
  ),
  PrivacyController.getSinglePolicy
);

// create privacy policy
router.post(
  "/",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(privacyPolicyValidation.createPrivacyPolicySchema),
  PrivacyController.createPolicy
);

// update privacy policy
router.patch(
  "/update/:id",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(privacyPolicyValidation.updatePrivacyPolicySchema),
  PrivacyController.updatePolicy
);

export const privacyPolicyRoute = router;
