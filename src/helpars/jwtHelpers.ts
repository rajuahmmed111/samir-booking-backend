import jwt, { JwtPayload, Secret } from "jsonwebtoken";

const generateToken = (
  payload: Record<string, unknown>,
  secret: Secret,
  expiresIn: string
): string => {
  const token = jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn,
  });

  return token;
};

  const verifyToken= (token: string, secret: Secret): JwtPayload => {
    // console.log(token,secret)
    try {
      const decoded = jwt.verify(token, secret) as JwtPayload;
      return decoded;
    } catch (err) {
      console.error("JWT verification error:", err);
      throw err;
    }
  }


export const jwtHelpers = {
  generateToken,
  verifyToken,
};
