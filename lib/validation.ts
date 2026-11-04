/**
 * =========================================================================
 * EwuSwap Security & Input Validation Engine
 * =========================================================================
 * Provides comprehensive client & pre-mutation validation, strict type
 * checking, XSS mitigation, and URL sanitization.
 */

import { z } from "zod";

/**
 * UUID v4 / PostgreSQL standard UUID regex
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(id: unknown): boolean {
  if (typeof id !== "string") return false;
  return UUID_REGEX.test(id.trim());
}

/**
 * Strips potentially malicious HTML/JS payloads from text inputs to prevent Stored XSS.
 */
export function sanitizeText(input: unknown, maxLength = 2000): string {
  if (input === null || input === undefined) return "";
  let text = String(input).trim();

  // Strip script, style, iframe, object, embed tags and their content
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  text = text.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");

  // Strip dangerous inline event handlers (e.g. onload, onerror, onclick)
  text = text.replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, "");
  text = text.replace(/\bon\w+\s*=\s*[^>\s]+/gi, "");

  // Strip HTML tags
  text = text.replace(/<\/?[^>]+(>|$)/g, "");

  // Replace common dangerous control characters while preserving Bangla and standard unicode
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  if (maxLength && text.length > maxLength) {
    text = text.slice(0, maxLength);
  }

  return text.trim();
}

/**
 * Strictly sanitizes and verifies that a URL uses safe protocols (http/https).
 * Blocks dangerous schemes such as javascript:, data:, vbscript:, file:.
 */
export function sanitizeUrl(rawUrl: unknown): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  let trimmed = rawUrl.trim();

  // Handle common video/meeting links provided without protocol
  if (/^(meet\.google\.com|zoom\.us|teams\.microsoft\.com|chat\.whatsapp\.com)/i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  // Reject dangerous pseudo-protocols explicitly
  if (/^(javascript|data|vbscript|file|about):/i.test(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    // If it's not a valid URL format, return null
    return null;
  }
}

/**
 * Checks if a string represents a safe web URL
 */
export function isSafeUrl(rawUrl: unknown): boolean {
  return sanitizeUrl(rawUrl) !== null;
}

/**
 * Validates file upload metadata before sending to Supabase Storage
 */
export function validateAvatarFile(file: File | Blob): { valid: boolean; error?: string } {
  const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (file.size > MAX_AVATAR_BYTES) {
    return { valid: false, error: "Image file size exceeds the 5 MB limit." };
  }

  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return { valid: false, error: "Only JPEG, PNG, WebP, or GIF image formats are supported." };
  }

  if (file instanceof File) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif"];
    if (!allowedExtensions.includes(extension)) {
      return { valid: false, error: "Invalid image extension." };
    }
  }

  return { valid: true };
}

// =========================================================================
// ZOD SCHEMAS FOR CORE APPLICATION MUTATIONS
// =========================================================================

/**
 * 'Post a Service' / Skill Course Listing Input Schema
 */
export const ServiceListingInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(8, "Title must be at least 8 characters.")
    .max(120, "Title cannot exceed 120 characters.")
    .transform((val) => sanitizeText(val, 120)),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters.")
    .max(3000, "Description cannot exceed 3000 characters.")
    .transform((val) => sanitizeText(val, 3000)),
  category: z
    .string()
    .trim()
    .min(2, "Category is required.")
    .max(60, "Category name is too long.")
    .transform((val) => sanitizeText(val, 60)),
  exchangeType: z.enum(["paid", "skill_swap"]),
  durationMinutes: z
    .number()
    .int("Duration must be a whole number of minutes.")
    .min(15, "Minimum session duration is 15 minutes.")
    .max(480, "Maximum session duration is 480 minutes (8 hours)."),
  priceBdt: z
    .number()
    .min(10, "Minimum price is ৳10 BDT.")
    .max(100000, "Maximum price is ৳100,000 BDT.")
    .refine((val) => Number.isFinite(val), "Price must be a valid number."),
  deliveryMode: z.enum(["online", "on_campus", "both"]).default("online"),
  availability: z.string().optional().default("available"),
  availableSkills: z.array(z.string().transform((s) => sanitizeText(s, 50))).optional().default([]),
  learningGoals: z.array(z.string().transform((g) => sanitizeText(g, 50))).optional().default([]),
  learningOutcomes: z.array(
    z.string().trim().min(1).max(300).transform((outcome) => sanitizeText(outcome, 300))
  ).max(20, "You can add up to 20 learning outcomes.").optional().default([]),
});

