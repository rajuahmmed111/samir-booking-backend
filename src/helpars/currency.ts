// src/services/currency.service.ts
import prisma from "../shared/prisma";
import axios from "axios";

interface ExchangeRates {
  [key: string]: number;
}

// public api
const BASE_URL = "https://api.exchangerate-api.com/v4/latest/USD";
const CACHE_VALIDITY_HOURS = 6;

// cache validity check
const isCacheValid = (lastUpdated: Date): boolean => {
  const now = new Date();
  const diffHours = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
  return diffHours < CACHE_VALIDITY_HOURS;
};

// if fallback rates
const getFallbackRates = (): ExchangeRates => ({
  USD: 1,
  BDT: 110,
  AED: 3.67,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1630,
  ZAR: 18.5,
  KES: 129,
  GHS: 15.8,
  EGP: 49,
  INR: 83,
  PKR: 278,
  SAR: 3.75,
  QAR: 3.64,
  OMR: 0.38,
  KWD: 0.31,
});

// exchange rates (from DB or API)
const getExchangeRates = async (): Promise<ExchangeRates> => {
  try {
    // check latest rates from the database.
    const cachedRate = await prisma.currencyRate.findFirst({
      orderBy: { lastUpdated: "desc" },
    });

    // return if cache is valid
    if (cachedRate && isCacheValid(cachedRate.lastUpdated)) {
      return cachedRate.rates as ExchangeRates;
    }

    // new rates from API
    const response = await axios.get(BASE_URL);
    const rates = response.data.rates;

    // database save
    await prisma.currencyRate.create({
      data: {
        baseCurrency: "USD",
        rates: rates,
        lastUpdated: new Date(),
      },
    });

    return rates;
  } catch (error) {
    console.error("Failed to fetch exchange rates:", error);

    // return last rates if failed
    const lastRate = await prisma.currencyRate.findFirst({
      orderBy: { lastUpdated: "desc" },
    });

    if (lastRate) {
      return lastRate.rates as ExchangeRates;
    }

    // return fallback rates if failed all
    return getFallbackRates();
  }
};

// currency convert (sync)
const convertPrice = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates
): number => {
  if (fromCurrency === toCurrency) return amount;

  if (!rates[fromCurrency] || !rates[toCurrency]) {
    console.warn(`Currency not found: ${fromCurrency} or ${toCurrency}`);
    return amount;
  }

  // convert to USD
  const amountInUSD = amount / rates[fromCurrency];

  // convert to target currency
  const convertedAmount = amountInUSD * rates[toCurrency];

  return Math.round(convertedAmount * 100) / 100;
};

// currency convert (async)
const convertPriceAsync = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  const rates = await getExchangeRates();
  return convertPrice(amount, fromCurrency, toCurrency, rates);
};

// currency symbol
const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<string, string> = {
    BDT: "৳",
    USD: "$",
    AED: "د.إ",
    EUR: "€",
    GBP: "£",
    NGN: "₦",
    ZAR: "R",
    KES: "KSh",
    GHS: "₵",
    EGP: "E£",
    INR: "₹",
    PKR: "₨",
    SAR: "﷼",
    QAR: "ر.ق",
    OMR: "ر.ع.",
    KWD: "د.ك",
  };
  return symbols[currency] || currency;
};

// supported currencies list
const getSupportedCurrencies = () => [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", flag: "🇧🇩" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬" },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", flag: "🇰🇪" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵", flag: "🇬🇭" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£", flag: "🇪🇬" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", flag: "🇸🇦" },
];

export const CurrencyHelpers = {
  getExchangeRates,
  convertPrice,
  convertPriceAsync,
  getCurrencySymbol,
  getSupportedCurrencies,
};
