import { BookingStatus, EveryServiceStatus } from "@prisma/client";
import cron from "node-cron";
import dayjs from "dayjs";
import prisma from "../../shared/prisma";
import { subMinutes } from "date-fns";

// Helper function for date check
const isPastDate = (date: string) => {
  return dayjs(date).isBefore(dayjs(), "day"); // Check if the date is before the current date
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
};

export const changeExpiryBookingStatusForCancel = () => {
  // Node-Cron (run every 10 minutes)
  cron.schedule("*/10 * * * *", async () => {
    const expiryTime = subMinutes(new Date(), 10);

    // hotel bookings
    await prisma.hotel_Booking.updateMany({
      where: {
        bookingStatus: BookingStatus.PENDING,
        createdAt: { lte: expiryTime },
      },
      data: { bookingStatus: BookingStatus.EXPIRED },
    });

    // console.log("Expired pending bookings auto-cancelled");
  });
};
