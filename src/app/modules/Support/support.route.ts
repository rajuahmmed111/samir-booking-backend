import express from "express";
import { SupportController } from "./support.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// get all support
router.get(
  "/",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  SupportController.getAllSupport
);

// create support
router.post(
  "/",
  auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
  SupportController.createSupport
);

// get my support
router.get(
  "/my-support",
  auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
  SupportController.getMySupport
);

// get support by id
router.get(
  "/:id",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.USER,
    UserRole.BUSINESS_PARTNER
  ),
  SupportController.getSupportById
);

// update my support
router.patch(
  "/update-my-support/:supportId",
  auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
  SupportController.updateMySupport
);

// delete my support
router.delete(
  "/delete-my-support/:supportId",
  auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
  SupportController.deleteMySupport
);

// update support status
router.patch(
  "/update-support-status/:supportId",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  SupportController.updateSupportStatus
);

export const supportRoutes = router;
