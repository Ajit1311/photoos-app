import { photoosRequest } from "../api/photoos-api";

export interface SendEmailOtpResponse {
  success: boolean;
  message?: string;
  expires_in_seconds?: number;
  retry_after_seconds?: number;
}

export interface VerifyEmailOtpResponse {
  success: boolean;
  verified: boolean;
  email?: string;
  firebase_uid?: string;
  verified_at?: number;
}

export async function sendEmailOtp(
  email: string,
): Promise<SendEmailOtpResponse> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Email is required");
  }

  return photoosRequest<SendEmailOtpResponse>(
    "email-otp",
    {
      method: "POST",
      body: JSON.stringify({
        action: "send",
        email: normalizedEmail,
      }),
    },
  );
}

export async function verifyEmailOtp(
  email: string,
  otp: string,
): Promise<VerifyEmailOtpResponse> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedOtp = otp.trim();

  if (!normalizedEmail) {
    throw new Error("Email is required");
  }

  if (!/^\d{6}$/.test(normalizedOtp)) {
    throw new Error("Enter a valid 6-digit OTP");
  }

  return photoosRequest<VerifyEmailOtpResponse>(
    "email-otp",
    {
      method: "POST",
      body: JSON.stringify({
        action: "verify",
        email: normalizedEmail,
        otp: normalizedOtp,
      }),
    },
  );
}
