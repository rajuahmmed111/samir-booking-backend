import express from "express";

import { authRoutes } from "../modules/Auth/auth.routes";
// import { subscriptionRoute } from "../modules/subscriptions/subscriptions.route";
import { userRoute } from "../modules/User/user.route";
import { privacyPolicyRoute } from "../modules/Privacy_Policy/policy.route";
import { hotelRoute } from "../modules/Hotel/hotel.route";
import { reviewRoute } from "../modules/Review/review.route";
import { hotelBookingRoute } from "../modules/HotelBooking/hotelBooking.route";
import { notificationsRoute } from "../modules/Notification/notification.route";
import { settingRoute } from "../modules/Setting/setting.route";
import { termsConditionRoute } from "../modules/Terms_Condition/terms.route";
import { messageRoutes } from "../modules/Message/message.route";
import { phoneRoute } from "../modules/Setting/PhoneNumberVerify/phone.route";
import { paymentRoutes } from "../modules/Payment/payment.route";
import { statisticsRoutes } from "../modules/Statistics/statistics.route";
import { faqRoutes } from "../modules/Faq/faq.routre";
import { subscriptionRoutes } from "../modules/Subscriptioin/subscription.route";
import { serviceRoutes } from "../modules/Service/service.route";
import { serviceBookingRoute } from "../modules/Service_Booking/serviceBooking.route";
import { supportRoutes } from "../modules/Support/support.route";
import { startingEndingProofVideoRoutes } from "../modules/Record_Proof_Video/recordProofVideo.route";
import { inventoryRoutes } from "../modules/Inventory/inventory.route";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRoute,
  },
  {
    path: "/auth",
    route: authRoutes,
  },
  {
    path: "/hotels",
    route: hotelRoute,
  },
  {
    path: "/inventory",
    route: inventoryRoutes,
  },

  {
    path: "/hotel-booking",
    route: hotelBookingRoute,
  },

  {
    path: "/services",
    route: serviceRoutes,
  },
  {
    path: "/record-proof-video",
    route: startingEndingProofVideoRoutes,
  },
  {
    path: "/service-booking",
    route: serviceBookingRoute,
  },

  {
    path: "/reviews",
    route: reviewRoute,
  },

  {
    path: "/notifications",
    route: notificationsRoute,
  },
  {
    path: "/faqs",
    route: faqRoutes,
  },

  {
    path: "/terms-conditions",
    route: termsConditionRoute,
  },
  {
    path: "/policy",
    route: privacyPolicyRoute,
  },

  {
    path: "/settings",
    route: settingRoute,
  },
  {
    path: "/phone",
    route: phoneRoute,
  },
  {
    path: "/messages",
    route: messageRoutes,
  },
  {
    path: "/subscriptions",
    route: subscriptionRoutes,
  },
  {
    path: "/payments",
    route: paymentRoutes,
  },
  {
    path: "/statistics",
    route: statisticsRoutes,
  },
  {
    path: "/reports",
    route: supportRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
