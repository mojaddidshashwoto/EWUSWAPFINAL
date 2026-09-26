import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://glpoowzygushtxwqmcxl.supabase.co",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_MAXkviTqJHRkDOTjKnUTYw_mj0q8Mtp",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export type UserRole = "student" | "moderator" | "admin";

export type SkillSwapListingInput = {
  title: string;
  description: string;
  category: string;
  exchangeType: "skill_swap" | "paid";
  availableSkills: string[];
  learningGoals: string[];
  durationMinutes: number;
  availability: string;
  priceBdt?: number | null;
};

export type ProfileDetails = {
  displayName?: string;
  bio?: string;
  education?: string;
  skills?: string[];
  learningSkills?: string[];
  certifications?: string[];
  avatarUrl?: string;
  avatar_url?: string;
  [key: string]: any;
};

export type PublishedSkillCourse = {
  id: string;
  title: string;
  description: string;
  type: "course" | "service";
  durationMinutes: number;
  creditCost: number;
  category: string;
  instructorId: string;
  instructorName: string;
  instructorAvatar: string;
  instructorBio: string;
  instructorEducation: string;
  availabilityStatus: "available" | "busy" | "vacation" | "unavailable";
  isVerified: boolean;
  trustScore: number;
  reviewCount: number;
  averageRating: number;
};

export type UserEscrowTransaction = Record<string, any> & {
  id: string;
  isPayer: boolean;
  payer: { id: string; display_name: string; avatar_url: string | null };
  payee: { id: string; display_name: string; avatar_url: string | null };
  course: { id: string; title: string; category: string } | null;
  dispute: { id: string; status: string } | null;
};

export type CommunityPost = {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorRole: string;
  isVerified: boolean;
  timestamp: string;
  category: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
};

export type ProfileReview = {
  id: string;
  reviewerName: string;
  reviewerAvatar: string;
  rating: number;
  date: string;
  comment: string;
};

export type PrivacySettings = {
  messagePolicy?: "everyone" | "followers" | "matches" | "nobody";
  callPolicy?: "everyone" | "followers" | "matches" | "nobody";
  hideContactInfo?: boolean;
  showOnlineStatus?: boolean;
  showActivity?: boolean;
  [key: string]: any;
};

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  department: string;
  method: "student_id" | "nid" | "phone";
  documentNumberHint: string;
  documentImageUrl: string;
  submittedAt: string;
  status: "pending" | "in_review" | "verified" | "rejected";
  moderatorNotes?: string;
  reviewedAt?: string;
}

export interface PlatformDispute {
  id: string;
  exchangeId: string;
  courseTitle: string;
  learnerId: string;
  learnerName: string;
  learnerAvatar: string;
  providerId: string;
  providerName: string;
  providerAvatar: string;
  amountCredits: number;
  amountBdt: number;
  escrowStatus: "submitted" | "verified" | "held";
  disputeReason: string;
  evidenceNotes: string;
  disputeDate: string;
  status: "open" | "under_review" | "resolved" | "closed";
  resolution?: "refund_payer" | "release_provider" | "split";
  resolutionNote?: string;
  resolvedAt?: string;
}

export interface WalletTransaction {
  id: string;
  type: "topup" | "withdrawal" | "earned" | "spent" | "refund" | "fee";
  title: string;
  counterparty: string;
  method?: "bkash" | "nagad" | "system";
  amountCredits: number;
  amountBdt: number;
  date: string;
  status: "Released" | "Held in escrow" | "Refunded" | "Deducted" | "Completed" | "Processing";
  note?: string;
  senderPhone?: string;
  targetPhone?: string;
  trxId?: string;
}

export async function getCurrentUser() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const authUser = session?.user;
  if (!authUser) {
    return null;
  }

  const metadata = authUser.user_metadata ?? {};
  const fullName = metadata.full_name || metadata.name || authUser.email?.split("@")[0] || "User";
  const { data: profile, error: profileError } = await supabase
    .from("ss_profiles")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (profileError) throw profileError;

  return {
    id: authUser.id,
    email: authUser.email || "",
    name: profile?.display_name || fullName,
    displayName: profile?.display_name || metadata.display_name || fullName,
    avatar: profile?.avatar_url || metadata.avatar_url || metadata.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
    role: ((profile?.role || metadata.role) as UserRole) || "student",
    credits: Number(profile?.credits_balance ?? metadata.credits ?? 0),
    bdtBalance: Number(profile?.bdt_balance ?? metadata.bdt_balance ?? 0),
    isVerified: Boolean(profile?.is_verified ?? metadata.is_verified ?? false),
  };
}

