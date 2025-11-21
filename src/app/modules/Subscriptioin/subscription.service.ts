import {
  PaymentProvider,
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { ICreateSubscriptionPlan } from "./subscription.interface";
import stripe from "../../../helpars/stripe";
import Stripe from "stripe";

// ----------------------------subscription plan--------------------------------

// create subscription plan
const createSubscriptionPlan = async (
  data: ICreateSubscriptionPlan,
  userId?: string
) => {
  // create stripe product
  const product = await stripe.products.create({ name: data.name });

  // stripe recurring price
  const price = await stripe.prices.create({
    currency: data.price.currency.toLowerCase(),
    unit_amount: Math.round(data.price.amount * 100), // convert dollars to cents
    recurring: {
      interval: data.validity.type === "months" ? "month" : "year",
      interval_count: data.validity.value,
    },
    product: product.id,
  });

  const newPlan = await prisma.subscriptionPlan.create({
    data: {
      name: data.name,
      features: data.features,
      price: { set: data.price },
      validity: { set: data.validity },
      userId,
      stripeProductId: product.id,
      stripePriceId: price.id,
    },
  });

  return newPlan;
};

// get all subscriptions
const getAllSubscriptionsPlan = async (
  searchQuery?: string,
  skip: number = 0,
  limit: number = 10
): Promise<SubscriptionPlan[]> => {
  const where: any = {};
  if (searchQuery) {
    where.OR = [
      { name: { $contains: searchQuery } },
      { features: { hasSome: [searchQuery] } },
    ];
  }

  return await prisma.subscriptionPlan.findMany({
    where,
    skip,
    take: limit,
  });
};

// get specific subscriptionPlan
const getSpecificSubscriptionPlan = async (
  id: string
): Promise<SubscriptionPlan | null> => {
  return await prisma.subscriptionPlan.findUnique({
    where: { id },
  });
};

// update specific subscriptionPlan
const updateSpecificSubscriptionPlan = async (
  id: string,
  data: Partial<ICreateSubscriptionPlan>
): Promise<SubscriptionPlan> => {
  return await prisma.subscriptionPlan.update({
    where: { id },
    data,
  });
};

// delete specific subscriptionPlan
const deleteSpecificSubscriptionPlan = async (
  id: string
): Promise<SubscriptionPlan> => {
  return await prisma.subscriptionPlan.delete({
    where: { id },
  });
};

// ----------------------------subscription--------------------------------

// create subscriptions
const createSubscription = async (userId: string, planId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!user || !plan)
    throw new ApiError(httpStatus.NOT_FOUND, "User or plan not found");

  // create stripe customer if not already
  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.fullName ?? undefined,
    });
    stripeCustomerId = customer.id;
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId },
    });
  }

  // create subscription
  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: plan.stripePriceId! }],
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
  });

  const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
  const paymentIntent = latestInvoice.payment_intent as Stripe.PaymentIntent;

  // store subscription
  const savedSubscription = await prisma.purchase_subscription.create({
    data: {
      userId,
      planId: plan.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: plan.stripePriceId!,
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      endDate: new Date(subscription.current_period_end * 1000),
      paymentProvider: PaymentProvider.STRIPE,
    },
    include: { plan: true },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    subscriptionId: savedSubscription.id,
  };
};

// handle stripe webhook
const handleStripeWebhook = async (event: Stripe.Event) => {
  switch (event.type) {
    // payment success
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;

      const stripeSubscriptionId = invoice.subscription as string;

      if (!stripeSubscriptionId) return;

      // find purchase_subscription by stripeSubscriptionId
      const purchase = await prisma.purchase_subscription.findFirst({
        where: { stripeSubscriptionId },
        select: {
          id: true,
          userId: true,
          planId: true,
        },
      });

      if (!purchase) {
        throw new ApiError(404, "Subscription not found in DB");
      }

      await prisma.purchase_subscription.updateMany({
        where: { stripeSubscriptionId },
        data: {
          status: "ACTIVE",
          endDate: new Date(invoice.lines.data[0].period.end * 1000),
        },
      });

      // payment record
      await prisma.payment.create({
        data: {
          purchase_subscriptionId: stripeSubscriptionId,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
          status: PaymentStatus.SUCCESS,
          provider: "STRIPE",
          paymentIntentId: invoice.payment_intent as string,
          serviceType: "SUBSCRIPTION",
          planId: purchase.id,
          userId: purchase.userId,
        },
      });

      break;
    }

    // payment failed
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;

      const stripeSubscriptionId = invoice.subscription as string;

      await prisma.purchase_subscription.updateMany({
        where: { stripeSubscriptionId },
        data: {
          status: SubscriptionStatus.INACTIVE,
        },
      });

      break;
    }

    // subscription cancelled
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      await prisma.purchase_subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: "CANCELED",
        },
      });
      break;
    }

    // subscription renewed or updated
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;

      await prisma.purchase_subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          endDate: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });

      break;
    }

    default:
      console.log("Unhandled event:", event.type);
  }
};

export const SubscriptionService = {
  createSubscriptionPlan,
  getAllSubscriptionsPlan,
  getSpecificSubscriptionPlan,
  updateSpecificSubscriptionPlan,
  deleteSpecificSubscriptionPlan,

  createSubscription,
  handleStripeWebhook,
};
