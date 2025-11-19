export interface IHotelBookingData {
  name?: string | "";
  email?: string | "";
  phone?: string | "";
  address?: string | "";
  convertedPrice: number;
  displayCurrency: string;
  discountedPrice?: number;
  rooms: number; // number of rooms booked
  adults: number; // number of adults
  children: number; // number of children
  bookedFromDate: string; // date format: "dd-MM-yyyy"
  bookedToDate: string; // date format: "dd-MM-yyyy"
  specialRequests?: string | "";
}

export type BookingCategory = "hotel" | "security" | "car" | "attraction";

export interface IBookingFilterRequest {
  category?: BookingCategory;
}
