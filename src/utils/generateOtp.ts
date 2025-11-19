// generate otp
export const generateOtp = (length = 4) => {
  return Math.floor(1000 + Math.random() * 9000)
    .toString()
    .substring(0, length);
};
