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

// create user report
router.post(
  "/",
  auth(
    UserRole.USER,
    UserRole.PROPERTY_OWNER,
    UserRole.SERVICE_PROVIDER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN
  ),
  SupportController.createUserReport
);

// get my support
router.get(
  "/my-support",
  auth(
    UserRole.USER,
    UserRole.PROPERTY_OWNER,
    UserRole.SERVICE_PROVIDER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN
  ),
  SupportController.getMySupport
);

// get support by id
router.get(
  "/:id",
  auth(
    UserRole.USER,
    UserRole.PROPERTY_OWNER,
    UserRole.SERVICE_PROVIDER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN
  ),
  SupportController.getSupportById
);

// update my support
router.patch(
  "/update-my-support/:supportId",
  auth(
    UserRole.USER,
    UserRole.PROPERTY_OWNER,
    UserRole.SERVICE_PROVIDER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN
  ),
  SupportController.updateMySupport
);

// delete my support
router.delete(
  "/delete-my-support/:supportId",
  auth(
    UserRole.USER,
    UserRole.PROPERTY_OWNER,
    UserRole.SERVICE_PROVIDER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN
  ),
  SupportController.deleteMySupport
);

export const supportRoutes = router;
