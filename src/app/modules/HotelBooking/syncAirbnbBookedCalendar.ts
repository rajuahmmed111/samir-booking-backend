import axios from "axios";
import ical from "node-ical";
import prisma from "../../../shared/prisma";
import { BookingSource, BookingStatus } from "@prisma/client";

export const syncAirbnbBookedCalendar = async () => {
  console.log("Airbnb calendar sync started...");

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

        // default values for missing fields
        const bookedFromDate = event.start.toISOString().split("T")[0];
        const bookedToDate = event.end.toISOString().split("T")[0];

        // Airbnb iCal does not provide price or guest count
        // so we set safe defaults
        const personOfGuests = 1;
        const totalPrice = 0;

        // upsert booking in DB
        await prisma.hotel_Booking.upsert({
          where: {
            externalBookingId: event.uid,
          },
          update: {
            bookedFromDate,
            bookedToDate,
            bookingStatus: BookingStatus.CONFIRMED,
            totalPrice,
            personOfGuests,
          },
          create: {
            hotelId: hotel.id,
            partnerId: hotel.partnerId!,
            externalBookingId: event.uid,
            bookingStatus: BookingStatus.CONFIRMED,
            bookingSource: BookingSource.AIRBNB,
            bookedFromDate,
            bookedToDate,
            personOfGuests,
            totalPrice,
          },
        });
      }
    } catch (err) {
      console.error(`Failed to sync hotel ${hotel.id}:`, err);
    }
  }
};
