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

// get all show user info
router.get(
  "/",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  ShowUserInfoController.getAllShowUserInfo,
);

export const showUserInfoRoutes = router;
