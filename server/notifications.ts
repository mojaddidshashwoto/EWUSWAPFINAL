/**
 * Server-side Automated Notification Triggers & Email Service
 * 
 * Provides automated system notification dispatch for:
 * 1. Escrow Creation (notifies provider when a student reserves BDT in escrow)
 * 2. Dispute Resolution (notifies learner and provider with email placeholder for Resend/SendGrid)
 */

export interface SystemNotification {
  id: string;
  userId: string;
  type: "escrow" | "review" | "call" | "dispute" | "wallet" | "system";
  title: string;
  message: string;
  timestamp: string;
  createdAt: string;
  isRead: boolean;
  metadata?: Record<string, any>;
}

export interface EscrowNotificationPayload {
  escrowId: string;
  payerId: string;
  payerName: string;
  payeeId: string;
  courseTitle: string;
  amountCredits: number;
  amountBdt: number;
}

export interface DisputeNotificationPayload {
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
}

const NOTIFICATIONS_STORAGE_KEY = "ss_notifications";

/**
 * Persists a notification to the system notifications stream and dispatches real-time events.
 */
export function dispatchSystemNotification(notification: Omit<SystemNotification, "id" | "timestamp" | "createdAt" | "isRead">): SystemNotification {
  const fullNotification: SystemNotification = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: "Just now",
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      const list: SystemNotification[] = stored ? JSON.parse(stored) : [];
      list.unshift(fullNotification);
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent("ss_notification_received", { detail: fullNotification }));
      window.dispatchEvent(new Event("ss_notifications_updated"));
    } catch (e) {
      console.error("[Notification Service] Failed to persist notification to storage:", e);
    }
  }

  console.log(`[Notification Service] Dispatched notification to user ${notification.userId}: "${notification.title}"`);
  return fullNotification;
}

/**
 * Automated Trigger 1: Triggered when a student initiates an Escrow payment (ss_create_escrow)
 * Automatically generates a high-priority system notification for the provider.
 */
export async function triggerEscrowInitiatedNotification(payload: EscrowNotificationPayload) {
  console.log(`[Server Hook] ss_create_escrow triggered for escrow ${payload.escrowId}. Notifying provider ${payload.payeeId}...`);

  const notification = dispatchSystemNotification({
    userId: payload.payeeId,
    type: "escrow",
    title: "Escrow Payment Reserved",
    message: `${payload.payerName} reserved ৳${payload.amountBdt.toLocaleString()} BDT held in escrow for "${payload.courseTitle}". Session is confirmed!`,
    metadata: {
      escrowId: payload.escrowId,
      payerId: payload.payerId,
      amountCredits: payload.amountCredits,
      amountBdt: payload.amountBdt,
    },
  });

  return { success: true, notification };
}

/**
 * Automated Trigger 2: Dispute Resolution Hook with Resend/SendGrid email integration placeholder.
 * Automatically dispatches system notifications and triggers institutional resolution emails.
 */
export async function triggerDisputeResolvedNotification(payload: DisputeNotificationPayload) {
  console.log(`[Server Hook] ss_resolve_dispute triggered for dispute ${payload.disputeId}. Ruling: ${payload.resolution}`);

  let rulingSummary = "";
  if (payload.resolution === "refund_payer") {
    rulingSummary = `Ruling: 100% refund of ৳${payload.amountBdt.toLocaleString()} BDT issued to learner ${payload.learnerName}.`;
  } else if (payload.resolution === "release_provider") {
    rulingSummary = `Ruling: Escrow funds (৳${payload.amountBdt.toLocaleString()} BDT) released to provider ${payload.providerName}.`;
  } else {
    rulingSummary = `Ruling: Compromise 50/50 split applied between learner and provider.`;
  }

  // 1. Dispatch in-app system notification to learner
  dispatchSystemNotification({
    userId: payload.learnerId,
    type: "dispute",
    title: `Dispute Case Resolved: ${payload.courseTitle}`,
    message: `${rulingSummary}${payload.resolutionNote ? ` Note: "${payload.resolutionNote}"` : ""}`,
    metadata: { disputeId: payload.disputeId, resolution: payload.resolution },
  });

  // 2. Dispatch in-app system notification to provider
  dispatchSystemNotification({
    userId: payload.providerId,
    type: "dispute",
    title: `Dispute Case Resolved: ${payload.courseTitle}`,
    message: `${rulingSummary}${payload.resolutionNote ? ` Note: "${payload.resolutionNote}"` : ""}`,
    metadata: { disputeId: payload.disputeId, resolution: payload.resolution },
  });

  // 3. Automated Email Dispatch (Resend / SendGrid placeholder)
  const emailResults = await sendDisputeResolutionEmails(payload, rulingSummary);

  return {
    success: true,
    rulingSummary,
    emailStatus: emailResults,
  };
}

/**
 * Placeholder logic ready for Resend or SendGrid email APIs
 */
async function sendDisputeResolutionEmails(payload: DisputeNotificationPayload, rulingSummary: string) {
  const apiKey = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || "MOCK_EMAIL_KEY";
  const isLive = apiKey !== "MOCK_EMAIL_KEY";

  const emailsToSend = [
    {
      to: payload.learnerEmail || `${payload.learnerName.toLowerCase().replace(/\s+/g, ".")}@ewu.edu.bd`,
      name: payload.learnerName,
      role: "Learner",
    },
    {
      to: payload.providerEmail || `${payload.providerName.toLowerCase().replace(/\s+/g, ".")}@ewu.edu.bd`,
      name: payload.providerName,
      role: "Provider",
    },
  ];

  const results = [];

  for (const recipient of emailsToSend) {
    const emailBody = {
      from: "EwuSwap Arbitration Board <arbitration@ewuswap.com>",
      to: recipient.to,
      subject: `[EwuSwap Resolution] Dispute Notice #${payload.disputeId.substring(0, 8)} - ${payload.courseTitle}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #4f46e5;">EwuSwap Campus Dispute Resolution</h2>
          <p>Dear ${recipient.name} (${recipient.role}),</p>
          <p>The institutional moderator panel has concluded review of dispute case <strong>#${payload.disputeId}</strong> for the session <em>"${payload.courseTitle}"</em>.</p>
          <div style="background-color: #f1f5f9; padding: 16px; border-left: 4px solid #4f46e5; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 0; font-weight: bold;">${rulingSummary}</p>
            ${payload.resolutionNote ? `<p style="margin: 8px 0 0; font-size: 13px; color: #475569;">Moderator Remarks: ${payload.resolutionNote}</p>` : ""}
          </div>
          <p style="font-size: 12px; color: #64748b;">Escrow funds have been processed according to East West University Skill Swap terms.</p>
        </div>
      `,
    };

    if (isLive) {
      // In production with Resend:
      // await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(emailBody) });
      console.log(`[Resend Email Gateway] Sending live transactional email to ${recipient.to}...`);
    } else {
      console.log(`[Resend/SendGrid Placeholder] Prepared transactional email for ${recipient.to} (${recipient.role}): "${emailBody.subject}"`);
    }

    results.push({
      recipient: recipient.to,
      status: "queued",
      gateway: isLive ? "Resend Production" : "Mock Gateway (Ready for RESEND_API_KEY)",
    });
  }

  return results;
}
