import axios from "axios";

interface UserLocation {
  country: string;
  countryCode: string;
  currency: string;
  city: string;
  ip: string;
}

export const detectUserLocation = async (
  ip?: string
): Promise<UserLocation> => {
  try {
    const url = ip ? `https://ipapi.co/${ip}/json/` : "https://ipapi.co/json/";

    const response = await axios.get(url, { timeout: 3000 });

    return {
      country: response.data.country_name || "Bangladesh",
      countryCode: response.data.country_code || "BD",
      currency: response.data.currency || "BDT",
      city: response.data.city || "Dhaka",
      ip: response.data.ip || "",
    };
  } catch (error) {
    console.error("Location detection failed:", error);

    return {
      country: "Bangladesh",
      countryCode: "BD",
      currency: "BDT",
      city: "Dhaka",
      ip: ip || "",
    };
  }
};

// user requested currency
export const getUserCurrency = async (req: any): Promise<string> => {
  // query parameter
  if (req.query.currency) {
    return (req.query.currency as string).toUpperCase();
  }

  // header
  if (req.headers["x-user-currency"]) {
    return (req.headers["x-user-currency"] as string).toUpperCase();
  }

  // user authenticated
  if (req.user?.preferredCurrency) {
    return req.user.preferredCurrency.toUpperCase();
  }

  // IP detection
  try {
    const userIp =
      req.ip ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.connection.remoteAddress;

    const location = await detectUserLocation(userIp);
    return location.currency;
  } catch (error) {
    return "USD";
  }
};

// client IP extract
// export const getClientIP = (req: any): string => {
//   return (
//     req.headers["x-forwarded-for"]?.split(",")[0] ||
//     req.headers["x-real-ip"] ||
//     req.ip ||
//     req.connection.remoteAddress ||
//     req.socket.remoteAddress ||
//     ""
//   ).replace("::ffff:", "");
// };

// client IP extract
export const getClientIP = (req: any): string => {
  let ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "";

  // remove IPv6 prefix
  ip = ip.replace("::ffff:", "").trim();

  return ip || "Unknown";
};
