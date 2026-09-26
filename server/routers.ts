/**
 * Server Router for Platform Services, Webhooks & Automated Hooks
 */

import { z } from "zod";
import { processPaymentWebhook, IPNPayloadSchema } from "./webhooks";
import { triggerEscrowInitiatedNotification, triggerDisputeResolvedNotification } from "./notifications";

export const webhookRouter = {
  /**
   * Procedure for processing inbound IPN webhooks
   */
  processIPN: async (payload: z.infer<typeof IPNPayloadSchema>) => {
    return processPaymentWebhook(payload);
  },

  /**
   * Hook for notifying provider when an escrow is created
   */
  onEscrowCreated: async (input: {
    escrowId: string;
    payerId: string;
    payerName: string;
    payeeId: string;
    courseTitle: string;
    amountCredits: number;
    amountBdt: number;
  }) => {
    return triggerEscrowInitiatedNotification(input);
  },

  /**
   * Hook for sending notification & emails when a dispute is resolved
   */
  onDisputeResolved: async (input: {
    disputeId: string;
    resolution: "refund_payer" | "release_provider" | "split";
    courseTitle: string;
    learnerId: string;
    learnerName: string;
    learnerEmail?: string;
    providerId: string;
    providerName: string;
    providerEmail?: string;
    amountCredits: number;
    amountBdt: number;
    resolutionNote?: string;
  }) => {
    return triggerDisputeResolvedNotification(input);
  },
};
