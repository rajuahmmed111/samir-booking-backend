import axios from "axios";
import ical from "node-ical";
import prisma from "../../../shared/prisma";
import { BookingSource, BookingStatus } from "@prisma/client";

export const syncAirbnbBookedCalendar = async () => {
  //  get all hotels that should sync with Airbnb
  const hotels = await prisma.hotel.findMany({
    where: {
      syncWithAirbnb: true,
      airbnbIcalUrl: { not: null },
    },
    select: {
      id: true,
      partnerId: true,
      airbnbIcalUrl: true,
    },
  });

  for (const hotel of hotels) {
    try {
      const response = await axios.get(hotel.airbnbIcalUrl!);
      const events = ical.parseICS(response.data);

      for (const event of Object.values(events)) {
        if (event.type !== "VEVENT") continue;

        // skip invalid dates
        if (!event.start || !event.end) continue;

        // default values for missing fields
        const bookedFromDate = event.start.toISOString().split("T")[0];
        const bookedToDate = event.end.toISOString().split("T")[0];

        // loop prevention:
        // only accept real Airbnb reservation events
        if (
          !event.uid ||
          !event.uid.includes("@airbnb.com") ||
          !event.summary ||
          !event.summary.toLowerCase().includes("reserved")
        ) {
          continue;
        }

        // check if booking already exist
        const existingBooking = await prisma.hotel_Booking.findUnique({
          where: {
            externalBookingId: event.uid,
          },
        });

        // handle cancellation
        if (event.status === "CANCELLED" && existingBooking) {
          await prisma.hotel_Booking.update({
            where: { id: existingBooking.id },
            data: {
              bookingStatus: BookingStatus.CANCELLED,
            },
          });
          continue;
        }

        // create new (airbnb) booking if not exists
        if (!existingBooking) {
          await prisma.hotel_Booking.create({
            data: {
              hotelId: hotel.id,
              partnerId: hotel.partnerId!,
              externalBookingId: event.uid,
              bookingStatus: BookingStatus.CONFIRMED,
              bookingSource: BookingSource.AIRBNB,
              bookedFromDate,
              bookedToDate,
              personOfGuests: 1, // iCal does not provide guest count (but my website this field required)
              totalPrice: 0, // iCal does not provide price (but my website this field required)
            },
          });
        }
      }
    } catch (err) {
      console.error(`Failed to sync hotel ${hotel.id}:`, err);
    }
  }
};
