import Stripe from "stripe";
import config from "../config";

const stripe = new Stripe(config.stripe.secretKey as string, {
  apiVersion: "2025-02-24.acacia",
});

export default stripe;