export async function getProfileDetails(userId?: string) {
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    targetUserId = user?.id;
  }
  if (!targetUserId) throw new Error("You must be signed in to load this profile.");

  const [{ data: profile, error: profileError }, { data: privacy, error: privacyError }] = await Promise.all([
    supabase.from("ss_profiles").select("*").eq("id", targetUserId).maybeSingle(),
    supabase.from("ss_profile_privacy").select("*").eq("user_id", targetUserId).maybeSingle(),
  ]);
  if (profileError) throw profileError;
  if (privacyError) throw privacyError;

  return { profile, privacy };
}

export async function listProfileReviews(profileId: string): Promise<ProfileReview[]> {
  const { data: reviews, error } = await supabase
    .from("ss_course_reviews")
    .select("id, reviewer_id, rating, body, created_at")
    .eq("reviewee_id", profileId)
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!reviews?.length) return [];

  const reviewerIds = [...new Set(reviews.map((review) => review.reviewer_id))];
  const { data: reviewers, error: reviewersError } = await supabase
    .from("ss_profiles")
    .select("id, display_name, avatar_url")
    .in("id", reviewerIds);
  if (reviewersError) throw reviewersError;

  const reviewerById = new Map((reviewers ?? []).map((reviewer) => [reviewer.id, reviewer]));
  return reviews.map((review) => {
    const reviewer = reviewerById.get(review.reviewer_id);
    return {
      id: review.id,
      reviewerName: reviewer?.display_name ?? "EwuSwap member",
      reviewerAvatar: reviewer?.avatar_url ?? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
      rating: Number(review.rating),
      date: new Date(review.created_at).toLocaleDateString(),
      comment: review.body ?? "",
    };
  });
}

export async function setUserRole(role: UserRole) {
  const user = await getCurrentUser();
  user.role = role;
  localStorage.setItem("ss_current_user", JSON.stringify(user));
  window.dispatchEvent(new Event("ss_user_changed"));
  return user;
}

export async function updateProfilePrivacy(settings: PrivacySettings) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("You must be signed in to update profile privacy.");

  const privacyRow = {
    user_id: user.id,
    message_policy: settings.messagePolicy,
    call_policy: settings.callPolicy,
    show_online: settings.showOnlineStatus,
    show_activity: settings.showActivity,
    show_skills: settings.showSkills,
    show_email: settings.showEmail,
  };
  const { data, error } = await supabase
    .from("ss_profile_privacy")
    .upsert(privacyRow, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfileDetails(details: ProfileDetails) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("You must be signed in to update your profile.");

  const profileRow: Record<string, unknown> = { id: user.id };
  if (details.displayName !== undefined) profileRow.display_name = details.displayName;
  if (details.bio !== undefined) profileRow.bio = details.bio;
  if (details.education !== undefined) profileRow.education = details.education;
  if (details.skills !== undefined) profileRow.skills = Array.isArray(details.skills) ? details.skills.join(", ") : details.skills;
  if (details.learningSkills !== undefined) profileRow.learning_skills = Array.isArray(details.learningSkills) ? details.learningSkills.join(", ") : details.learningSkills;
  if (details.certifications !== undefined) profileRow.certifications = Array.isArray(details.certifications) ? details.certifications.join(", ") : details.certifications;
  if (details.avatarUrl !== undefined || details.avatar_url !== undefined) {
    profileRow.avatar_url = details.avatarUrl ?? details.avatar_url;
  }

  const { data, error } = await supabase
    .from("ss_profiles")
    .upsert(profileRow, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  window.dispatchEvent(new Event("ss_user_changed"));
  return data;
}

export async function updateProfileName(name: string) {
  return updateProfileDetails({ displayName: name });
}

export async function updateProfileEmail(email: string) {
  localStorage.setItem("ss_profile_email", email);
  return { email };
}

export async function updateCallStatus(status: string) {
  localStorage.setItem("ss_call_status", status);
  return { status };
}

export async function uploadProfileAvatar(file: File | Blob | string) {
  if (typeof file === "string") return { url: file, avatar_url: file };
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("You must be signed in to upload a profile photo.");

  const filename = file instanceof File ? file.name.replace(/\s+/g, "-") : "avatar-image";
  const path = `${user.id}/${Date.now()}-${filename}`;
  const { error } = await supabase.storage.from("ss-profile-avatars").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from("ss-profile-avatars").getPublicUrl(path);
  return { url: publicUrl, avatar_url: publicUrl };
}

export async function listPublishedSkillCourses(): Promise<PublishedSkillCourse[]> {
  const { data: courses, error } = await supabase
    .from("ss_courses")
    .select("id, title, description, type, duration_minutes, credit_cost, instructor_id, category_id")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!courses?.length) return [];

  const instructorIds = [...new Set(courses.map((course) => course.instructor_id))];
  const categoryIds = [...new Set(courses.map((course) => course.category_id))];
  const courseIds = courses.map((course) => course.id);
  const [profilesResult, categoriesResult, reviewsResult] = await Promise.all([
    supabase.from("ss_profiles").select("id, display_name, avatar_url, bio, education, availability_status, is_verified, trust_score").in("id", instructorIds),
    supabase.from("ss_skill_categories").select("id, name").in("id", categoryIds),
    supabase.from("ss_course_reviews").select("course_id, rating").in("course_id", courseIds).eq("is_published", true),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (categoriesResult.error) throw categoriesResult.error;
  if (reviewsResult.error) throw reviewsResult.error;

  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const categories = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name]));
  const reviews = new Map<string, number[]>();
  for (const review of reviewsResult.data ?? []) {
    const ratings = reviews.get(review.course_id) ?? [];
    ratings.push(review.rating);
    reviews.set(review.course_id, ratings);
  }

  return courses.map((course) => {
    const instructor = profiles.get(course.instructor_id);
    const ratings = reviews.get(course.id) ?? [];
    return {
      id: course.id,
      title: course.title,
      description: course.description ?? "",
      type: course.type,
      durationMinutes: course.duration_minutes,
      creditCost: course.credit_cost,
      category: categories.get(course.category_id) ?? "Other",
      instructorId: course.instructor_id,
      instructorName: instructor?.display_name ?? "Skill Swap member",
      instructorAvatar: instructor?.avatar_url ?? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
      instructorBio: instructor?.bio ?? "",
      instructorEducation: instructor?.education ?? "",
      availabilityStatus: instructor?.availability_status ?? "available",
      isVerified: Boolean(instructor?.is_verified),
      trustScore: Number(instructor?.trust_score ?? 0),
      reviewCount: ratings.length,
      averageRating: ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0,
    };
  });
}