/**
 * 'Meeting Link Hand-off' Schema
 */
export const MeetingDetailsInputSchema = z.object({
  transactionId: z
    .string()
    .trim()
    .refine(isValidUUID, "Invalid transaction UUID format."),
  meetingDetails: z
    .string()
    .trim()
    .min(3, "Enter meeting details or location.")
    .max(1000, "Meeting details cannot exceed 1000 characters.")
    .transform((val) => sanitizeText(val, 1000)),
});

/**
 * User Profile Update Schema
 */
export const ProfileUpdateInputSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(70, "Name cannot exceed 70 characters.")
    .transform((val) => sanitizeText(val, 70))
    .optional(),
  bio: z
    .string()
    .trim()
    .max(1000, "Bio cannot exceed 1000 characters.")
    .transform((val) => sanitizeText(val, 1000))
    .optional(),
  education: z
    .string()
    .trim()
    .max(150, "Education cannot exceed 150 characters.")
    .transform((val) => sanitizeText(val, 150))
    .optional(),
  skills: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return [];
      const arr = Array.isArray(val) ? val : val.split(",");
      return arr
        .map((s) => sanitizeText(s, 50))
        .filter(Boolean)
        .slice(0, 30);
    }),
  learningSkills: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return [];
      const arr = Array.isArray(val) ? val : val.split(",");
      return arr
        .map((s) => sanitizeText(s, 50))
        .filter(Boolean)
        .slice(0, 30);
    }),
  certifications: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return [];
      const arr = Array.isArray(val) ? val : val.split(",");
      return arr
        .map((s) => sanitizeText(s, 100))
        .filter(Boolean)
        .slice(0, 20);
    }),
  avatarUrl: z
    .string()
    .trim()
    .max(1000)
    .refine((url) => !url || isSafeUrl(url) || url.startsWith("/") || url.startsWith("blob:") || url.startsWith("data:image/"), {
      message: "Avatar URL must use a secure protocol.",
    })
    .optional(),
  avatar_url: z.string().optional(),
});

/**
 * Escrow Booking Creation Schema
 */
export const EscrowBookingInputSchema = z.object({
  payeeId: z.string().trim().refine(isValidUUID, "Payee ID must be a valid UUID."),
  courseId: z.string().trim().refine(isValidUUID, "Course ID must be a valid UUID.").optional(),
  amountBdt: z.number().min(10, "Minimum escrow amount is ৳10 BDT.").max(100000, "Maximum escrow amount is ৳100,000 BDT."),
  payerNote: z.string().trim().max(500, "Note cannot exceed 500 characters.").transform((val) => sanitizeText(val, 500)).optional(),
});

/**
 * Course/Service Review Submission Schema
 */
export const CourseReviewInputSchema = z.object({
  courseId: z.string().trim().refine(isValidUUID, "Invalid course ID."),
  rating: z.number().int().min(1, "Rating must be between 1 and 5 stars.").max(5, "Rating must be between 1 and 5 stars."),
  headline: z.string().trim().max(100, "Headline cannot exceed 100 characters.").transform((val) => sanitizeText(val, 100)).optional(),
  comment: z.string().trim().min(3, "Review comment must be at least 3 characters.").max(1000, "Review comment cannot exceed 1000 characters.").transform((val) => sanitizeText(val, 1000)),
});

/**
 * Community Post Schema
 */
export const CommunityPostInputSchema = z.object({
  body: z.string().trim().min(3, "Post body must be at least 3 characters.").max(2000, "Post body cannot exceed 2000 characters.").transform((val) => sanitizeText(val, 2000)),
  category: z.string().trim().min(1).max(50).transform((val) => sanitizeText(val, 50)),
});

/**
 * Escrow Dispute Schema
 */
export const EscrowDisputeInputSchema = z.object({
  transactionId: z.string().trim().refine(isValidUUID, "Invalid escrow transaction ID."),
  reason: z.string().trim().min(5, "Please explain the dispute reason (at least 5 characters).").max(1000, "Dispute reason cannot exceed 1000 characters.").transform((val) => sanitizeText(val, 1000)),
});

/**
 * Helper to extract human-readable error from Zod parsing
 */
export function formatValidationError(err: unknown): string {
  if (err instanceof z.ZodError) {
    return err.issues.map((i) => i.message).join(" ");
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Input validation failed.";
}
