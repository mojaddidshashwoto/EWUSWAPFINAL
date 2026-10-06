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
  priceCredits?: number | null;
};

export type GroupLearningSession = {
  id: string;
  groupId: string;
  hostId: string;
  title: string;
  category: string;
  description: string;
  learningOutcomes: string;
  startsAt: string;
  endsAt: string;
  priceBdt: number;
  maxStudents: number;
  enrolledStudents: number;
  hostName: string;
  hostAvatar: string;
  isVerified: boolean;
  isOwner: boolean;
  isJoined: boolean;
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
  priceBdt: number;
  bdtCost: number;
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
  authorId?: string;
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

export type AdminWalletUser = {
  id: string;
  display_name: string;
  email: string;
  bdt_balance: number;
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
  type: "topup" | "withdrawal" | "held" | "spent" | "released" | "refund" | "fee";
  title: string;
  counterparty: string;
  method?: "bkash" | "nagad" | "system";
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
    .select("id, display_name, avatar_url, role, bdt_balance, is_verified")
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

  const { data: profile, error: profileError } = await supabase
    .from("ss_public_profiles")
    .select("id, display_name, avatar_url, bio, education, skills, learning_skills, certifications, availability_status, is_verified, trust_score, show_skills")
    .eq("id", targetUserId)
    .maybeSingle();
  if (profileError) throw profileError;

  return { profile, privacy: profile ? { show_skills: profile.show_skills } : null };
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
    .from("ss_public_profiles")
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
    .select("id, display_name, avatar_url, bio, role, education, skills, learning_skills, certifications, availability_status, is_verified, trust_score")
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
    .select("id, title, description, type, duration_minutes, price_bdt, instructor_id, category_id")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!courses?.length) return [];

  const instructorIds = [...new Set(courses.map((course) => course.instructor_id))];
  const categoryIds = [...new Set(courses.map((course) => course.category_id))];
  const courseIds = courses.map((course) => course.id);
  const [profilesResult, categoriesResult, reviewsResult] = await Promise.all([
    supabase.from("ss_public_profiles").select("id, display_name, avatar_url, bio, education, availability_status, is_verified, trust_score").in("id", instructorIds),
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
    const bdtPrice = Number(course.price_bdt ?? 500);
    return {
      id: course.id,
      title: course.title,
      description: course.description ?? "",
      type: course.type,
      durationMinutes: course.duration_minutes,
      priceBdt: bdtPrice,
      bdtCost: bdtPrice,
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

export async function listAdminWalletUsers(): Promise<AdminWalletUser[]> {
  const { data, error } = await supabase.rpc("ss_admin_list_wallet_users");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    display_name: row.display_name,
    email: row.email ?? "",
    bdt_balance: Number(row.bdt_balance ?? 0),
  }));
}

export async function adminDepositBdt(userId: string, amountBdt: number) {
  const { data, error } = await supabase.rpc("ss_admin_deposit_bdt", {
    p_user_id: userId,
    p_amount_bdt: amountBdt,
    p_note: "Manual cash deposit",
  });
  if (error) throw error;
  window.dispatchEvent(new Event("ss_wallet_updated"));
  window.dispatchEvent(new Event("ss_user_changed"));
  return data?.[0] as { transaction_id: string; user_id: string; amount_bdt: number; balance_after: number; created_at: string } | undefined;
}

export async function adminDepositCredits(userId: string, amountCredits: number) {
  return adminDepositBdt(userId, amountCredits * 120);
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
  const priceBdt = input.priceBdt ?? (input.priceCredits ? input.priceCredits * 120 : 500);
  if (priceBdt < 10) {
    throw new Error("Set a service price of at least ৳10 BDT.");
  }
  const legacyCreditCost = Math.ceil(priceBdt / 120);

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
      credit_cost: legacyCreditCost,
      price_bdt: priceBdt,
    })
    .select("id, title, description, type, duration_minutes, credit_cost, price_bdt, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function listGroupLearningSessions(): Promise<GroupLearningSession[]> {
  const { data, error } = await supabase.rpc("ss_list_group_sessions");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.session_id,
    groupId: row.group_id,
    hostId: row.host_id,
    title: row.title,
    category: row.category,
    description: row.description ?? "",
    learningOutcomes: row.learning_outcomes ?? "",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    creditCost: Number(row.credit_cost),
    maxStudents: Number(row.max_students),
    enrolledStudents: Number(row.enrolled_students),
    hostName: row.host_name,
    hostAvatar: row.host_avatar ?? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
    isVerified: Boolean(row.is_verified),
    isOwner: Boolean(row.is_owner),
    isJoined: Boolean(row.is_joined),
  }));
}