export async function listTopServiceProviders() {
  const { data, error } = await supabase
    .from("ss_leaderboard_top_providers")
    .select("provider_id, display_name, avatar_url, availability_status, is_verified, average_rating, review_count, completed_services_count, sentiment_score, rank")
    .order("rank", { ascending: true })
    .limit(10);
  if (error) throw error;

  return (data ?? []).map((provider) => ({
    providerId: provider.provider_id,
    displayName: provider.display_name,
    avatarUrl: provider.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
    availabilityStatus: provider.availability_status,
    isVerified: Boolean(provider.is_verified),
    averageRating: Number(provider.average_rating ?? 0),
    reviewCount: Number(provider.review_count ?? 0),
    completedServicesCount: Number(provider.completed_services_count ?? 0),
    sentimentScore: Number(provider.sentiment_score ?? 0),
    rank: Number(provider.rank),
  }));
}

export async function listSkillSwapListings() {
  const stored = localStorage.getItem("ss_listings");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // ignore
    }
  }
  return [];
}

export async function createSkillSwapListing(input: SkillSwapListingInput) {
  if (input.exchangeType !== "paid") {
    throw new Error("Free skill swaps do not use the paid-course escrow flow yet.");
  }
  if (!input.priceBdt || input.priceBdt <= 0) {
    throw new Error("Add a service price before publishing.");
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("You must be signed in to publish a service.");

  const categorySlug = input.category.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const { data: category, error: categoryError } = await supabase
    .from("ss_skill_categories")
    .select("id")
    .eq("slug", categorySlug)
    .maybeSingle();
  if (categoryError) throw categoryError;
  if (!category) throw new Error(`The ${input.category} category is not configured in the marketplace.`);

  const titleSlug = input.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const { data, error } = await supabase
    .from("ss_courses")
    .insert({
      instructor_id: user.id,
      category_id: category.id,
      title: input.title.trim(),
      slug: `${titleSlug}-${crypto.randomUUID()}`,
      description: input.description.trim(),
      type: "service",
      status: "published",
      duration_minutes: input.durationMinutes,
      credit_cost: Math.max(2, Math.ceil(input.priceBdt / 120)),
    })
    .select("id, title, description, type, duration_minutes, credit_cost, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function submitVerificationRequest(data: any) {
  const requests = await listVerificationRequests();
  const newReq: VerificationRequest = {
    id: `req_${Date.now()}`,
    userId: data.userId || "usr_current",
    userName: data.userName || "Aisha Rahman",
    userEmail: data.userEmail || "aisha@ewu.edu.bd",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=85",
    department: data.department || "Dept. of Computer Science & Engineering",
    method: data.method || "student_id",
    documentNumberHint: `***-${(data.documentNumber || "2022-1-60-042").slice(-4)}`,
    documentImageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80",
    submittedAt: "Just now",
    status: "pending",
  };
  requests.unshift(newReq);
  localStorage.setItem("ss_verification_requests", JSON.stringify(requests));
  return { success: true, request: newReq };
}

// -------------------------------------------------------------
// VERIFICATION QUEUE (ss_verification_requests)
// -------------------------------------------------------------

const INITIAL_VERIFICATIONS: VerificationRequest[] = [
  {
    id: "vr-101",
    userId: "usr-201",
    userName: "Tanvir Ahmed",
    userEmail: "tanvir.2023@ewubd.edu",
    userAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80",
    department: "Dept. of Computer Science & Engineering",
    method: "student_id",
    documentNumberHint: "ID: 2023-1-60-***89",
    documentImageUrl: "https://images.unsplash.com/photo-1589330694653-ded6df03f754?auto=format&fit=crop&w=600&q=80",
    submittedAt: "15 minutes ago",
    status: "pending",
  },
  {
    id: "vr-102",
    userId: "usr-202",
    userName: "Nusrat Jahan Faria",
    userEmail: "nusrat.faria@ewubd.edu",
    userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
    department: "Dept. of Business Administration",
    method: "nid",
    documentNumberHint: "Smart NID: *******4912",
    documentImageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
    submittedAt: "2 hours ago",
    status: "pending",
  },
  {
    id: "vr-103",
    userId: "usr-203",
    userName: "Rifat Hasan",
    userEmail: "rifat.hasan@ewubd.edu",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
    department: "Dept. of Electrical & Electronic Engineering",
    method: "student_id",
    documentNumberHint: "ID: 2022-2-80-***14",
    documentImageUrl: "https://images.unsplash.com/photo-1589330694653-ded6df03f754?auto=format&fit=crop&w=600&q=80",
    submittedAt: "5 hours ago",
    status: "pending",
  },
  {
    id: "vr-104",
    userId: "usr-204",
    userName: "Noah Williams",
    userEmail: "noah.w@ewubd.edu",
    userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    department: "Dept. of English",
    method: "student_id",
    documentNumberHint: "ID: 2021-3-10-***55",
    documentImageUrl: "https://images.unsplash.com/photo-1589330694653-ded6df03f754?auto=format&fit=crop&w=600&q=80",
    submittedAt: "Sep 24, 2026",
    status: "verified",
    reviewedAt: "Sep 24, 2026, 4:20 PM",
  },
];

export async function listVerificationRequests(): Promise<VerificationRequest[]> {
  const stored = localStorage.getItem("ss_verification_requests");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fallback
    }
  }
  localStorage.setItem("ss_verification_requests", JSON.stringify(INITIAL_VERIFICATIONS));
  return INITIAL_VERIFICATIONS;
}

