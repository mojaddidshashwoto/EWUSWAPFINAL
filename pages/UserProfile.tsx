import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { createConversation, getProfileDetails, listProfileReviews, updateProfileDetails, uploadProfileAvatar } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  ShieldCheck, MessageCircle, UserPlus, Repeat, Star, BookOpen, GraduationCap,
  Award, ExternalLink, Lock, EyeOff, CheckCircle2, Sparkles, FolderGit2,
  MoreVertical, AlertCircle, Ban, Pencil, Camera
} from "lucide-react";
import { toast } from "sonner";


const SAMPLE_PROFILE = {
  id: "usr-aisha",
  username: "aisha",
  name: "Aisha Rahman",
  role: "Computer Science & Design Student",
  avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=85",
  coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
  isVerified: true,
  availabilityStatus: "available" as "available" | "busy" | "vacation" | "unavailable",
  trustScore: 4.95,
  bio: "Passionate about building intuitive web applications, React architectures, and helping fellow students level up their UI design and frontend skills.",
  education: "East West University — B.Sc in Computer Science & Engineering (2022 - 2026)",
  certifications: [
    "AWS Certified Cloud Practitioner (2025)",
    "Meta Frontend Developer Specialization (2024)",
    "Figma Systems Advanced Certificate (2024)",
  ],
  skillsTeaching: ["React & TypeScript", "UI/UX Design in Figma", "Frontend State Management", "Tailwind CSS"],
  skillsLearning: ["Machine Learning Basics", "Data Analytics with Tableau", "Spoken German"],
  portfolioProjects: [
    { title: "EwuSwap UI System", desc: "Peer-to-peer skill swapping platform layout and component system.", link: "https://github.com" },
    { title: "Campus Lost & Found", desc: "Realtime item retrieval tracker with digital claim passes.", link: "https://github.com" },
  ],
  reviews: [
    {
      id: "rev-1",
      reviewerName: "Noah Williams",
      reviewerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
      rating: 5,
      date: "2 weeks ago",
      comment: "Aisha is a fantastic mentor! Her explanation of React custom hooks made everything click instantly.",
    },
    {
      id: "rev-2",
      reviewerName: "Priya Shah",
      reviewerAvatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&q=80",
      rating: 5,
      date: "1 month ago",
      comment: "Great exchange session on Figma auto-layout. Punctual, clear, and very encouraging.",
    },
  ],
};

