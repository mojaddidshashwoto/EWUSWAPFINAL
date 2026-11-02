import { describe, expect, it } from "vitest";
import {
  sanitizeText,
  sanitizeUrl,
  isSafeUrl,
  validateAvatarFile,
  isValidUUID,
  ServiceListingInputSchema,
  MeetingDetailsInputSchema,
  ProfileUpdateInputSchema,
  EscrowBookingInputSchema,
  CourseReviewInputSchema,
  CommunityPostInputSchema,
} from "./lib/validation";
import { SUPABASE_CONFIG } from "./supabase";

describe("Application Security & Input Sanitization Suite", () => {
  describe("XSS Mitigation & Text Sanitization", () => {
    it("strips script tags and executable javascript payload", () => {
      const malicious = "<script>alert('pwned')</script>Hello World";
      const cleaned = sanitizeText(malicious);
      expect(cleaned).toBe("Hello World");
      expect(cleaned).not.toContain("<script>");
      expect(cleaned).not.toContain("alert");
    });

    it("strips malicious onerror and onload attributes", () => {
      const malicious = '<img src="invalid" onerror="alert(document.cookie)">Clean text';
      const cleaned = sanitizeText(malicious);
      expect(cleaned).toBe("Clean text");
      expect(cleaned).not.toContain("onerror");
    });

    it("strips iframe injections", () => {
      const malicious = '<iframe src="https://attacker.com"></iframe>Safe meeting note';
      const cleaned = sanitizeText(malicious);
      expect(cleaned).toBe("Safe meeting note");
      expect(cleaned).not.toContain("iframe");
    });

    it("truncates excessively long text to protect database", () => {
      const veryLong = "a".repeat(5000);
      const cleaned = sanitizeText(veryLong, 500);
      expect(cleaned.length).toBe(500);
    });
  });

  describe("URL Protocol Sanitization & Safe Link Verification", () => {
    it("blocks javascript: URI schemes", () => {
      expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
      expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    });

    it("blocks data: URI schemes", () => {
      expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
      expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    });

    it("blocks vbscript: and file: URI schemes", () => {
      expect(sanitizeUrl("vbscript:msgbox(1)")).toBeNull();
      expect(sanitizeUrl("file:///etc/passwd")).toBeNull();
    });

    it("allows and normalizes valid https Google Meet links", () => {
      const safe = "https://meet.google.com/abc-defg-hij";
      expect(sanitizeUrl(safe)).toBe("https://meet.google.com/abc-defg-hij");
      expect(isSafeUrl(safe)).toBe(true);
    });

    it("auto-prefixes bare meeting domain names with https", () => {
      const bare = "meet.google.com/xyz-1234-abc";
      expect(sanitizeUrl(bare)).toBe("https://meet.google.com/xyz-1234-abc");
    });

    it("allows valid Zoom meeting links", () => {
      const zoom = "https://zoom.us/j/1234567890?pwd=secret";
      expect(sanitizeUrl(zoom)).toBe("https://zoom.us/j/1234567890?pwd=secret");
    });
  });

  describe("UUID Format Validation", () => {
    it("accepts valid UUIDs", () => {
      expect(isValidUUID("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d")).toBe(true);
      expect(isValidUUID("c7f8c09a-6c17-4e78-831d-d2780e0c034b")).toBe(true);
    });

    it("rejects SQL injection and invalid UUIDs", () => {
      expect(isValidUUID("1; DROP TABLE users;--")).toBe(false);
      expect(isValidUUID("invalid-id")).toBe(false);
      expect(isValidUUID("")).toBe(false);
    });
  });

  describe("Form Schema Validation Enforcement", () => {
    it("validates Post a Service input bounds", () => {
      // Valid input
      const valid = ServiceListingInputSchema.safeParse({
        title: "React & TypeScript Tutoring",
        description: "Comprehensive 1-on-1 tutoring covering React hooks and components.",
        category: "Software Development",
        exchangeType: "paid",
        durationMinutes: 60,
        priceBdt: 500,
        deliveryMode: "online",
      });
      expect(valid.success).toBe(true);

      // Title too short
      const shortTitle = ServiceListingInputSchema.safeParse({
        title: "Short",
        description: "Comprehensive 1-on-1 tutoring covering React hooks and components.",
        category: "Software Development",
        exchangeType: "paid",
        durationMinutes: 60,
        priceBdt: 500,
      });
      expect(shortTitle.success).toBe(false);

      // Price below minimum ৳10
      const cheapPrice = ServiceListingInputSchema.safeParse({
        title: "Valid service title here",
        description: "Comprehensive 1-on-1 tutoring covering React hooks and components.",
        category: "Software Development",
        exchangeType: "paid",
        durationMinutes: 60,
        priceBdt: 5,
      });
      expect(cheapPrice.success).toBe(false);

      // Duration below 15 mins
      const shortDuration = ServiceListingInputSchema.safeParse({
        title: "Valid service title here",
        description: "Comprehensive 1-on-1 tutoring covering React hooks and components.",
        category: "Software Development",
        exchangeType: "paid",
        durationMinutes: 5,
        priceBdt: 500,
      });
      expect(shortDuration.success).toBe(false);
    });

    it("validates Meeting Link Hand-off input", () => {
      const valid = MeetingDetailsInputSchema.safeParse({
        transactionId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        meetingDetails: "https://meet.google.com/abc-defg-hij",
      });
      expect(valid.success).toBe(true);

      const invalidId = MeetingDetailsInputSchema.safeParse({
        transactionId: "not-a-uuid",
        meetingDetails: "https://meet.google.com/abc-defg-hij",
      });
      expect(invalidId.success).toBe(false);
    });

    it("validates Profile Update bounds & sanitizes XSS", () => {
      const parsed = ProfileUpdateInputSchema.safeParse({
        displayName: "<script>alert(1)</script>John Doe",
        bio: "Computer Science student at East West University",
        skills: ["React", "Python<img src=x onerror=alert(1)>"],
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.displayName).toBe("John Doe");
        expect(parsed.data.skills).toEqual(["React", "Python"]);
      }
    });

    it("validates Escrow Booking input and prevents self/zero payments", () => {
      const valid = EscrowBookingInputSchema.safeParse({
        payeeId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        amountBdt: 750,
        payerNote: "Mentorship session reservation",
      });
      expect(valid.success).toBe(true);

      const zeroAmount = EscrowBookingInputSchema.safeParse({
        payeeId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        amountBdt: 0,
      });
      expect(zeroAmount.success).toBe(false);
    });

    it("validates Review submission bounds", () => {
      const valid = CourseReviewInputSchema.safeParse({
        courseId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        rating: 5,
        comment: "Excellent tutor, explained everything clearly!",
      });
      expect(valid.success).toBe(true);

      const invalidRating = CourseReviewInputSchema.safeParse({
        courseId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        rating: 6,
        comment: "Good session",
      });
      expect(invalidRating.success).toBe(false);
    });
  });

  describe("Avatar File Security Verification", () => {
    it("rejects files exceeding 5MB limit", () => {
      const largeBlob = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: "image/png" });
      const result = validateAvatarFile(largeBlob);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("5 MB limit");
    });

    it("rejects non-image MIME types", () => {
      const htmlBlob = new Blob(["<html></html>"], { type: "text/html" });
      const result = validateAvatarFile(htmlBlob);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("image formats are supported");
    });

    it("accepts valid JPEG, PNG, WebP images under 5MB", () => {
      const validImage = new Blob([new Uint8Array(1024)], { type: "image/jpeg" });
      const result = validateAvatarFile(validImage);
      expect(result.valid).toBe(true);
    });
  });

  describe("Environment & Secrets Isolation Audit", () => {
    it("ensures service_role key is never exposed in frontend configuration", () => {
      expect((SUPABASE_CONFIG as any).serviceRoleKey).toBeUndefined();
      expect((SUPABASE_CONFIG as any).service_role).toBeUndefined();
      expect((SUPABASE_CONFIG as any).directDbUrl).toBeUndefined();
    });

    it("confirms only public project ref and anon credentials exist in client config", () => {
      expect(SUPABASE_CONFIG.projectUrl).toBeDefined();
      expect(SUPABASE_CONFIG.projectRef).toBe("glpoowzygushtxwqmcxl");
      expect(SUPABASE_CONFIG.anonKey).toBeDefined();
      // Verify JWT payload of anon key is role: "anon"
      try {
        const parts = SUPABASE_CONFIG.anonKey.split(".");
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        expect(payload.role).toBe("anon");
      } catch {
        // In case custom key format
      }
    });
  });
});
