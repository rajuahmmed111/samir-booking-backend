export interface IHotelBookingData {
  basePrice: number;
  bookedFromDate: string;
  bookedToDate: string;
  weeklyDiscount?: number;
  monthlyDiscount?: number;
}
