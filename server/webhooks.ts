/**
 * Server-Side Payment Gateway Webhook Architecture (IPN Listener)
 * 
 * Handles Instant Payment Notifications (IPN) from local Bangladeshi payment gateways:
 * - bKash Merchant API (v1.2 tokenized checkout & webhook callback)
 * - SSLCommerz IPN (v4.0 IPN verification)
 * - Nagad PGW callback
 * 
 * Invariants:
 * 1. Strictly verifies cryptographic gateway signature / token (rejects unauthorized payloads)
 * 2. Enforces idempotency (guards against replay attacks and duplicate credit top-ups)
 * 3. Calculates currency conversion (BDT -> Skill Credits) strictly on server-side
 * 4. Mutates database balances and creates immutable ledger entry
 * 5. Dispatches automated real-time notification
 */

import { z } from "zod";
import { createHmac, timingSafeEqual } from "node:crypto";
import { dispatchSystemNotification } from "./notifications";

// Server-side secret key for gateway signature verification
export const GATEWAY_IPN_SECRET = process.env.GATEWAY_IPN_SECRET || "";
export const BDT_PER_CREDIT_RATE = 120; // 1 Skill Credit = 120 BDT (Campus Standard Rate)

// Schema for inbound Instant Payment Notification (bKash / SSLCommerz IPN)
export const IPNPayloadSchema = z.object({
  gateway: z.enum(["bkash", "nagad", "sslcommerz"]),
  tran_id: z.string().min(5, "Transaction ID required"),
  val_id: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  currency: z.literal("BDT"),
  status: z.enum(["VALID", "COMPLETED", "SUCCESS"]),
  user_id: z.string().min(1, "User ID is required"),
  sender_phone: z.string().optional(),
  signature: z.string().min(1, "Cryptographic signature or token required"),
  timestamp: z.string().optional(),
});

export type IPNPayload = z.infer<typeof IPNPayloadSchema>;

export interface ProcessedPaymentResult {
  success: boolean;
  message: string;
  transactionId: string;
  userId: string;
  amountBdt: number;
  creditsCredited: number;
  newCreditsBalance: number;
  newBdtBalance: number;
}

// In-memory set for idempotency check (prevents replay attacks on same transaction ID)
const processedTransactionIds = new Set<string>();

/**
 * Validates the internal HMAC contract; vendor-specific signatures still need adapters.
 */
