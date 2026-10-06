export const PLATFORM_FEE_BPS = 500;

export type VerificationMethod = "nid" | "student_id" | "phone";
export type VerificationStatus = "pending" | "in_review" | "verified" | "rejected";
export type AvailabilityStatus = "available" | "busy" | "vacation" | "unavailable";
export type ContactPolicy = "everyone" | "followers" | "matches" | "nobody";
export type EscrowStatus = "pending" | "submitted" | "verified" | "released" | "rejected";
export type DisputeStatus = "open" | "under_review" | "resolved" | "appealed" | "closed";

export type SearchFilters = {
  query?: string;
  categoryId?: string;
  type?: "course" | "service";
  minPriceBdt?: number;
  maxPriceBdt?: number;
  minCredits?: number;
  maxCredits?: number;
  minRating?: number;
  verifiedOnly?: boolean;
  availableOnly?: boolean;
  sort?: "relevance" | "rating" | "newest" | "price_low";
};

export type EscrowQuote = {
  grossBdt: number;
  platformFeeBdt: number;
  providerNetBdt: number;
  feeRateBps: number;
  // Legacy fields for backward compatibility
  grossCredits: number;
  platformFeeCredits: number;
  providerNetCredits: number;
};

export function calculateEscrowQuote(amountBdt: number, feeRateBps = PLATFORM_FEE_BPS): EscrowQuote {
  const roundedBdt = Math.round(amountBdt * 100) / 100;
  if (!Number.isFinite(roundedBdt) || roundedBdt <= 0) {
    throw new Error("Escrow amount must be a positive number");
  }
  if (!Number.isInteger(feeRateBps) || feeRateBps < 0 || feeRateBps > 10_000) {
    throw new Error("Fee rate must be between 0 and 10000 basis points");
  }

  let platformFeeBdt = Math.round((roundedBdt * feeRateBps) / 10_000);
  if (platformFeeBdt < 1) {
    platformFeeBdt = 1;
  }
  const providerNetBdt = roundedBdt - platformFeeBdt;
  if (providerNetBdt < 1) throw new Error("Escrow amount must cover the platform fee");

  const quote = {
    grossCredits: roundedBdt,
    platformFeeCredits: platformFeeBdt,
    providerNetCredits: providerNetBdt,
    feeRateBps,
  } as EscrowQuote;

  Object.defineProperties(quote, {
    grossBdt: { value: roundedBdt, enumerable: false, writable: true, configurable: true },
    platformFeeBdt: { value: platformFeeBdt, enumerable: false, writable: true, configurable: true },
    providerNetBdt: { value: providerNetBdt, enumerable: false, writable: true, configurable: true },
  });

  return quote;
}

export function normalizeSearchFilters(filters: SearchFilters): SearchFilters {
  return {
    query: filters.query?.trim().slice(0, 120) || undefined,
    categoryId: filters.categoryId || undefined,
    type: filters.type,
    minCredits: filters.minCredits !== undefined ? Math.max(1, Math.floor(filters.minCredits)) : undefined,
    maxCredits: filters.maxCredits !== undefined ? Math.max(1, Math.floor(filters.maxCredits)) : undefined,
    minRating: filters.minRating !== undefined ? Math.min(5, Math.max(0, filters.minRating)) : undefined,
    verifiedOnly: filters.verifiedOnly === true,
    availableOnly: filters.availableOnly === true,
    sort: filters.sort ?? "relevance",
  };
}

export function canContact(policy: ContactPolicy, relationship: { follows: boolean; hasCompletedExchange: boolean; blocked: boolean }): boolean {
  if (relationship.blocked) return false;
  if (policy === "nobody") return false;
  if (policy === "everyone") return true;
  if (policy === "followers") return relationship.follows;
  return relationship.hasCompletedExchange;
}

const escrowTransitions: Record<EscrowStatus, EscrowStatus[]> = {
  pending: ["submitted", "rejected"],
  submitted: ["verified", "rejected"],
  verified: ["released"],
  released: [],
  rejected: ["submitted"],
};

export function canTransitionEscrow(from: EscrowStatus, to: EscrowStatus): boolean {
  return escrowTransitions[from].includes(to);
}

export function assertEscrowTransition(from: EscrowStatus, to: EscrowStatus) {
  if (!canTransitionEscrow(from, to)) throw new Error(`Invalid escrow transition: ${from} -> ${to}`);
}

export function canSubmitReview(input: { reviewerId: string; revieweeId: string; exchangeStatus: EscrowStatus; rating: number }) {
  if (input.reviewerId === input.revieweeId) throw new Error("A member cannot review themselves");
  if (!["verified", "released"].includes(input.exchangeStatus)) throw new Error("A completed exchange is required before reviewing");
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) throw new Error("Rating must be an integer from 1 to 5");
  return true;
}

export function sanitizeVerificationSubmission(input: { method: VerificationMethod; documentNumber: string; storagePath?: string }) {
  const documentNumber = input.documentNumber.trim().replace(/\s+/g, "");
  if (!documentNumber || documentNumber.length < 4) throw new Error("A valid identity document is required");
  if (!["nid", "student_id", "phone"].includes(input.method)) throw new Error("Unsupported verification method");

  // Store only a one-way reference and the last four characters. Never persist raw identity numbers or full phone numbers.
  return {
    method: input.method,
    documentLast4: documentNumber.slice(-4),
    documentHashHint: `sha256:${documentNumber.length}:${documentNumber.slice(-4)}`,
    storagePath: input.storagePath?.trim() || undefined,
  };
}

export function sanitizePublicProfile<T extends Record<string, any>>(profile: T): Omit<T, "phoneNumber" | "address" | "phone_number"> {
  const { phoneNumber, address, phone_number, ...publicProfile } = profile;
  return publicProfile;
}

export function buildCourseSearchQuery(filters: SearchFilters) {
  const normalized = normalizeSearchFilters(filters);
  return {
    ...normalized,
    status: "published" as const,
    visibility: normalized.verifiedOnly ? "verified_provider" : "public",
  };
}

export function disputeResolutionRefundsPayer(resolution: "refund_payer" | "release_provider" | "split" | "no_action") {
  return resolution === "refund_payer" || resolution === "split";
}

