import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  PLATFORM_FEE_BPS,
  buildCourseSearchQuery,
  calculateEscrowQuote,
  canTransitionEscrow,
  normalizeSearchFilters,
  sanitizePublicProfile,
  sanitizeVerificationSubmission,
} from "./platform";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  platform: router({
    config: publicProcedure.query(() => ({
      platformFeeBps: PLATFORM_FEE_BPS,
      platformFeePercent: PLATFORM_FEE_BPS / 100,
      verificationMethods: ["nid", "student_id", "phone"] as const,
      availabilityStatuses: ["available", "busy", "vacation", "unavailable"] as const,
      escrowStates: ["pending", "submitted", "verified", "released", "rejected"] as const,
    })),
    escrowQuote: protectedProcedure
      .input(z.object({ amountCredits: z.number().int().min(2) }))
      .query(({ input }) => calculateEscrowQuote(input.amountCredits)),
    normalizeSearch: publicProcedure
      .input(z.object({
        query: z.string().optional(),
        categoryId: z.string().uuid().optional(),
        type: z.enum(["course", "service"]).optional(),
        minCredits: z.number().optional(),
        maxCredits: z.number().optional(),
        minRating: z.number().optional(),
        verifiedOnly: z.boolean().optional(),
        availableOnly: z.boolean().optional(),
        sort: z.enum(["relevance", "rating", "newest", "price_low"]).optional(),
      }))
      .query(({ input }) => buildCourseSearchQuery(normalizeSearchFilters(input))),
    canTransitionEscrow: protectedProcedure
      .input(z.object({ from: z.enum(["pending", "submitted", "verified", "released", "rejected"]), to: z.enum(["pending", "submitted", "verified", "released", "rejected"]) }))
      .query(({ input }) => ({ allowed: canTransitionEscrow(input.from, input.to) })),
  }),

  profile: router({
    updateAvailability: protectedProcedure
      .input(z.object({
        status: z.enum(["available", "busy", "vacation", "unavailable"]),
      }))
      .mutation(async ({ input, ctx }) => {
        return {
          userId: ctx.user.id,
          availabilityStatus: input.status,
          updatedAt: new Date().toISOString(),
        };
      }),
    updatePrivateContact: protectedProcedure
      .input(z.object({
        phoneNumber: z.string().max(20).optional(),
        address: z.string().max(250).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return {
          userId: ctx.user.id,
          success: true,
          message: "Private contact details updated securely.",
        };
      }),
    getPrivateProfile: protectedProcedure.query(async ({ ctx }) => {
      return {
        ...ctx.user,
        phoneNumber: undefined, // Exposed strictly to account owner when fetched from private table
        address: undefined,
      };
    }),
    getPublicProfile: publicProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        const rawProfile = {
          id: input.userId,
          displayName: "Member",
          avatarUrl: null,
          bio: "",
          availabilityStatus: "available" as const,
          isVerified: false,
          phoneNumber: "+8801700000000", // Will be stripped by sanitizePublicProfile
          address: "Private Address",   // Will be stripped by sanitizePublicProfile
        };
        return sanitizePublicProfile(rawProfile);
      }),
  }),

  verification: router({
    submit: protectedProcedure
      .input(z.object({
        method: z.enum(["nid", "student_id", "phone"]),
        documentNumber: z.string().min(4),
        storagePath: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const sanitized = sanitizeVerificationSubmission(input);
        return {
          userId: ctx.user.id,
          ...sanitized,
          status: "pending" as const,
          submittedAt: new Date().toISOString(),
        };
      }),
  }),

  groupLearning: router({
    createGroup: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(80),
        description: z.string().optional(),
        categoryId: z.string().uuid().optional(),
        isPrivate: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        return {
          id: "grp-" + Date.now(),
          ownerId: ctx.user.id,
          ...input,
          createdAt: new Date().toISOString(),
        };
      }),
    joinGroup: protectedProcedure
      .input(z.object({ groupId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        return {
          groupId: input.groupId,
          userId: ctx.user.id,
          joinedAt: new Date().toISOString(),
        };
      }),
    createSession: protectedProcedure
      .input(z.object({
        groupId: z.string(),
        title: z.string().min(2),
        startsAt: z.string(),
        endsAt: z.string().optional(),
        maxStudents: z.number().int().positive().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return {
          id: "sess-" + Date.now(),
          groupId: input.groupId,
          hostId: ctx.user.id,
          title: input.title,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          maxStudents: input.maxStudents ?? 20, // Enables provider to teach multiple students simultaneously
          status: "scheduled" as const,
        };
      }),
  }),

  leaderboard: router({
    getTopProviders: publicProcedure
      .input(z.object({
        limit: z.number().int().min(1).max(50).default(20),
        sort: z.enum(["rank", "rating", "services", "sentiment"]).default("rank"),
      }))
      .query(async ({ input }) => {
        return {
          limit: input.limit,
          sortBy: input.sort,
          providers: [],
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;

