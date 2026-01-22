export interface IHotelBookingData {
  basePrice: number;
  bookedFromDate: string;
  bookedToDate: string;
  personOfGuests: number;
  weeklyDiscount?: number;
  monthlyDiscount?: number;
}