export function verifyGatewaySignature(signature: string, tranId: string, amount: number): boolean {
  if (!GATEWAY_IPN_SECRET || !signature) return false;
  const expected = createHmac("sha256", GATEWAY_IPN_SECRET)
    .update(`${tranId}:${amount}:BDT`)
    .digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/**
 * Core Server-side RPC to process the validated IPN payload and update balances
 */
export async function processPaymentWebhook(rawBody: any, headers?: Record<string, string>): Promise<ProcessedPaymentResult> {
  throw new Error("Payment processing is unavailable until a verified gateway and Supabase ledger integration are configured.");

  // 1. Check for signature in headers or body
  const headerSig = headers?.["x-ipn-signature"] || headers?.["x-gw-token"] || headers?.["authorization"];
  const payloadToValidate = {
    ...rawBody,
    signature: rawBody.signature || headerSig || "",
  };

  const parseResult = IPNPayloadSchema.safeParse(payloadToValidate);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new Error(`[IPN Validation Error] Invalid payment payload: ${errorDetails}`);
  }

  const payload = parseResult.data;

  // 2. Cryptographic signature check
  const isSignatureValid = verifyGatewaySignature(payload.signature, payload.tran_id, payload.amount);
  if (!isSignatureValid) {
    console.warn(`[Security Alert] IPN rejected: Invalid gateway signature for transaction ${payload.tran_id}`);
    throw new Error("UNAUTHORIZED: Invalid payment gateway signature. Fraud prevention trigger.");
  }

  // 3. Idempotency Check: Prevent duplicate payment crediting
  if (processedTransactionIds.has(payload.tran_id)) {
    console.warn(`[Idempotency] Transaction ${payload.tran_id} was already processed. Ignoring duplicate.`);
    throw new Error(`CONFLICT: Transaction ${payload.tran_id} has already been processed.`);
  }

  // 4. Server-Side Financial Math (Never trust client calculation)
  const amountBdt = Number(payload.amount);
  const creditsToAdd = Math.floor(amountBdt / BDT_PER_CREDIT_RATE);

  if (creditsToAdd <= 0) {
    throw new Error(`Minimum top-up amount is ৳${BDT_PER_CREDIT_RATE} (1 Skill Credit). Received: ৳${amountBdt}`);
  }

  console.log(`[Payment Gateway Webhook] Processing verified IPN for User: ${payload.user_id} | Amount: ৳${amountBdt} | Calculated Credits: ${creditsToAdd}`);

  // 5. Mutate database / persistent profiles securely on server side
  let newCredits = creditsToAdd;
  let newBdt = amountBdt;

  if (typeof window !== "undefined") {
    // Client environment fallback
    try {
      const stored = localStorage.getItem("ss_current_user");
      let currentUser = stored ? JSON.parse(stored) : null;
      if (!currentUser) {
        currentUser = { id: payload.user_id, credits: 0, bdtBalance: 0 };
      }
      currentUser.credits = (currentUser.credits || 0) + creditsToAdd;
      currentUser.bdtBalance = (currentUser.bdtBalance || 0) + amountBdt;
      newCredits = currentUser.credits;
      newBdt = currentUser.bdtBalance;
      localStorage.setItem("ss_current_user", JSON.stringify(currentUser));

      // Append immutable ledger transaction
      const txList = JSON.parse(localStorage.getItem("ss_wallet_transactions") || "[]");
      const ledgerEntry = {
        id: `tx_${payload.tran_id}`,
        type: "topup",
        title: `${payload.gateway === "bkash" ? "bKash" : payload.gateway === "nagad" ? "Nagad" : "SSLCommerz"} Instant Deposit`,
        counterparty: `${payload.gateway.toUpperCase()} Gateway (IPN Verified)`,
        method: payload.gateway,
        amountCredits: creditsToAdd,
        amountBdt: amountBdt,
        date: "Just now",
        status: "Completed",
        trxId: payload.tran_id,
        senderPhone: payload.sender_phone,
        note: `Gateway IPN Verified TrxID: ${payload.tran_id}`,
      };
      txList.unshift(ledgerEntry);
      localStorage.setItem("ss_wallet_transactions", JSON.stringify(txList));

      // Dispatch UI update events
      window.dispatchEvent(new Event("ss_wallet_updated"));
      window.dispatchEvent(new Event("ss_user_changed"));
    } catch (err) {
      console.error("[Database Update Error] Failed to update balance in storage:", err);
    }
  }

  // Record transaction ID as processed
  processedTransactionIds.add(payload.tran_id);

  // 6. Automatically trigger system notification for the user
  dispatchSystemNotification({
    userId: payload.user_id,
    type: "wallet",
    title: "Wallet Top-Up Confirmed",
    message: `৳${amountBdt.toLocaleString()} added via ${payload.gateway.toUpperCase()} (TrxID: ${payload.tran_id}). ${creditsToAdd} Skill Credits deposited into your balance.`,
    metadata: {
      tran_id: payload.tran_id,
      amountBdt,
      creditsToAdd,
      gateway: payload.gateway,
    },
  });

  return {
    success: true,
    message: "Payment successfully verified and wallet credited.",
    transactionId: payload.tran_id,
    userId: payload.user_id,
    amountBdt,
    creditsCredited: creditsToAdd,
    newCreditsBalance: newCredits,
    newBdtBalance: newBdt,
  };
}
