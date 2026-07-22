import { injectable } from "inversify";
import nodemailer from "nodemailer";
import { IMailService } from "./IMailService.js";
import { env } from "../../config/env.js";


@injectable()
export class MailService implements IMailService {
  private transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: env.MAIL_USERNAME,
      pass: env.MAIL_PASSWORD,
    },
  });

  async sendOtp(email: string, fullName: string, otp: string): Promise<void> {
    await this.transporter.sendMail({
      from: env.MAIL_USERNAME,
      to: email,
      subject: "TripNest OTP Verification",

      html: `
        <h2>Welcome to TripNest!</h2>

        <p>Hello <strong>${fullName}</strong>,</p>

        <p>Your verification code is:</p>

        <h1 style="letter-spacing:5px">${otp}</h1>

        <p>This OTP is valid for <strong>1 minute</strong>.</p>

        <p>If you didn't request this OTP, you can safely ignore this email.</p>

        <br>

        <p>Thanks,</p>
        <p>TripNest Team</p>
      `,
    });
  }
}
