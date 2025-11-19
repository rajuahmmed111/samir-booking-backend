import { UserStatus } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import emailSender from "../../../helpars/emailSender";

// verify email and phone number
const verifyEmailAndPhoneNumber = async (userId: string) => {
  // const result = await prisma.user.updateMany({ where: { id: userId }, data: { emailVerified: true, phoneVerified: true } });
  // return result;
};

// create app about
const createOrUpdateAbout = async (payload: any) => {
  // check if already exists
  const existing = await prisma.about_App.findFirst();

  if (existing) {
    // Update
    return prisma.about_App.update({
      where: { id: existing.id },
      data: payload,
    });
  } else {
    // Create
    return prisma.about_App.create({
      data: payload,
    });
  }
};

const getAbout = async () => {
  const result = await prisma.about_App.findFirst();

  if (!result) {
    throw new Error("About App not found");
  }

  return result;
};

// create customer contact info
const createCustomerContactInfo = async (payload: any) => {
  try {
    // create the contact
    const createCustomerContact = await prisma.customerContact.create({
      data: payload,
    });

    // prepare email content
    const subject = "Thank You for Contacting Us!";
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 10px;">
        <h2>Hello ${payload.fullName},</h2>
        <p>Thank you for reaching out to us. We’ve received your message and our team will get back to you soon.</p>
        <h3>Your Details:</h3>
        <ul>
          <li><strong>Email:</strong> ${payload.email}</li>
          ${
            payload.phone
              ? `<li><strong>Phone:</strong> ${payload.phone}</li>`
              : ""
          }
          <li><strong>Message:</strong> ${payload.description}</li>
        </ul>
        <br />
        <p>Best regards,<br><strong>Tim Support Team</strong></p>
      </div>
    `;

    // send email
    await emailSender(subject, payload.email, html);

    // return response
    return {
      success: true,
      message:
        "Customer contact created and confirmation email sent successfully.",
      data: createCustomerContact,
    };
  } catch (error) {
    console.error("Error creating customer contact:", error);
    throw new ApiError(500, "Failed to create customer contact or send email.");
  }
};

const getCustomerContactInfo = async () => {
  const result = await prisma.customerContact.findFirst();

  if (!result) {
    throw new Error("Customer contact info not found");
  }

  return result;
};

// updateNotificationSettings
const updateNotificationSettings = async (
  userId: string,
  payload: {
    supportNotification?: boolean;
    paymentNotification?: boolean;
    emailNotification?: boolean;
  }
) => {
  // find admin
  const findAdmin = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });
  if (!findAdmin) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  return prisma.user.update({
    where: { id: findAdmin.id },
    data: {
      supportNotification: payload.supportNotification,
      paymentNotification: payload.paymentNotification,
      emailNotification: payload.emailNotification,
    },
    select: {
      id: true,
      supportNotification: true,
      paymentNotification: true,
      emailNotification: true,
    },
  });
};

export const SettingService = {
  verifyEmailAndPhoneNumber,
  createOrUpdateAbout,
  getAbout,
  createCustomerContactInfo,
  getCustomerContactInfo,
  updateNotificationSettings,
};
