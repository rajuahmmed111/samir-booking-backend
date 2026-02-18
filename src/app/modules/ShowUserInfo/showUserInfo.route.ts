import { Router } from "express";
import { ShowUserInfoController } from "./showUserInfo.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = Router();

// get all service provider for property owner
router.get(
  "/service-providers-for-property-owner",
  auth(UserRole.PROPERTY_OWNER),
  ShowUserInfoController.getAllServiceProvidersForPropertyOwner,
);

export const showUserInfoRoutes = router;
