import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { TermsController } from "./terms.controller";
import { termsConditionValidation } from "./terms.validation";

const router = express.Router();

// get terms and conditions
router.get(
  "/",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.USER,
    UserRole.BUSINESS_PARTNER
  ),
  TermsController.getTerms
);

// create terms and conditions
router.post(
  "/",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(termsConditionValidation.termsConditionSchema),
  TermsController.createTerms
);

// get single terms and conditions
router.get(
  "/:id",
    auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.USER,
    UserRole.BUSINESS_PARTNER
  ),
  TermsController.getSingleTerms
);

router.patch(
  "/update/:id",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(termsConditionValidation.updateTermsConditionSchema),
  TermsController.updateTerms
);

export const termsConditionRoute = router;
