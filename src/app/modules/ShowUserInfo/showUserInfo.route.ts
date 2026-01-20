import { Router } from "express";
import { ShowUserInfoController } from "./showUserInfo.controller";
import validateRequest from "../../middlewares/validateRequest";
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

export const showUserInfoRoutes = router;