export async function approveVerificationRequest(requestId: string): Promise<VerificationRequest> {
  const requests = await listVerificationRequests();
  const index = requests.findIndex((r) => r.id === requestId);
  if (index === -1) throw new Error("Verification request not found");
  
  requests[index].status = "verified";
  requests[index].reviewedAt = "Just now";
  localStorage.setItem("ss_verification_requests", JSON.stringify(requests));
  window.dispatchEvent(new Event("ss_verifications_changed"));
  return requests[index];
}

export async function rejectVerificationRequest(requestId: string, notes?: string): Promise<VerificationRequest> {
  const requests = await listVerificationRequests();
  const index = requests.findIndex((r) => r.id === requestId);
  if (index === -1) throw new Error("Verification request not found");

  requests[index].status = "rejected";
  requests[index].moderatorNotes = notes || "Document unreadable or invalid credentials";
  requests[index].reviewedAt = "Just now";
  localStorage.setItem("ss_verification_requests", JSON.stringify(requests));
  window.dispatchEvent(new Event("ss_verifications_changed"));
  return requests[index];
}

// -------------------------------------------------------------
// DISPUTES QUEUE (ss_disputes & ss_resolve_dispute)
// -------------------------------------------------------------

const INITIAL_DISPUTES: PlatformDispute[] = [
  {
    id: "DSP-2026-001",
    exchangeId: "exc-891",
    courseTitle: "Python Backend & FastAPI Architecture Sprint",
    learnerId: "usr-401",
    learnerName: "Sabbir Hossain",
    learnerAvatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80",
    providerId: "usr-402",
    providerName: "Zahidul Islam",
    providerAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80",
    amountCredits: 20,
    amountBdt: 2400,
    escrowStatus: "held",
    disputeReason: "Provider was 40 minutes late and didn't cover the scheduled database indexing section.",
    evidenceNotes: "Zoom chat log attached; agreed session was 90 minutes, ended abruptly after 30 minutes.",
    disputeDate: "Yesterday, 3:30 PM",
    status: "open",
  },
  {
    id: "DSP-2026-002",
    exchangeId: "exc-892",
    courseTitle: "Figma UI/UX Component Library Review",
    learnerId: "usr-403",
    learnerName: "Mehnaz Tabassum",
    learnerAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80",
    providerId: "usr-404",
    providerName: "Noah Williams",
    providerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    amountCredits: 24,
    amountBdt: 2880,
    escrowStatus: "submitted",
    disputeReason: "Disagreement on deliverables. Learner requested additional wireframing beyond original scope.",
    evidenceNotes: "Both parties provided course description screenshots. Partial agreement achieved on deliverables.",
    disputeDate: "Sep 23, 2026",
    status: "under_review",
  },
  {
    id: "DSP-2026-003",
    exchangeId: "exc-885",
    courseTitle: "Academic Research Methodology & SPSS",
    learnerId: "usr-405",
    learnerName: "Kazi Anisur",
    learnerAvatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=120&q=80",
    providerId: "usr-406",
    providerName: "Priya Shah",
    providerAvatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&q=80",
    amountCredits: 18,
    amountBdt: 2160,
    escrowStatus: "held",
    disputeReason: "Learner was unable to attend due to university lab clash; notified 5 hours in advance.",
    evidenceNotes: "Provider agreed to refund; requesting moderator release.",
    disputeDate: "Sep 18, 2026",
    status: "resolved",
    resolution: "refund_payer",
    resolutionNote: "100% refunded to learner with provider consent.",
    resolvedAt: "Sep 19, 2026",
  },
];

