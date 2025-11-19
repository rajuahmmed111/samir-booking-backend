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
import { contractRoutes } from "../modules/Contracts/contract.route";
import { messageRoutes } from "../modules/Message/message.route";
import { phoneRoute } from "../modules/Setting/PhoneNumberVerify/phone.route";
import { paymentRoutes } from "../modules/Payment/payment.route";
import { financeRoutes } from "../modules/Finances/finance.route";
import { statisticsRoutes } from "../modules/Statistics/statistics.route";
import { supportRoutes } from "../modules/Support/support.route";
import { faqRoutes } from "../modules/Faq/faq.routre";
import { humanRightRoute } from "../modules/Human_Rights/humanRight.route";
import { cancelReservationRoute } from "../modules/Cancel_Reservation/cancel_reservation.route";
import { refundPolicyRoute } from "../modules/Refund_Policy/refund_policy.route";
import { newsRoomRoute } from "../modules/NewsRoom/news_room.route";
import { advertisingRoutes } from "../modules/Advertise/advertising.route";
import { investorRelationsRoutes } from "../modules/Investor_Relations/investor.route";
// import { rewardsRoute } from "../modules/Fasify_Rewards/rewards.route";

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
    path: "/reviews",
    route: reviewRoute,
  },
  {
    path: "/hotel-booking",
    route: hotelBookingRoute,
  },
  {
    path: "/contracts",
    route: contractRoutes,
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
    path: "/news-rooms",
    route: newsRoomRoute,
  },
  {
    path: "/human-rights",
    route: humanRightRoute,
  },
  {
    path: "/cancel-reservations",
    route: cancelReservationRoute,
  },
  {
    path: "/refund-policies",
    route: refundPolicyRoute,
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
    path: "/investor-relations",
    route: investorRelationsRoutes,
  },
  {
    path: "/advertises",
    route: advertisingRoutes,
  },
  // {
  //   path: "/rewards",
  //   route: rewardsRoute,
  // },
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
    path: "/payments",
    route: paymentRoutes,
  },
  {
    path: "/finances",
    route: financeRoutes,
  },
  {
    path: "/statistics",
    route: statisticsRoutes,
  },
  {
    path: "/supports",
    route: supportRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
