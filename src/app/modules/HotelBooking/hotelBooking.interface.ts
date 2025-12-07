export interface IHotelBookingData {
  basePrice: number;
  bookedFromDate: string; // date format: "dd-MM-yyyy"
  bookedToDate: string; // date format: "dd-MM-yyyy"
  specialRequests?: string | "";
}

export type BookingCategory = "hotel" | "security" | "car" | "attraction";

export interface IBookingFilterRequest {
  category?: BookingCategory;
}
