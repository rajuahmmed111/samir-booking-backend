import {
  BookingStatus,
  EveryServiceStatus,
  PaymentStatus,
} from "@prisma/client";
import cron from "node-cron";
import dayjs from "dayjs";
import prisma from "../../shared/prisma";
import { subMinutes } from "date-fns";
import stripe from "../../helpars/stripe";

// Helper function for date check
const isPastDate = (date: string) => {
  return dayjs(date).isBefore(dayjs(), "day"); // check if the date is before the current date
};

export const changeExpiryBookingStatus = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("Running daily subscription expiry check...");

    const now = new Date();

    // Find expired subscriptions
    const expired = await prisma.purchase_subscription.findMany({
      where: {
        endDate: { lt: now },
        status: "ACTIVE",
      },
    });

    for (const sub of expired) {
      // Set subscription INACTIVE
      await prisma.purchase_subscription.update({
        where: { id: sub.id },
        data: { status: "INACTIVE" },
      });

      // Set user unsubscribed
      await prisma.user.update({
        where: { id: sub.userId },
        data: { isSubscribed: false },
      });

      console.log("Expired subscription updated:", sub.id);
    }
  });

  // for hotel
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Booking status update job running...");

    // hotel bookings
    const expiredHotels = await prisma.hotel_Booking.findMany({
      where: { bookingStatus: BookingStatus.CONFIRMED },
    });

    for (const booking of expiredHotels) {
      if (isPastDate(booking.bookedToDate)) {
        await prisma.hotel_Booking.update({
          where: { id: booking.id },
          data: { bookingStatus: BookingStatus.COMPLETED },
        });

        if (booking?.hotelId) {
          await prisma.hotel.update({
            where: { id: booking.hotelId },
            data: { availableForBooking: EveryServiceStatus.AVAILABLE },
          });
        }
      }
    }

    console.log("All expired bookings marked as COMPLETED");
  });

  // Node-Cron (run every 10 minutes)
  // cron.schedule("*/10 * * * *", async () => {
  //   const expiryTime = subMinutes(new Date(), 10);

  //   // hotel bookings
  //   await prisma.hotel_Booking.updateMany({
  //     where: {
  //       bookingStatus: BookingStatus.PENDING,
  //       createdAt: { lte: expiryTime },
  //     },
  //     data: { bookingStatus: BookingStatus.EXPIRED },
  //   });

  //   // console.log("Expired pending bookings auto-cancelled");
  // });

  // for service
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Booking status update job running...");

    // service bookings
    const expiredServices = await prisma.service_booking.findMany({
      where: { bookingStatus: BookingStatus.CONFIRMED },
    });

    for (const booking of expiredServices) {
      if (isPastDate(booking.date)) {
        await prisma.service_booking.update({
          where: { id: booking.id },
          data: { bookingStatus: BookingStatus.COMPLETED },
        });
      }
    }

    console.log("All expired bookings marked as COMPLETED");
  });

  // run every hour back amount to property owner
  // cron.schedule("0 * * * *", async () => {
  //   console.log("Running auto-refund check...");

  //   const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  //   // find bookings still NEED_ACCEPT older than 24h
  //   const pendingBookings = await prisma.service_booking.findMany({
  //     where: {
  //       bookingStatus: BookingStatus.NEED_ACCEPT,
  //       createdAt: { lt: cutoff },
  //     },
  //     include: { payments: true },
  //   });

  //   for (const booking of pendingBookings) {
  //     const payment = booking.payments.find(
  //       (p) => p.status === PaymentStatus.IN_HOLD,
  //     );
  //     if (!payment || !payment.paymentIntentId) continue;

  //     try {
  //       // cancel payment intent (refund customer)
  //       await stripe.paymentIntents.cancel(payment.paymentIntentId);

  //       // update payment status
  //       await prisma.payment.update({
  //         where: { id: payment.id },
  //         data: { status: PaymentStatus.REFUNDED },
  //       });

  //       // update booking status
  //       await prisma.service_booking.update({
  //         where: { id: booking.id },
  //         data: { bookingStatus: BookingStatus.REJECTED },
  //       });

  //       console.log(`Booking ${booking.id} auto-refunded after 24h`);
  //     } catch (err) {
  //       console.error(`Failed to auto-refund booking ${booking.id}`, err);
  //     }
  //   }
  // });
};
