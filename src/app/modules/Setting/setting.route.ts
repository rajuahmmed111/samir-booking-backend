import express from "express";
import { SettingController } from "./setting.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { settingValidation } from "./setting.validation";

const router = express.Router();

// get about App
router.get(
  "/about",
  auth(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.PROPERTY_OWNER,
    UserRole.SERVICE_PROVIDER,
    UserRole.USER
  ),
  SettingController.getAbout
);

// get customer contact info
router.get(
  "/customer-contact",
  auth(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.PROPERTY_OWNER,
    UserRole.SERVICE_PROVIDER,
    UserRole.USER
  ),
  SettingController.getCustomerContactInfo
);

//  create app about
router.post(
  "/about",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  SettingController.createOrUpdateAbout
);

// create customer contact info
router.post(
  "/customer-contact",
  // auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  // validateRequest(settingValidation.customerContactInfo),
  SettingController.createCustomerContactInfo
);

// updateNotificationSettings only for admin
router.patch(
  "/notification-settings",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  SettingController.updateNotificationSettings
);
export const settingRoute = router;
