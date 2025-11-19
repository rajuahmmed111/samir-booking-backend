import express from "express";
import { RefundPolicyController } from "./refund_policy.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// create or update refund_policy
router.patch(
  "/",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  RefundPolicyController.createOrUpdateRefundPolicy
);

// get all refund_policy
router.get(
  "/",
//   auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  RefundPolicyController.getAllRefundPolicy
);

export const refundPolicyRoute = router;