export async function createGroupLearningSession(input: {
  title: string;
  description: string;
  learningOutcomes: string;
  categorySlug: string;
  startsAt: string;
  endsAt: string;
  creditCost: number;
  maxStudents: number;
}) {
  const { data, error } = await supabase.rpc("ss_create_group_session", {
    p_title: input.title,
    p_description: input.description,
    p_learning_outcomes: input.learningOutcomes,
    p_category_slug: input.categorySlug,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_credit_cost: input.creditCost,
    p_max_students: input.maxStudents,
  });
  if (error) throw error;
  return data as string;
}

export async function joinGroupLearningSession(sessionId: string, join: boolean) {
  const { error } = await supabase.rpc("ss_join_group_session", {
    p_session_id: sessionId,
    p_join: join,
  });
  if (error) throw error;
}

export async function updateGroupLearningSession(sessionId: string, input: {
  title: string;
  description: string;
  learningOutcomes: string;
  categorySlug: string;
  startsAt: string;
  endsAt: string;
  creditCost: number;
  maxStudents: number;
}) {
  const { error } = await supabase.rpc("ss_update_group_session", {
    p_session_id: sessionId,
    p_title: input.title,
    p_description: input.description,
    p_learning_outcomes: input.learningOutcomes,
    p_category_slug: input.categorySlug,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_credit_cost: input.creditCost,
    p_max_students: input.maxStudents,
  });
  if (error) throw error;
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

export async function listDisputes(): Promise<PlatformDispute[]> {
  const { data: rows, error } = await supabase
    .from("ss_disputes")
    .select(`
      *,
      escrow:ss_escrow_transactions(
        id,
        payer_id,
        payee_id,
        course_id,
        amount_credits,
        amount_bdt,
        gross_amount_bdt,
        status,
        proof_reference,
        payer_note,
        course:ss_courses(
          id,
          title
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  // Fetch participant profiles
  const profileIds = [
    ...new Set(
      rows.flatMap((r: any) => [
        r.opened_by,
        r.escrow?.payer_id,
        r.escrow?.payee_id,
      ]).filter(Boolean)
    ),
  ];

  const profilesMap = new Map<string, { id: string; display_name: string; avatar_url: string | null }>();
  if (profileIds.length > 0) {
    const { data: profiles, error: profError } = await supabase
      .from("ss_public_profiles")
      .select("id, display_name, avatar_url")
      .in("id", profileIds);
    if (!profError && profiles) {
      profiles.forEach((p: any) => profilesMap.set(p.id, p));
    }
  }

  const defaultLearnerAvatar = "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80";
  const defaultProviderAvatar = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80";

  return rows.map((row: any) => {
    const escrow = row.escrow;
    const payerId = escrow?.payer_id || row.opened_by;
    const payeeId = escrow?.payee_id;
    const payer = payerId ? profilesMap.get(payerId) : undefined;
    const payee = payeeId ? profilesMap.get(payeeId) : undefined;

    const amountCredits = Number(escrow?.amount_credits ?? 0);
    const amountBdt = Number(
      escrow?.gross_amount_bdt ??
      escrow?.amount_bdt ??
      (amountCredits > 0 ? amountCredits * 120 : 0)
    );

    let escrowStatus: "submitted" | "verified" | "held" = "held";
    if (escrow?.status === "submitted") escrowStatus = "submitted";
    else if (escrow?.status === "verified") escrowStatus = "verified";

    return {
      id: row.id,
      exchangeId: row.escrow_transaction_id || escrow?.id || "",
      courseTitle: escrow?.course?.title || "Skill Exchange Session",
      learnerId: payerId || "",
      learnerName: payer?.display_name || "Learner (Payer)",
      learnerAvatar: payer?.avatar_url || defaultLearnerAvatar,
      providerId: payeeId || "",
      providerName: payee?.display_name || "Provider (Tutor)",
      providerAvatar: payee?.avatar_url || defaultProviderAvatar,
      amountCredits: amountCredits || (amountBdt > 0 ? Math.ceil(amountBdt / 120) : 0),
      amountBdt,
      escrowStatus,
      disputeReason: row.reason || "No grievance specified.",
      evidenceNotes: escrow?.proof_reference || escrow?.payer_note || "Session logs & transaction records",
      disputeDate: new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: (row.status as PlatformDispute["status"]) || "open",
      resolution: (row.resolution as PlatformDispute["resolution"]) || undefined,
      resolutionNote: row.resolution_note || undefined,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined,
    };
  });
}

export async function resolveDispute(
  disputeId: string,
  resolution: "refund_payer" | "release_provider" | "split",
  note?: string
): Promise<PlatformDispute> {
  const { error } = await supabase.rpc("ss_resolve_dispute", {
    p_dispute_id: disputeId,
    p_resolution: resolution,
    p_admin_notes: note ?? null,
  });
  if (error) throw error;

  window.dispatchEvent(new Event("ss_disputes_changed"));
  window.dispatchEvent(new Event("ss_wallet_updated"));
  window.dispatchEvent(new Event("ss_user_changed"));

  const disputes = await listDisputes();
  const resolved = disputes.find((d) => d.id === disputeId);

  // Automated Server Notification & Email Dispatch Hook
  if (resolved) {
    try {
      const { triggerDisputeResolvedNotification } = await import("@/server/notifications");
      await triggerDisputeResolvedNotification({
        disputeId: resolved.id,
        resolution,
        courseTitle: resolved.courseTitle,
        learnerId: resolved.learnerId,
        learnerName: resolved.learnerName,
        providerId: resolved.providerId,
        providerName: resolved.providerName,
        amountCredits: resolved.amountCredits,
        amountBdt: resolved.amountBdt,
        resolutionNote: note || resolved.resolutionNote,
      });
    } catch (err) {
      console.error("[Notification Trigger Error]", err);
    }
    return resolved;
  }

  return {
    id: disputeId,
    exchangeId: "",
    courseTitle: "Resolved Dispute",
    learnerId: "",
    learnerName: "Learner",
    learnerAvatar: "",
    providerId: "",
    providerName: "Provider",
    providerAvatar: "",
    amountCredits: 0,
    amountBdt: 0,
    escrowStatus: "held",
    disputeReason: "",
    evidenceNotes: "",
    disputeDate: new Date().toLocaleDateString(),
    status: "resolved",
    resolution,
    resolutionNote: note,
    resolvedAt: "Just now",
  };
}

// -------------------------------------------------------------
// WALLET MANAGEMENT (bKash, Nagad, Balances & Transactions)
// -------------------------------------------------------------

const INITIAL_TRANSACTIONS: WalletTransaction[] = [];

export async function listWalletTransactions(): Promise<WalletTransaction[]> {
  const transactions = await listMyEscrowTransactions();
  return transactions.flatMap((transaction) => {
    const status = transaction.status as string;
    const grossBdtValue = transaction.gross_amount_bdt ?? transaction.amount_bdt;
    const netBdtValue = transaction.net_amount_bdt;
    const feeBdtValue = transaction.platform_fee_bdt;
    const grossBdt = grossBdtValue == null ? null : Number(grossBdtValue);
    const netBdt = netBdtValue == null ? null : Number(netBdtValue);
    const feeBdt = feeBdtValue == null ? null : Number(feeBdtValue);
    const title = transaction.course?.title || "Skill exchange";
    const counterparty = transaction.isPayer ? transaction.payee.display_name : transaction.payer.display_name;
    const date = new Date(transaction.created_at).toLocaleDateString();
    const note = transaction.payer_note ?? undefined;

    if (status === "rejected") {
      return transaction.isPayer ? [{
        id: `${transaction.id}:refund`, type: "refund" as const, title: `${title} refund`, counterparty,
        amountBdt: grossBdt, date, status: "Refunded" as const, note,
      }] : [];
    }

    if (status === "released") {
      if (transaction.isPayer) {
        return [
          { id: `${transaction.id}:spent`, type: "spent" as const, title, counterparty, amountBdt: grossBdt, date, status: "Released" as const, note },
          ...(feeBdt && feeBdt > 0 ? [{ id: `${transaction.id}:fee`, type: "fee" as const, title: `${title} platform fee`, counterparty: "EwuSwap Platform", amountBdt: feeBdt, date, status: "Deducted" as const, note: undefined }] : []),
        ];
      }
      return [{ id: `${transaction.id}:released`, type: "released" as const, title, counterparty, amountBdt: netBdt, date, status: "Released" as const, note }];
    }

    return [{
      id: `${transaction.id}:held`, type: "held" as const, title: `${title} (held)`, counterparty,
      amountBdt: transaction.isPayer ? grossBdt : netBdt, date, status: "Held in escrow" as const, note,
    }];
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
    .from("ss_public_profiles")
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
  window.dispatchEvent(new Event("ss_wallet_updated"));
  window.dispatchEvent(new Event("ss_user_changed"));
  return data;
}

export async function releaseEscrowByPayer(transactionId: string) {
  const { data, error } = await supabase.rpc("ss_release_escrow_by_payer", {
    p_transaction_id: transactionId,
  });
  if (error) throw error;
  window.dispatchEvent(new Event("ss_wallet_updated"));
  window.dispatchEvent(new Event("ss_user_changed"));
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
    supabase.from("ss_public_profiles").select("id, display_name, avatar_url, education, is_verified").in("id", authorIds),
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
      authorId: post.author_id,
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
  courseId?: string;
  amountCredits?: number;
  amountBdt?: number;
  payerNote?: string;
}) {
  const bdtAmount = input.amountBdt ?? (input.amountCredits ? input.amountCredits * 120 : 500);
  const { data, error } = await supabase.rpc("ss_create_escrow", {
    p_payee_id: input.payeeId,
    p_course_id: input.courseId ?? null,
    p_amount_credits: input.amountCredits ?? Math.ceil(bdtAmount / 120),
    p_amount_bdt: bdtAmount,
    p_payer_note: input.payerNote ?? null,
  });
  if (error) throw error;
  window.dispatchEvent(new Event("ss_wallet_updated"));
  window.dispatchEvent(new Event("ss_user_changed"));
  return { id: data as string };
}

export async function createConversation(participantId: string) {
  const { data, error } = await supabase.rpc("ss_create_conversation", {
    p_target_id: participantId,
  });
  if (error) throw error;
  return { id: data as string, participantId, createdAt: new Date().toISOString() };
}

export async function listMyConversations() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("You must be signed in to load conversations.");

  const { data: ownMemberships, error: ownMembershipsError } = await supabase
    .from("ss_conversation_members")
    .select("conversation_id")
    .eq("user_id", user.id);
  if (ownMembershipsError) throw ownMembershipsError;

  const conversationIds = [...new Set((ownMemberships ?? []).map((row) => row.conversation_id))];
  if (conversationIds.length === 0) return [];

  const [membershipsResult, messagesResult] = await Promise.all([
    supabase.from("ss_conversation_members").select("conversation_id, user_id").in("conversation_id", conversationIds),
    supabase.from("ss_messages").select("id, conversation_id, sender_id, body, created_at").in("conversation_id", conversationIds).is("deleted_at", null).order("created_at", { ascending: true }),
  ]);
  if (membershipsResult.error) throw membershipsResult.error;
  if (messagesResult.error) throw messagesResult.error;

  const peerIds = [...new Set((membershipsResult.data ?? []).map((row) => row.user_id).filter((id) => id !== user.id))];
  const { data: profiles, error: profilesError } = peerIds.length
    ? await supabase.from("ss_public_profiles").select("id, display_name, avatar_url").in("id", peerIds)
    : { data: [], error: null };
  if (profilesError) throw profilesError;

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return conversationIds.map((id) => {
    const peerId = (membershipsResult.data ?? []).find((member) => member.conversation_id === id && member.user_id !== user.id)?.user_id;
    const peer = peerId ? profilesById.get(peerId) : undefined;
    const conversationMessages = (messagesResult.data ?? []).filter((message) => message.conversation_id === id);
    const lastMessage = conversationMessages[conversationMessages.length - 1];
    return {
      id,
      peerId: peerId ?? "",
      peerName: peer?.display_name ?? "EwuSwap member",
      peerAvatar: peer?.avatar_url ?? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
      lastMessage: lastMessage?.body ?? "",
      unreadCount: 0,
      isOnline: false,
      messages: conversationMessages.map((message) => ({
        id: message.id,
        senderId: message.sender_id,
        text: message.body,
        timestamp: new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      })),
    };
  });
}


/**
 * Dispatches a realtime message to ss_messages table and broadcasts to subscribers
 */
export async function sendSupabaseRealtimeMessage(input: {
  conversationId: string;
  text: string;
}) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("You must be signed in to send a message.");

  const { data, error } = await supabase
    .from("ss_messages")
    .insert({ conversation_id: input.conversationId, sender_id: user.id, body: input.text.trim() })
    .select("id, conversation_id, sender_id, body, created_at")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Dispatches a realtime WebRTC call proposal to ss_call_sessions table
 */
export async function proposeSupabaseRealtimeCall(input: {
  conversationId: string;
  calleeId: string;
  status?: "requested" | "accepted" | "declined" | "ended";
}) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("You must be signed in to request a call.");

  const { data, error } = await supabase
    .from("ss_call_sessions")
    .insert({ conversation_id: input.conversationId, caller_id: user.id, callee_id: input.calleeId, status: input.status || "requested" })
    .select("id, conversation_id, caller_id, callee_id, status, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function updateSupabaseCallStatus(callId: string, status: "active" | "declined" | "ended") {
  const { data, error } = await supabase.rpc("ss_update_call_status", {
    p_call_id: callId,
    p_status: status,
  });
  if (error) throw error;
  return data;
}
