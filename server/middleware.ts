/**
 * Server-Side HTTP Middleware for Vite Dev Server & Node Production
 * 
 * Mounts secure HTTP endpoints:
 * - POST /api/webhooks/ipn: Instant Payment Notification receiver for bKash/SSLCommerz
 * - POST /api/webhooks/payment: Alias endpoint for client wallet top-up processing
 * - POST /api/escrow/notify: Automated notification trigger for escrow reservation
 * - POST /api/disputes/notify: Automated notification and email dispatch for dispute resolution
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { processPaymentWebhook } from "./webhooks";
import { triggerEscrowInitiatedNotification, triggerDisputeResolvedNotification } from "./notifications";

function readRequestBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      const trimmed = body.trim();
      if (!trimmed) return resolve({});
      try {
        return resolve(JSON.parse(trimmed));
      } catch {
        // Try parsing urlencoded parameters
        try {
          const params = new URLSearchParams(trimmed);
          const obj: Record<string, any> = {};
          for (const [k, v] of params.entries()) {
            obj[k] = v;
          }
          if (Object.keys(obj).length > 0 && obj.tran_id) {
            return resolve(obj);
          }
        } catch {
          // ignore
        }
        reject(new Error(`Invalid request body`));
      }
    });
    req.on("error", reject);
  });
}

function sendJsonResponse(res: ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-ipn-signature, x-gw-token",
  });
  res.end(JSON.stringify(data));
}

export function createApiWebhookMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url || "";

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-ipn-signature, x-gw-token",
      });
      res.end();
      return;
    }

    // 1. Payment Webhook / IPN Endpoint
    if (url.startsWith("/api/webhooks/ipn") || url.startsWith("/api/webhooks/payment")) {
      if (req.method !== "POST") {
        sendJsonResponse(res, 405, { error: "Method Not Allowed. Use POST." });
        return;
      }

      try {
        const body = await readRequestBody(req);
        const headers = req.headers as Record<string, string>;
        const result = await processPaymentWebhook(body, headers);
        sendJsonResponse(res, 200, result);
      } catch (error: any) {
        const status = error.message?.includes("unavailable") ? 503 : error.message?.includes("UNAUTHORIZED") ? 401 : error.message?.includes("CONFLICT") ? 409 : 400;
        sendJsonResponse(res, status, { success: false, error: error.message });
      }
      return;
    }

    // 2. Escrow Notification Hook
    if (url.startsWith("/api/escrow/notify")) {
      if (req.method !== "POST") {
        sendJsonResponse(res, 405, { error: "Method Not Allowed. Use POST." });
        return;
      }

      try {
        const body = await readRequestBody(req);
        const result = await triggerEscrowInitiatedNotification(body);
        sendJsonResponse(res, 200, result);
      } catch (error: any) {
        sendJsonResponse(res, 400, { success: false, error: error.message });
      }
      return;
    }

    // 3. Dispute Resolution Notification Hook
    if (url.startsWith("/api/disputes/notify")) {
      if (req.method !== "POST") {
        sendJsonResponse(res, 405, { error: "Method Not Allowed. Use POST." });
        return;
      }

      try {
        const body = await readRequestBody(req);
        const result = await triggerDisputeResolvedNotification(body);
        sendJsonResponse(res, 200, result);
      } catch (error: any) {
        sendJsonResponse(res, 400, { success: false, error: error.message });
      }
      return;
    }

    // Pass through to next handler if not an API route
    next();
  };
}
