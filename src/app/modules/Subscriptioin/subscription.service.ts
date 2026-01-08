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

// get all purchase subscription
const getAllPurchaseSubscription = async () => {
  const subscriptions = await prisma.purchase_subscription.findMany({
    select: {
      id: true,
      startDate: true,
      endDate: true,
      cancelAtPeriodEnd: true,
      status: true,
      userId: true,
      planId: true,
      user: {
        select: {
          id: true,
          fullName: true,
        },
      },
      plan: {
        select: {
          name: true,
          price: true,
          validity: true,
        },
      },
    },
  });

  return subscriptions;
};

// get my purchase subscription
const getMyPurchaseSubscription = async (userId: string) => {
  const subscriptions = await prisma.purchase_subscription.findMany({
    where: { userId },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      cancelAtPeriodEnd: true,
      status: true,
      userId: true,
      planId: true,
      user: {
        select: {
          id: true,
          fullName: true,
        },
      },
      plan: {
        select: {
          name: true,
          price: true,
          validity: true,
        },
      },
    },
  });

  return subscriptions;
};

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

// create checkout session for subscription
const createCheckoutSessionForSubscription = async (
  userId: string,
  planId: string
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!user || !plan) throw new Error("User or plan not found");

  // create stripe customer if not exists
  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: user.fullName || undefined,
    });
    stripeCustomerId = customer.id;
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId },
    });
  }

  // create checkout session
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [
      {
        price: plan.stripePriceId!,
        quantity: 1,
      },
    ],
    success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
    metadata: {
      userId,
      planId,
    },
  });

  return { checkoutUrl: session.url, sessionId: session.id };
};

// handle stripe webhook
const handleStripeWebhook = async (event: Stripe.Event) => {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const stripeSubscriptionId = session.subscription as string | undefined;
      const userId = session.metadata?.userId as string | undefined;
      const planId = session.metadata?.planId as string | undefined;

      if (!stripeSubscriptionId || !userId || !planId)
        return { ok: false, reason: "missing metadata" };

      // get stripe subscription to read price and dates
      const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

      await prisma.purchase_subscription.create({
        data: {
          userId,
          planId,
          stripeSubscriptionId,
          stripePriceId: sub.items.data[0].price.id,
          status: "ACTIVE",
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          endDate: new Date(sub.current_period_end * 1000),
          paymentProvider: "STRIPE",
        },
      });

      return { ok: true, handled: "checkout.session.completed" };
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubscriptionId = invoice.subscription as string | null;
      if (!stripeSubscriptionId) return { ok: false };

      const purchase = await prisma.purchase_subscription.findFirst({
        where: { stripeSubscriptionId },
      });
      if (!purchase) return { ok: false };

      await prisma.purchase_subscription.update({
        where: { id: purchase.id },
        data: {
          status: "ACTIVE",
          endDate: new Date(invoice.lines.data[0].period.end * 1000),
        },
      });

      await prisma.payment.create({
        data: {
          purchase_subscriptionId: purchase.id,
          amount: (invoice.amount_paid ?? 0) / 100,
          currency: invoice.currency,
          status: "SUCCESS",
          provider: "STRIPE",
          paymentIntentId: invoice.payment_intent as string | undefined,
          serviceType: "SUBSCRIPTION",
          userId: purchase.userId,
          planId: purchase.planId,
        },
      });

      // user isSubscribed
      await prisma.user.update({
        where: { id: purchase.userId },
        data: { isSubscribed: true },
      });

      return { ok: true, handled: "invoice.payment_succeeded" };
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubscriptionId = invoice.subscription as string | null;
      if (!stripeSubscriptionId) return { ok: false };

      await prisma.purchase_subscription.updateMany({
        where: { stripeSubscriptionId },
        data: { status: "INACTIVE" },
      });

      return { ok: true, handled: "invoice.payment_failed" };
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.purchase_subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: "CANCELED" },
      });
      return { ok: true, handled: "customer.subscription.deleted" };
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.purchase_subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: {
          endDate: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
        },
      });
      return { ok: true, handled: "customer.subscription.updated" };
    }

    default:
      console.log("Unhandled stripe event:", event.type);
      return { ok: true, handled: "unhandled", event: event.type };
  }
};

export const SubscriptionService = {
  createSubscriptionPlan,
  getAllSubscriptionsPlan,
  getSpecificSubscriptionPlan,
  updateSpecificSubscriptionPlan,
  deleteSpecificSubscriptionPlan,

  getAllPurchaseSubscription,
  getMyPurchaseSubscription,
  createSubscription,
  createCheckoutSessionForSubscription,
  handleStripeWebhook,
};
