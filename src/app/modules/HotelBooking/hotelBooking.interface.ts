export interface IHotelBookingData {
  basePrice: number;
  bookedFromDate: string;
  bookedToDate: string;
  weeklyDiscount?: number;
  monthlyDiscount?: number;
  // travelers?: { fullName: string; passportImageUrl?: string }[];
  // specialRequests?: string | "";
}
