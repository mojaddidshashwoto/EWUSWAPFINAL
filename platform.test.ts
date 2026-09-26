import { describe, expect, it } from "vitest";
import {
  assertEscrowTransition,
  calculateEscrowQuote,
  canContact,
  canSubmitReview,
  sanitizePublicProfile,
  sanitizeVerificationSubmission,
} from "./platform";

describe("platform backend rules", () => {
  it("reserves a 5% platform fee and pays the provider net credits", () => {
    expect(calculateEscrowQuote(100)).toEqual({
      grossCredits: 100,
      platformFeeCredits: 5,
      providerNetCredits: 95,
      feeRateBps: 500,
    });
  });

  it("uses a minimum one-credit fee for small exchanges", () => {
    expect(calculateEscrowQuote(2).platformFeeCredits).toBe(1);
    expect(() => calculateEscrowQuote(1)).toThrow();
  });

  it("blocks contact when either member is blocked or policy does not match", () => {
    expect(canContact("followers", { follows: true, hasCompletedExchange: false, blocked: false })).toBe(true);
    expect(canContact("matches", { follows: true, hasCompletedExchange: false, blocked: false })).toBe(false);
    expect(canContact("everyone", { follows: false, hasCompletedExchange: false, blocked: true })).toBe(false);
  });

  it("only allows the review after a verified or released exchange", () => {
    expect(canSubmitReview({ reviewerId: "a", revieweeId: "b", exchangeStatus: "released", rating: 5 })).toBe(true);
    expect(() => canSubmitReview({ reviewerId: "a", revieweeId: "b", exchangeStatus: "submitted", rating: 5 })).toThrow();
    expect(() => canSubmitReview({ reviewerId: "a", revieweeId: "a", exchangeStatus: "released", rating: 5 })).toThrow();
  });

  it("enforces the escrow state machine", () => {
    expect(() => assertEscrowTransition("submitted", "verified")).not.toThrow();
    expect(() => assertEscrowTransition("released", "verified")).toThrow();
    expect(() => assertEscrowTransition("verified", "released")).not.toThrow();
  });

  it("does not return a raw identity number from verification sanitization for NID, Student ID, or Phone", () => {
    const resultNid = sanitizeVerificationSubmission({ method: "nid", documentNumber: "1234567890" });
    expect(resultNid.documentLast4).toBe("7890");
    expect(resultNid.documentHashHint).not.toContain("1234567890");

    const resultPhone = sanitizeVerificationSubmission({ method: "phone", documentNumber: "+8801712345678" });
    expect(resultPhone.method).toBe("phone");
    expect(resultPhone.documentLast4).toBe("5678");
    expect(resultPhone.documentHashHint).not.toContain("01712345678");
  });

  it("strips private contact details (phone and address) from public profiles", () => {
    const rawProfile = {
      id: "usr-123",
      displayName: "Jane Doe",
      availabilityStatus: "available",
      isVerified: true,
      phoneNumber: "+8801700000000",
      address: "123 Dhaka Road",
    };
    const publicProfile = sanitizePublicProfile(rawProfile);
    expect(publicProfile).toEqual({
      id: "usr-123",
      displayName: "Jane Doe",
      availabilityStatus: "available",
      isVerified: true,
    });
    expect("phoneNumber" in publicProfile).toBe(false);
    expect("address" in publicProfile).toBe(false);
  });
});