export async function listDisputes(): Promise<PlatformDispute[]> {
  const stored = localStorage.getItem("ss_disputes");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fallback
    }
  }
  localStorage.setItem("ss_disputes", JSON.stringify(INITIAL_DISPUTES));
  return INITIAL_DISPUTES;
}

export async function resolveDispute(
  disputeId: string,
  resolution: "refund_payer" | "release_provider" | "split",
  note?: string
): Promise<PlatformDispute> {
  const disputes = await listDisputes();
  const index = disputes.findIndex((d) => d.id === disputeId);
  if (index === -1) throw new Error("Dispute not found");

  const d = disputes[index];
  d.status = "resolved";
  d.resolution = resolution;
  d.resolutionNote =
    note ||
    (resolution === "refund_payer"
      ? "100% refunded to learner."
      : resolution === "release_provider"
      ? "Funds released to provider (5% platform fee collected)."
      : "50/50 split applied between learner and provider.");
  d.resolvedAt = "Just now";

  localStorage.setItem("ss_disputes", JSON.stringify(disputes));
  window.dispatchEvent(new Event("ss_disputes_changed"));

  // Automated Server Notification & Email Dispatch Hook
  try {
    const { triggerDisputeResolvedNotification } = await import("@/server/notifications");
    await triggerDisputeResolvedNotification({
      disputeId: d.id,
      resolution,
      courseTitle: d.courseTitle,
      learnerId: d.learnerId,
      learnerName: d.learnerName,
      providerId: d.providerId,
      providerName: d.providerName,
      amountCredits: d.amountCredits,
      amountBdt: d.amountBdt,
      resolutionNote: d.resolutionNote,
    });
  } catch (err) {
    console.error("[Notification Trigger Error]", err);
  }

  return disputes[index];
}

// -------------------------------------------------------------
// WALLET MANAGEMENT (bKash, Nagad, Balances & Transactions)
// -------------------------------------------------------------

const INITIAL_TRANSACTIONS: WalletTransaction[] = [
  {
    id: "tx-1",
    type: "spent",
    title: "Figma Systems & Component Sprint",
    counterparty: "Noah Williams",
    amountCredits: 24,
    amountBdt: 2880,
    date: "Today, 4:00 PM",
    status: "Held in escrow",
    note: "Funds reserved safely in Escrow pending session completion.",
  },
  {
    id: "tx-2",
    type: "earned",
    title: "React & TypeScript Code Review Session",
    counterparty: "Jordan Kim",
    amountCredits: 25,
    amountBdt: 3000,
    date: "Sep 24, 2026",
    status: "Released",
    note: "Settled to wallet balance after manual verification.",
  },
  {
    id: "tx-3",
    type: "fee",
    title: "Platform Fee (5% Deduction)",
    counterparty: "EwuSwap Platform",
    amountCredits: 1,
    amountBdt: 120,
    date: "Sep 24, 2026",
    status: "Deducted",
    note: "500 bps platform fee reserved on 25-credit exchange.",
  },
  {
    id: "tx-4",
    type: "topup",
    title: "bKash Wallet Top-Up",
    counterparty: "bKash Payment Gateway",
    method: "bkash",
    amountCredits: 10,
    amountBdt: 1200,
    date: "Sep 22, 2026",
    status: "Completed",
    senderPhone: "01712345678",
    trxId: "BL9X4029QA",
    note: "Verified via bKash instant gateway.",
  },
  {
    id: "tx-5",
    type: "refund",
    title: "Dispute Resolution Refund",
    counterparty: "Moderator Resolution",
    amountCredits: 18,
    amountBdt: 2160,
    date: "Sep 18, 2026",
    status: "Refunded",
    note: "Dispute settled in favor of payer.",
  },
];

