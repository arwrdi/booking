import { createHash } from "node:crypto";

import { getMidtransEnv } from "./env";

type MidtransCustomerDetails = {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string | null;
};

type MidtransItemDetails = {
  id: string;
  price: number;
  quantity: number;
  name: string;
};

type CreateSnapTransactionArgs = {
  orderId: string;
  grossAmount: number;
  customerDetails: MidtransCustomerDetails;
  itemDetails: MidtransItemDetails[];
  expiryMinutes: number;
  callbackUrls?: {
    finish: string;
    unfinish: string;
    error: string;
  };
};

export type MidtransSnapTransaction = {
  token: string;
  redirect_url: string;
};

export type MidtransNotificationPayload = {
  transaction_time?: string;
  transaction_status?: string;
  transaction_id?: string;
  status_message?: string;
  status_code?: string;
  signature_key?: string;
  payment_type?: string;
  order_id?: string;
  merchant_id?: string;
  gross_amount?: string;
  fraud_status?: string;
  currency?: string;
};

function getAuthorizationHeader(serverKey: string) {
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

function splitName(fullName: string) {
  const trimmedName = fullName.trim();
  if (!trimmedName) {
    return {
      firstName: "Customer",
      lastName: "",
    };
  }

  const [firstName, ...rest] = trimmedName.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" "),
  };
}

export function createMidtransOrderId(bookingId: string) {
  const normalizedBookingId = bookingId.replace(/-/g, "").slice(0, 24);

  return `booking-${normalizedBookingId}-${Date.now()}`;
}

export async function createSnapRedirectTransaction({
  orderId,
  grossAmount,
  customerDetails,
  itemDetails,
  expiryMinutes,
  callbackUrls,
}: CreateSnapTransactionArgs): Promise<MidtransSnapTransaction> {
  const { serverKey, snapBaseUrl } = getMidtransEnv();
  const response = await fetch(`${snapBaseUrl}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: getAuthorizationHeader(serverKey),
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      credit_card: {
        secure: true,
      },
      item_details: itemDetails,
      customer_details: {
        first_name: customerDetails.firstName,
        last_name: customerDetails.lastName ?? "",
        email: customerDetails.email,
        phone: customerDetails.phone ?? "",
      },
      expiry: {
        unit: "minute",
        duration: expiryMinutes,
      },
      callbacks: callbackUrls,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | MidtransSnapTransaction
    | { error_messages?: string[] };

  if (!response.ok || !payload || !("token" in payload) || !("redirect_url" in payload)) {
    const errorMessage =
      payload && "error_messages" in payload && Array.isArray(payload.error_messages)
        ? payload.error_messages.join(" ")
        : "Midtrans transaction creation failed";

    throw new Error(errorMessage);
  }

  return payload;
}

export function buildMidtransSignature(orderId: string, statusCode: string, grossAmount: string) {
  const { serverKey } = getMidtransEnv();

  return createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");
}

export function isValidMidtransSignature(payload: MidtransNotificationPayload) {
  if (!payload.order_id || !payload.status_code || !payload.gross_amount || !payload.signature_key) {
    return false;
  }

  const expectedSignature = buildMidtransSignature(
    payload.order_id,
    payload.status_code,
    payload.gross_amount,
  );

  return expectedSignature === payload.signature_key;
}

export function buildMidtransCustomerDetails(fullName: string | null, email: string, phone?: string | null) {
  const { firstName, lastName } = splitName(fullName ?? "");

  return {
    firstName,
    lastName,
    email,
    phone,
  };
}