const AVAILABILITY_BADGES = {
  available: { label: "Available Now", badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  busy: { label: "Busy / Limited Slots", badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  vacation: { label: "On Vacation", badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30" },
  unavailable: { label: "Unavailable", badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30" },
};

export default function UserProfile() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [profile, setProfile] = useState(SAMPLE_PROFILE);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isProfileNotFound, setIsProfileNotFound] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editEducation, setEditEducation] = useState("");
  const [editSkills, setEditSkills] = useState("");
  const [editLearningSkills, setEditLearningSkills] = useState("");
  const [editCertifications, setEditCertifications] = useState("");
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const requestedProfileId = location.split("/")[2];
  const isOwnProfile = !requestedProfileId || requestedProfileId === user?.id;

  useEffect(() => {
    let isActive = true;
    const requestedId = location.split("/")[2];
    const isUuid = requestedId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedId);
    const profileId = requestedId ? (isUuid ? requestedId : undefined) : user?.id;
    setIsLoadingProfile(true);
    setIsProfileNotFound(false);
    if (!profileId) {
      setIsProfileNotFound(true);
      setIsLoadingProfile(false);
      return () => {
        isActive = false;
      };
    }

    setProfile((current) => ({
      ...current,
      id: profileId,
      name: user?.displayName || "EwuSwap member",
      role: "EwuSwap member",
      avatarUrl: user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
      isVerified: false,
      availabilityStatus: "available",
      trustScore: 0,
      bio: "",
      education: "Not added yet",
      certifications: [],
      skillsTeaching: [],
      skillsLearning: [],
    }));

    Promise.all([getProfileDetails(profileId), listProfileReviews(profileId)])
      .then(([{ profile: row, privacy }, reviews]) => {
        if (!isActive) return;
        if (!row) {
          setIsProfileNotFound(true);
          return;
        }
        const skills = typeof row.skills === "string" ? row.skills.split(",").map((item: string) => item.trim()).filter(Boolean) : [];
        setProfile((current) => ({
          ...current,
          id: row.id || profileId,
          name: row.display_name || "EwuSwap member",
          role: row.education || "EwuSwap member",
          avatarUrl: row.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
          isVerified: Boolean(row.is_verified),
          availabilityStatus: row.availability_status || "available",
          trustScore: Number(row.trust_score ?? 0),
          bio: row.bio || "",
          education: row.education || "Not added yet",
          certifications: typeof row.certifications === "string" ? row.certifications.split(",").map((item: string) => item.trim()).filter(Boolean) : [],
          skillsTeaching: privacy?.show_skills === false ? [] : skills,
          skillsLearning: typeof row.learning_skills === "string" ? row.learning_skills.split(",").map((item: string) => item.trim()).filter(Boolean) : [],
          portfolioProjects: [],
          reviews,
        }));
      })
      .catch((error) => {
        if (isActive) toast.error(error?.message || "Could not load profile details.");
      })
      .finally(() => {
        if (isActive) setIsLoadingProfile(false);
      });

    return () => {
      isActive = false;
    };
  }, [location, user?.id]);

  useEffect(() => {
    setEditName(profile.name);
    setEditBio(profile.bio);
    setEditEducation(profile.education === "Not added yet" ? "" : profile.education);
    setEditSkills(profile.skillsTeaching.join(", "));
    setEditLearningSkills(profile.skillsLearning.join(", "));
    setEditCertifications(profile.certifications.join(", "));
  }, [profile]);

  const statusInfo = AVAILABILITY_BADGES[profile.availabilityStatus];

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    toast.success(isFollowing ? `Unfollowed ${profile.name}` : `You are now following ${profile.name}`);
  };

  const handleMessage = async () => {
    const targetUserId = profile.id || (requestedProfileId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedProfileId) ? requestedProfileId : undefined);
    if (!targetUserId) {
      toast.error("Cannot start conversation: invalid user profile.");
      return;
    }
    if (user?.id && targetUserId === user.id) {
      toast.error("You cannot message yourself.");
      return;
    }
    try {
      await createConversation(targetUserId);
      setLocation("/messages");
    } catch (err: any) {
      toast.error(err?.message || `Could not open conversation with ${profile.name}.`);
    }
  };

  const handleRequestExchange = () => {
    toast.success(`Exchange proposal initiated with ${profile.name}!`);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      toast.error("Your name is required.");
      return;
    }
    setIsSavingProfile(true);
    try {
      const avatarUrl = editAvatarFile
        ? (await uploadProfileAvatar(editAvatarFile)).url
        : profile.avatarUrl;
      const skills = editSkills.split(",").map((skill) => skill.trim()).filter(Boolean);
      const learningSkills = editLearningSkills.split(",").map((skill) => skill.trim()).filter(Boolean);
      const certifications = editCertifications.split(",").map((certification) => certification.trim()).filter(Boolean);
      await updateProfileDetails({
        displayName: editName.trim(),
        bio: editBio.trim(),
        education: editEducation.trim(),
        skills,
        learningSkills,
        certifications,
        avatarUrl,
      });
      setProfile((current) => ({
        ...current,
        name: editName.trim(),
        role: editEducation.trim() || "EwuSwap member",
        avatarUrl,
        bio: editBio.trim(),
        education: editEducation.trim() || "Not added yet",
        skillsTeaching: skills,
        skillsLearning: learningSkills,
        certifications,
      }));
      setEditAvatarFile(null);
      setIsEditOpen(false);
      toast.success("Profile updated.");
    } catch (error: any) {
      toast.error(error?.message || "Could not save your profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <DashboardLayout>
        <p className="py-16 text-center text-sm text-slate-500">Loading profile...</p>
      </DashboardLayout>
    );
  }

  if (isProfileNotFound) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-xl space-y-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profile not found</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">This profile link is invalid or the member is no longer available.</p>
          <a href="/discover" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Browse members
          </a>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* PROFILE HEADER & COVER BANNER */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
          {/* Cover Image Banner */}
          <div className="h-44 sm:h-52 relative overflow-hidden bg-slate-800">
            <img
              src={profile.coverUrl}
              alt="Profile Cover"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
          </div>

          {/* Profile Header Details Bar */}
          <div className="px-6 pb-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
              {/* Avatar & Name */}
              <div className="flex items-end gap-4">
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-lg shrink-0"
                />
                <div className="mb-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      {profile.name}
                      {profile.isVerified && <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />}
                    </h1>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{profile.role}</p>
                  
                  {/* Explicit Availability Status Badge */}
                  <div className="pt-0.5">
                    <Badge className={`text-xs font-semibold px-3 py-0.5 ${statusInfo.badgeClass}`}>
                      ● Availability: {statusInfo.label}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <Button onClick={() => setIsEditOpen(true)} className="text-xs rounded-xl gap-1.5">
                    <Pencil className="w-4 h-4" /> Edit Profile
                  </Button>
                ) : <>
                <Button
                  onClick={handleFollow}
                  variant={isFollowing ? "outline" : "default"}
                  className={`text-xs rounded-xl gap-1.5 ${
                    isFollowing ? "border-slate-300 dark:border-slate-700" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  {isFollowing ? "Following" : "Follow"}
                </Button>
                <Button
                  onClick={handleMessage}
                  variant="outline"
                  className="text-xs rounded-xl border-slate-300 dark:border-slate-700 gap-1.5"
                >
                  <MessageCircle className="w-4 h-4 text-indigo-500" />
                  Message
                </Button>
                <Button
                  onClick={handleRequestExchange}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-xl shadow-md shadow-emerald-600/20 gap-1.5"
                >
                  <Repeat className="w-4 h-4" />
                  Request Exchange
                </Button>

                {/* Discrete Report & Block Options */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-xl border-slate-300 dark:border-slate-700">
                      <MoreVertical className="w-4 h-4 text-slate-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DropdownMenuItem
                      onClick={() => toast.warning(`Report filed for user ${profile.name}. Submitted for moderator review.`)}
                      className="text-xs text-amber-600 cursor-pointer"
                    >
                      <AlertCircle className="w-3.5 h-3.5 mr-2" />
                      Report User
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => toast.error(`User ${profile.name} has been blocked.`)}
                      className="text-xs text-rose-600 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5 mr-2" />
                      Block User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </>}
              </div>

            </div>
          </div>
        </div>

        {/* TABS & SECTIONS */}
        <Tabs defaultValue="about" className="space-y-4">
          <TabsList className="bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 rounded-xl">
            <TabsTrigger value="about" className="text-xs">About & Credentials</TabsTrigger>
            <TabsTrigger value="skills" className="text-xs">Skills & Swap Offerings</TabsTrigger>
            <TabsTrigger value="portfolio" className="text-xs">Portfolio & Evidence</TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs">Verified Reviews ({profile.reviews.length})</TabsTrigger>
          </TabsList>

          {/* SECTION 1: ABOUT & CREDENTIALS */}
          <TabsContent value="about">
            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 p-6">
              {/* Bio */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  About
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {profile.bio}
                </p>
              </div>

              {/* Education */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-500" />
                  Education
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {profile.education}
                </p>
              </div>

              {/* Certifications */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Certifications & Verified Credentials
                </h3>
                <div className="space-y-1.5">
                  {profile.certifications.map((cert, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{cert}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* EXPLICIT PRIVACY NOTICE (Address & Phone Number Protection) */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Privacy & Security Guarded: </span>
                  Exact street address and personal phone numbers are strictly private and hidden from public profile views in accordance with EwuSwap RLS security policies.
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* SECTION 2: SKILLS I TEACH & LEARN */}
          <TabsContent value="skills">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Skills I Teach */}
              <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-500" />
                    Skills I Teach (Offerings)
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {profile.skillsTeaching.map((skill) => (
                    <Badge key={skill} className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 px-3 py-1 text-xs">
                      {skill}
                    </Badge>
                  ))}
                </CardContent>
              </Card>

              {/* Skills I Want to Learn */}
              <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    Skills I Want to Learn
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {profile.skillsLearning.map((skill) => (
                    <Badge key={skill} className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 px-3 py-1 text-xs">
                      {skill}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* SECTION 3: PORTFOLIO & CERTIFICATES */}
          <TabsContent value="portfolio">
            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-purple-500" />
                  Portfolio Projects & Evidence of Expertise
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.portfolioProjects.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">No portfolio projects have been added yet.</p>
                ) : profile.portfolioProjects.map((proj, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50/60 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{proj.title}</h4>
                      <a href={proj.link} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-600">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{proj.desc}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECTION 4: VERIFIED REVIEWS */}
          <TabsContent value="reviews">
            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  Verified Exchange Reviews ({profile.reviews.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.reviews.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">No published reviews yet.</p>
                ) : profile.reviews.map((rev) => (
                  <div key={rev.id} className="p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={rev.reviewerAvatar} alt={rev.reviewerName} className="w-7 h-7 rounded-full object-cover" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{rev.reviewerName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{rev.rating}.0</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{rev.comment}"</p>
                    <p className="text-[10px] text-slate-400">{rev.date}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update the information shown on your public profile.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-avatar">Profile photo</Label>
              <Input id="profile-avatar" type="file" accept="image/*" onChange={(event) => setEditAvatarFile(event.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Name</Label>
              <Input id="profile-name" value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-bio">Bio</Label>
              <Textarea id="profile-bio" value={editBio} onChange={(event) => setEditBio(event.target.value)} maxLength={250} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-education">Education</Label>
              <Input id="profile-education" value={editEducation} onChange={(event) => setEditEducation(event.target.value)} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-skills">Skills I teach</Label>
              <Input id="profile-skills" value={editSkills} onChange={(event) => setEditSkills(event.target.value)} placeholder="Separate skills with commas" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-learning-skills">Skills I want to learn</Label>
              <Input id="profile-learning-skills" value={editLearningSkills} onChange={(event) => setEditLearningSkills(event.target.value)} placeholder="Separate skills with commas" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-certifications">Certifications</Label>
              <Input id="profile-certifications" value={editCertifications} onChange={(event) => setEditCertifications(event.target.value)} placeholder="Separate certifications with commas" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSavingProfile}>Cancel</Button>
            <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
              {isSavingProfile ? "Saving..." : "Save Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