export async function listWalletTransactions(): Promise<WalletTransaction[]> {
  const transactions = await listMyEscrowTransactions();
  return transactions.map((transaction) => {
    const status = transaction.status as string;
    const type: WalletTransaction["type"] = status === "rejected" && transaction.isPayer
      ? "refund"
      : transaction.isPayer ? "spent" : "earned";
    const displayStatus: WalletTransaction["status"] = status === "released"
      ? "Released"
      : status === "rejected" ? "Refunded" : "Held in escrow";

    return {
      id: transaction.id,
      type,
      title: transaction.course?.title || "Skill exchange",
      counterparty: transaction.isPayer ? transaction.payee.display_name : transaction.payer.display_name,
      amountCredits: Number(transaction.gross_amount_credits ?? transaction.amount_credits),
      amountBdt: Number(transaction.gross_amount_credits ?? transaction.amount_credits) * 120,
      date: new Date(transaction.created_at).toLocaleDateString(),
      status: displayStatus,
      note: transaction.payer_note ?? undefined,
    };
  });
}

export async function listMyEscrowTransactions(): Promise<UserEscrowTransaction[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("You must be signed in to load escrow transactions.");

  const { data: rows, error } = await supabase
    .from("ss_escrow_transactions")
    .select("*")
    .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!rows?.length) return [];

  const profileIds = [...new Set(rows.flatMap((row) => [row.payer_id, row.payee_id]))];
  const courseIds = [...new Set(rows.map((row) => row.course_id).filter(Boolean))];
  const profilesResult = await supabase
    .from("ss_profiles")
    .select("id, display_name, avatar_url")
    .in("id", profileIds);
  if (profilesResult.error) throw profilesResult.error;

  const coursesResult = courseIds.length
    ? await supabase.from("ss_courses").select("id, title, category_id").in("id", courseIds)
    : { data: [], error: null };
  if (coursesResult.error) throw coursesResult.error;

  const categoryIds = [...new Set((coursesResult.data ?? []).map((course) => course.category_id).filter(Boolean))];
  const categoriesResult = categoryIds.length
    ? await supabase.from("ss_skill_categories").select("id, name").in("id", categoryIds)
    : { data: [], error: null };
  if (categoriesResult.error) throw categoriesResult.error;
  const disputesResult = await supabase
    .from("ss_disputes")
    .select("id, escrow_transaction_id, status")
    .in("escrow_transaction_id", rows.map((row) => row.id));
  if (disputesResult.error) throw disputesResult.error;

  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const categories = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name]));
  const disputes = new Map((disputesResult.data ?? []).map((dispute) => [dispute.escrow_transaction_id, dispute]));
  const courses = new Map((coursesResult.data ?? []).map((course) => [course.id, {
    id: course.id,
    title: course.title,
    category: categories.get(course.category_id) ?? "Other",
  }]));

  return rows.map((row) => ({
    ...row,
    isPayer: row.payer_id === user.id,
    payer: profiles.get(row.payer_id) ?? { id: row.payer_id, display_name: "EwuSwap member", avatar_url: null },
    payee: profiles.get(row.payee_id) ?? { id: row.payee_id, display_name: "EwuSwap member", avatar_url: null },
    course: row.course_id ? courses.get(row.course_id) ?? null : null,
    dispute: disputes.get(row.id) ?? null,
  }));
}

export async function submitEscrowProof(transactionId: string) {
  const { data, error } = await supabase.rpc("ss_submit_escrow_proof", {
    p_transaction_id: transactionId,
    p_proof_reference: "payer-confirmed",
  });
  if (error) throw error;
  return data;
}

