import { Router } from "express";
import { ShowUserInfoController } from "./showUserInfo.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = Router();

// create show user info for property owner by providerId
router.post(
  "/:providerId",
  auth(UserRole.PROPERTY_OWNER),
  ShowUserInfoController.createShowUserInfo,
);

// update show user info
router.patch(
  "/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  ShowUserInfoController.updateShowUserInfo,
);

// get all service provider for property owner
router.get(
  "/service-providers-for-property-owner",
  auth(UserRole.PROPERTY_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  ShowUserInfoController.getAllServiceProvidersForPropertyOwner,
);

export const showUserInfoRoutes = router;
