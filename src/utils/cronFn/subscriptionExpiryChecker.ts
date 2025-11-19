// import cron from "node-cron";
// import prisma from "../../shared/prisma";
// import { Plan, SubscriptionStatus } from "@prisma/client";

// // run the job every day at 1am
// export const startSubscriptionExpiryChecker = () => {
//   cron.schedule("0 1 * * *", async () => {
//     console.log("🔄 Running subscription expiry checker...");

//     try {
//       const now = new Date();

//       const expiredSubscriptions = await prisma.subscription.findMany({
//         where: {
//           endDate: { lt: now },
//           status: SubscriptionStatus.ACTIVE,
//         },
//         include: {
//           user: true,
//         },
//       });

//       for (const sub of expiredSubscriptions) {
//         await prisma.subscription.update({
//           where: { id: sub.id },
//           data: {
//             status: SubscriptionStatus.EXPIRED,
//           },
//         });

//         if (sub.user?.id) {
//           await prisma.user.update({
//             where: { id: sub.user.id },
//             data: {
//               isSubscribe: false,
//               plan: Plan.DEFAULT,
//             },
//           });
//         }

//         console.log(`Marked subscription ${sub.id} as EXPIRED`);
//       }

//       console.log(`🎯 Total expired updated: ${expiredSubscriptions.length}`);
//     } catch (error) {
//       console.error("Subscription expiry job failed:", error);
//     }
//   });
// };