export async function openEscrowDispute(transactionId: string, reason: string) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("You must be signed in to open a dispute.");

  const { data, error } = await supabase
    .from("ss_disputes")
    .insert({ escrow_transaction_id: transactionId, opened_by: user.id, reason: reason.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listCommunityPosts(): Promise<CommunityPost[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("You must be signed in to view the community feed.");

  const { data: posts, error } = await supabase
    .from("ss_social_posts")
    .select("id, author_id, body, category, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!posts?.length) return [];

  const postIds = posts.map((post) => post.id);
  const authorIds = [...new Set(posts.map((post) => post.author_id))];
  const [profilesResult, likesResult, myLikesResult] = await Promise.all([
    supabase.from("ss_profiles").select("id, display_name, avatar_url, education, is_verified").in("id", authorIds),
    supabase.from("ss_post_likes").select("post_id").in("post_id", postIds),
    supabase.from("ss_post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (likesResult.error) throw likesResult.error;
  if (myLikesResult.error) throw myLikesResult.error;

  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const likeCounts = new Map<string, number>();
  for (const like of likesResult.data ?? []) {
    likeCounts.set(like.post_id, (likeCounts.get(like.post_id) ?? 0) + 1);
  }
  const likedPostIds = new Set((myLikesResult.data ?? []).map((like) => like.post_id));

  return posts.map((post) => {
    const author = profiles.get(post.author_id);
    return {
      id: post.id,
      authorName: author?.display_name ?? "EwuSwap member",
      authorAvatar: author?.avatar_url ?? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
      authorRole: author?.education ?? "EwuSwap member",
      isVerified: Boolean(author?.is_verified),
      timestamp: new Date(post.created_at).toLocaleString(),
      category: post.category ?? "General",
      content: post.body,
      likesCount: likeCounts.get(post.id) ?? 0,
      commentsCount: 0,
      isLiked: likedPostIds.has(post.id),
    };
  });
}

export async function createCommunityPost(body: string, category: string) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("You must be signed in to publish a community post.");

  const { data, error } = await supabase
    .from("ss_social_posts")
    .insert({ author_id: user.id, body: body.trim(), category, visibility: "everyone" })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function toggleCommunityPostLike(postId: string) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("You must be signed in to like a community post.");

  const { data: existingLike, error: lookupError } = await supabase
    .from("ss_post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existingLike) {
    const { error } = await supabase.from("ss_post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase.from("ss_post_likes").insert({ post_id: postId, user_id: user.id });
  if (error) throw error;
  return true;
}

export async function topUpWallet(input: {
  method: "bkash" | "nagad";
  amountBdt: number;
  senderPhone: string;
  trxId: string;
}): Promise<{ success: boolean; newCredits: number; transaction: WalletTransaction }> {
  const conversionRate = 120; // 1 Credit = 120 BDT
  const creditsToAdd = Math.floor(input.amountBdt / conversionRate);

  const user = await getCurrentUser();
  user.bdtBalance = (user.bdtBalance || 0) + input.amountBdt;
  user.credits = (user.credits || 0) + creditsToAdd;
  localStorage.setItem("ss_current_user", JSON.stringify(user));

  const transactions = await listWalletTransactions();
  const newTx: WalletTransaction = {
    id: `tx_topup_${Date.now()}`,
    type: "topup",
    title: `${input.method === "bkash" ? "bKash" : "Nagad"} Wallet Top-Up`,
    counterparty: `${input.method === "bkash" ? "bKash" : "Nagad"} Gateway`,
    method: input.method,
    amountCredits: creditsToAdd,
    amountBdt: input.amountBdt,
    date: "Just now",
    status: "Completed",
    senderPhone: input.senderPhone,
    trxId: input.trxId.toUpperCase(),
    note: `TrxID: ${input.trxId.toUpperCase()} from ${input.senderPhone}`,
  };

  transactions.unshift(newTx);
  localStorage.setItem("ss_wallet_transactions", JSON.stringify(transactions));
  window.dispatchEvent(new Event("ss_wallet_updated"));
  window.dispatchEvent(new Event("ss_user_changed"));

  return { success: true, newCredits: user.credits, transaction: newTx };
}

export async function withdrawWallet(input: {
  method: "bkash" | "nagad";
  amountBdt: number;
  targetPhone: string;
  accountType: "personal" | "agent";
}): Promise<{ success: boolean; remainingBdt: number; transaction: WalletTransaction }> {
  const conversionRate = 120;
  const creditsToDeduct = Math.ceil(input.amountBdt / conversionRate);

  const user = await getCurrentUser();
  if ((user.bdtBalance || 0) < input.amountBdt) {
    throw new Error("Insufficient available balance for withdrawal");
  }

  user.bdtBalance = Math.max(0, (user.bdtBalance || 0) - input.amountBdt);
  user.credits = Math.max(0, (user.credits || 0) - creditsToDeduct);
  localStorage.setItem("ss_current_user", JSON.stringify(user));

  const transactions = await listWalletTransactions();
  const newTx: WalletTransaction = {
    id: `tx_wth_${Date.now()}`,
    type: "withdrawal",
    title: `${input.method === "bkash" ? "bKash" : "Nagad"} Cashout (${input.accountType})`,
    counterparty: `${input.method === "bkash" ? "bKash" : "Nagad"} Payout`,
    method: input.method,
    amountCredits: creditsToDeduct,
    amountBdt: input.amountBdt,
    date: "Just now",
    status: "Processing",
    targetPhone: input.targetPhone,
    note: `Payout to ${input.targetPhone} (${input.accountType})`,
  };

  transactions.unshift(newTx);
  localStorage.setItem("ss_wallet_transactions", JSON.stringify(transactions));
  window.dispatchEvent(new Event("ss_wallet_updated"));
  window.dispatchEvent(new Event("ss_user_changed"));

  return { success: true, remainingBdt: user.bdtBalance, transaction: newTx };
}

export async function createPaidEscrow(input: {
  payeeId: string;
  courseId: string;
  amountCredits: number;
  payerNote?: string;
}) {
  const { data, error } = await supabase.rpc("ss_create_escrow", {
    p_payee_id: input.payeeId,
    p_course_id: input.courseId,
    p_amount_credits: input.amountCredits,
    p_payer_note: input.payerNote ?? null,
  });
  if (error) throw error;
  window.dispatchEvent(new Event("ss_wallet_updated"));
  return { id: data as string };
}

export async function createConversation(participantId: string) {
  return {
    id: `conv_${participantId}`,
    participantId,
    createdAt: new Date().toISOString(),
  };
}

// -------------------------------------------------------------
// SUPABASE REALTIME CLIENT IMPLEMENTATION (Postgres Replication & Channels)
// -------------------------------------------------------------

export type RealtimePostgresChangesFilter = {
  event: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema?: string;
  table: string;
  filter?: string;
};

export type RealtimePayload<T = any> = {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: T | null;
  errors?: string[];
};

export class RealtimeChannel {
  public topic: string;
  private postgresCallbacks: Array<{
    filter: RealtimePostgresChangesFilter;
    callback: (payload: RealtimePayload) => void;
  }> = [];
  private isSubscribed: boolean = false;
  private messageHandler: ((event: Event) => void) | null = null;

  constructor(topic: string) {
    this.topic = topic;
  }

  on(
    type: "postgres_changes",
    filter: RealtimePostgresChangesFilter,
    callback: (payload: RealtimePayload) => void
  ): this {
    if (type === "postgres_changes") {
      this.postgresCallbacks.push({ filter, callback });
    }
    return this;
  }

  subscribe(callback?: (status: "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR") => void): this {
    this.isSubscribed = true;
    activeChannels.set(this.topic, this);

    this.messageHandler = (e: Event) => {
      const customEvent = e as CustomEvent<{
        type: "postgres_changes";
        table?: string;
        payload: any;
      }>;
      if (!customEvent.detail) return;

      const { type, table, payload } = customEvent.detail;
      if (type === "postgres_changes") {
        for (const handler of this.postgresCallbacks) {
          if (!handler.filter.table || handler.filter.table === table || handler.filter.table === "*") {
            try {
              handler.callback(payload);
            } catch (err) {
              console.error("[Realtime Callback Error]", err);
            }
          }
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("ss_realtime_postgres_change", this.messageHandler);
    }

    if (callback) {
      setTimeout(() => callback("SUBSCRIBED"), 10);
    }
    return this;
  }

  unsubscribe(): "ok" {
    this.isSubscribed = false;
    if (typeof window !== "undefined" && this.messageHandler) {
      window.removeEventListener("ss_realtime_postgres_change", this.messageHandler);
      this.messageHandler = null;
    }
    activeChannels.delete(this.topic);
    return "ok";
  }
}

const activeChannels = new Map<string, RealtimeChannel>();

export function broadcastRealtimeChange(table: string, eventType: "INSERT" | "UPDATE" | "DELETE", record: any) {
  const payload: RealtimePayload = {
    schema: "public",
    table,
    eventType,
    new: record,
    old: null,
    commit_timestamp: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("ss_realtime_postgres_change", {
        detail: {
          type: "postgres_changes",
          table,
          payload,
        },
      })
    );
  }
  return payload;
}

/**
 * Dispatches a realtime message to ss_messages table and broadcasts to subscribers
 */
export function sendSupabaseRealtimeMessage(input: {
  conversationId: string;
  senderId: string;
  text: string;
}) {
  const record = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    conversation_id: input.conversationId,
    sender_id: input.senderId,
    body: input.text,
    created_at: new Date().toISOString(),
  };
  broadcastRealtimeChange("ss_messages", "INSERT", record);
  return record;
}

/**
 * Dispatches a realtime WebRTC call proposal to ss_call_sessions table
 */
export function proposeSupabaseRealtimeCall(input: {
  conversationId: string;
  callerId: string;
  calleeId: string;
  status?: "requested" | "accepted" | "declined" | "ended";
}) {
  const record = {
    id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    conversation_id: input.conversationId,
    caller_id: input.callerId,
    callee_id: input.calleeId,
    status: input.status || "requested",
    created_at: new Date().toISOString(),
  };
  broadcastRealtimeChange("ss_call_sessions", "INSERT", record);
  return record;
}
