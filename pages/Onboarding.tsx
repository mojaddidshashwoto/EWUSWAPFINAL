import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, BookOpen, GraduationCap, Award,
  Camera, Laptop, Users, Calendar, Sparkles, Plus, X, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { supabase, updateProfileDetails } from "@/lib/supabase";

// Predefined Skill Options
const SUGGESTED_LEARN_SKILLS = [
  "UI/UX Design", "Web Development", "Python", "Data Analytics",
  "Public Speaking", "Video Editing", "Digital Marketing", "Conversational English",
  "Figma", "Machine Learning", "Financial Modeling", "Guitar"
];

const SUGGESTED_TEACH_SKILLS = [
  "Graphic Design", "React & TypeScript", "Content Writing", "Music & Guitar",
  "Physics Tutoring", "Photo Editing", "Calculus & Algebra", "SEO Basics",
  "Social Media Strategy", "Spoken Bengali", "Copywriting", "Node.js"
];

const EXPERIENCE_LEVELS = [
  { id: "Beginner", label: "Beginner", desc: "Just getting started, excited to explore and learn fundamentals.", icon: "🌱" },
  { id: "Intermediate", label: "Intermediate", desc: "Have foundational knowledge, looking to sharpen skills and work on projects.", icon: "🚀" },
  { id: "Advanced", label: "Advanced", desc: "Proficient with solid hands-on experience, capable of leading and guiding.", icon: "⚡" },
  { id: "Expert", label: "Expert", desc: "Deep domain expertise, active practitioner capable of mentoring at scale.", icon: "👑" },
];

const PREFERRED_FORMATS = [
  { id: "Online", label: "Online Only", desc: "Virtual 1-on-1 calls, Zoom/Google Meet, and digital code reviews.", icon: Laptop },
  { id: "Offline", label: "Offline / In-Person", desc: "On-campus meetups, library study circles, and local coffee shops.", icon: Users },
  { id: "Both", label: "Both (Flexible)", desc: "Open to either online or in-person sessions based on convenience.", icon: Sparkles },
];

const AVAILABILITY_STATUSES = [
  { id: "available", label: "Available", desc: "Active and open for new skill swaps and group sessions.", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
  { id: "busy", label: "Busy", desc: "Limited availability, responding to select requests.", badge: "bg-amber-500/20 text-amber-300 border-amber-500/30", dot: "bg-amber-400" },
  { id: "vacation", label: "Vacation", desc: "Currently taking a break, paused for new bookings.", badge: "bg-sky-500/20 text-sky-300 border-sky-500/30", dot: "bg-sky-400" },
  { id: "unavailable", label: "Unavailable", desc: "Not accepting new swaps right now.", badge: "bg-rose-500/20 text-rose-300 border-rose-500/30", dot: "bg-rose-400" },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Form State
  const [skillsToLearn, setSkillsToLearn] = useState<string[]>(["UI/UX Design", "Python"]);
  const [customLearnInput, setCustomLearnInput] = useState("");

  const [skillsToTeach, setSkillsToTeach] = useState<string[]>(["React & TypeScript"]);
  const [customTeachInput, setCustomTeachInput] = useState("");

  const [experienceLevel, setExperienceLevel] = useState("Intermediate");

  const [bio, setBio] = useState("Passionate about learning new digital skills and sharing developer knowledge with peers.");
  const [avatarUrl, setAvatarUrl] = useState("https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=85");

  const [preferredFormat, setPreferredFormat] = useState("Both");
  const [availabilityStatus, setAvailabilityStatus] = useState("available");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const totalSteps = 6;
  const progressPercentage = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step === 1 && skillsToLearn.length === 0) {
      toast.error("Please select at least one skill you want to learn.");
      return;
    }
    if (step === 2 && skillsToTeach.length === 0) {
      toast.error("Please select at least one skill you can teach.");
      return;
    }
    if (step < totalSteps) {
      setDirection(1);
      setStep((prev) => prev + 1);
    } else {
      handleCompleteOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((prev) => prev - 1);
    }
  };

  const addLearnSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skillsToLearn.includes(trimmed)) {
      setSkillsToLearn([...skillsToLearn, trimmed]);
      setCustomLearnInput("");
    }
  };

  const removeLearnSkill = (skill: string) => {
    setSkillsToLearn(skillsToLearn.filter((s) => s !== skill));
  };

  const addTeachSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skillsToTeach.includes(trimmed)) {
      setSkillsToTeach([...skillsToTeach, trimmed]);
      setCustomTeachInput("");
    }
  };

  const removeTeachSkill = (skill: string) => {
    setSkillsToTeach(skillsToTeach.filter((s) => s !== skill));
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id || "temp";
      const safeFileName = file.name.replace(/\s+/g, "-");
      const path = `${userId}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage.from("ss-profile-avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("ss-profile-avatars").getPublicUrl(path);

      setAvatarUrl(publicUrl);
      toast.success("Profile photo uploaded successfully.");
    } catch (error: any) {
      console.error("Avatar upload failed:", error);
      toast.error(error?.message || "Failed to upload profile photo.");
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleCompleteOnboarding = async () => {
    setIsSubmitting(true);
    try {
      await updateProfileDetails({
        bio,
        skills: skillsToTeach,
        learningSkills: skillsToLearn,
        avatar_url: avatarUrl,
      });
      setIsCompleted(true);
      toast.success("Profile setup complete! Welcome to EwuSwap.");
      setTimeout(() => {
        setLocation("/");
      }, 1500);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 40 : -40,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 40 : -40,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 py-8 sm:py-12 relative overflow-y-auto">
      {/* Glow Effects */}
      <div className="absolute top-1/6 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/6 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl relative z-10 my-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-white tracking-tight">
              Ewu<span className="text-indigo-400">Swap</span>
            </span>
            <span className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full font-medium">
              Profile Onboarding
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Step <span className="text-indigo-400 font-bold">{step}</span> of {totalSteps}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <Progress value={progressPercentage} className="h-1.5 bg-slate-800" />
        </div>

        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-2xl text-slate-100 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {/* STEP 1: SKILLS TO LEARN */}
              {step === 1 && (
                <div>
                  <CardHeader className="pb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">What do you want to learn?</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">
                      Select or add skills you are excited to master through peer swaps.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Selected Tags */}
                    <div className="min-h-[50px] p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-wrap gap-2 items-center">
                      {skillsToLearn.length === 0 ? (
                        <span className="text-xs text-slate-600">No skills selected yet. Choose from below or type custom skills.</span>
                      ) : (
                        skillsToLearn.map((skill) => (
                          <Badge
                            key={skill}
                            className="bg-indigo-600/20 text-indigo-300 border-indigo-500/30 gap-1.5 px-3 py-1 hover:bg-indigo-600/30 transition-all text-xs"
                          >
                            {skill}
                            <button onClick={() => removeLearnSkill(skill)} className="hover:text-white">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>

                    {/* Custom Input */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add custom skill (e.g. Next.js, Violin)..."
                        value={customLearnInput}
                        onChange={(e) => setCustomLearnInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addLearnSkill(customLearnInput);
                          }
                        }}
                        className="bg-slate-950/60 border-slate-800 text-slate-100 text-xs placeholder:text-slate-600"
                      />
                      <Button
                        type="button"
                        onClick={() => addLearnSkill(customLearnInput)}
                        variant="secondary"
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </Button>
                    </div>

                    {/* Suggestions */}
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-2">Popular skills to learn:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTED_LEARN_SKILLS.map((skill) => {
                          const isSelected = skillsToLearn.includes(skill);
                          return (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => (isSelected ? removeLearnSkill(skill) : addLearnSkill(skill))}
                              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-500 font-medium"
                                  : "bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                              }`}
                            >
                              {isSelected ? "✓ " : "+ "}{skill}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </div>
              )}

              {/* STEP 2: SKILLS TO TEACH */}
              {step === 2 && (
                <div>
                  <CardHeader className="pb-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">What can you teach?</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">
                      Share the skills or expertise you can offer in return for credits or swaps.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Selected Tags */}
                    <div className="min-h-[50px] p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-wrap gap-2 items-center">
                      {skillsToTeach.length === 0 ? (
                        <span className="text-xs text-slate-600">No skills selected yet. Select skills you are comfortable sharing.</span>
                      ) : (
                        skillsToTeach.map((skill) => (
                          <Badge
                            key={skill}
                            className="bg-emerald-600/20 text-emerald-300 border-emerald-500/30 gap-1.5 px-3 py-1 hover:bg-emerald-600/30 transition-all text-xs"
                          >
                            {skill}
                            <button onClick={() => removeTeachSkill(skill)} className="hover:text-white">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>

                    {/* Custom Input */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add custom teaching skill..."
                        value={customTeachInput}
                        onChange={(e) => setCustomTeachInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTeachSkill(customTeachInput);
                          }
                        }}
                        className="bg-slate-950/60 border-slate-800 text-slate-100 text-xs placeholder:text-slate-600"
                      />
                      <Button
                        type="button"
                        onClick={() => addTeachSkill(customTeachInput)}
                        variant="secondary"
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </Button>
                    </div>

                    {/* Suggestions */}
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-2">Popular skills to teach:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTED_TEACH_SKILLS.map((skill) => {
                          const isSelected = skillsToTeach.includes(skill);
                          return (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => (isSelected ? removeTeachSkill(skill) : addTeachSkill(skill))}
                              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                                isSelected
                                  ? "bg-emerald-600 text-white border-emerald-500 font-medium"
                                  : "bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                              }`}
                            >
                              {isSelected ? "✓ " : "+ "}{skill}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </div>
              )}

              {/* STEP 3: EXPERIENCE LEVEL */}
              {step === 3 && (
                <div>
                  <CardHeader className="pb-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
                      <Award className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">Your Experience Level</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">
                      Help matches understand your current proficiency level.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {EXPERIENCE_LEVELS.map((lvl) => {
                      const isSelected = experienceLevel === lvl.id;
                      return (
                        <div
                          key={lvl.id}
                          onClick={() => setExperienceLevel(lvl.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                            isSelected
                              ? "bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10"
                              : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60"
                          }`}
                        >
                          <span className="text-2xl">{lvl.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className={`text-sm font-semibold ${isSelected ? "text-indigo-300" : "text-slate-200"}`}>
                                {lvl.label}
                              </h4>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{lvl.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </div>
              )}

              {/* STEP 4: PROFILE PHOTO & SHORT BIO */}
              {step === 4 && (
                <div>
                  <CardHeader className="pb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-2">
                      <Camera className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">Profile Photo & Bio</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">
                      Add a face and a friendly bio so fellow learners recognize you.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Avatar Preview */}
                    <div className="flex items-center gap-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                      <img
                        src={avatarUrl}
                        alt="Profile Preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500/40 shadow-md"
                      />
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs text-slate-300 font-medium">Upload profile photo</Label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-indigo-600 file:text-white file:text-xs file:font-medium file:cursor-pointer hover:file:bg-indigo-500"
                        />
                        {isUploadingAvatar && (
                          <div className="flex items-center gap-2 text-xs text-indigo-300">
                            <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-indigo-400 border-t-transparent" />
                            Uploading...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Short Bio */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs text-slate-300 font-medium">Short Bio</Label>
                        <span className="text-[10px] text-slate-500">{bio.length} / 250</span>
                      </div>
                      <Textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value.slice(0, 250))}
                        placeholder="Tell peers what you're working on or what you love teaching..."
                        className="bg-slate-950/60 border-slate-800 text-xs text-slate-200 min-h-[90px] focus-visible:ring-indigo-500"
                      />
                    </div>
                  </CardContent>
                </div>
              )}

              {/* STEP 5: PREFERRED EXCHANGE FORMAT */}
              {step === 5 && (
                <div>
                  <CardHeader className="pb-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-2">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">Preferred Session Format</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">
                      How would you like to conduct your skill exchange sessions?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {PREFERRED_FORMATS.map((fmt) => {
                      const isSelected = preferredFormat === fmt.id;
                      const IconComponent = fmt.icon;
                      return (
                        <div
                          key={fmt.id}
                          onClick={() => setPreferredFormat(fmt.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                            isSelected
                              ? "bg-sky-600/15 border-sky-500 shadow-md shadow-sky-500/10"
                              : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60"
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${isSelected ? "bg-sky-500/20 text-sky-300" : "bg-slate-800 text-slate-400"}`}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className={`text-sm font-semibold ${isSelected ? "text-sky-300" : "text-slate-200"}`}>
                                {fmt.label}
                              </h4>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{fmt.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </div>
              )}

              {/* STEP 6: AVAILABILITY STATUS */}
              {step === 6 && (
                <div>
                  <CardHeader className="pb-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">Initial Availability Status</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">
                      Set your status so members know if you're taking new swap requests.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {AVAILABILITY_STATUSES.map((st) => {
                      const isSelected = availabilityStatus === st.id;
                      return (
                        <div
                          key={st.id}
                          onClick={() => setAvailabilityStatus(st.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                            isSelected
                              ? "bg-emerald-600/15 border-emerald-500 shadow-md shadow-emerald-500/10"
                              : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60"
                          }`}
                        >
                          <div className="mt-1">
                            <span className={`w-3 h-3 rounded-full inline-block ${st.dot}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${st.badge}`}>
                                {st.label}
                              </span>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{st.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </div>
              )}

              {/* Footer Controls */}
              <CardFooter className="flex justify-between border-t border-slate-800/60 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  disabled={step === 1 || isSubmitting}
                  className="text-slate-400 hover:text-white text-xs gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </Button>

                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 px-5 gap-1.5"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      Saving Profile...
                    </span>
                  ) : step === totalSteps ? (
                    <span className="flex items-center gap-1.5">
                      Complete Setup
                      <Check className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Continue
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </Button>
              </CardFooter>
            </motion.div>
          </AnimatePresence>
        </Card>

        {/* Completion Modal Animation overlay */}
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg rounded-2xl"
          >
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/40 animate-bounce">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white">You're All Set!</h2>
              <p className="text-xs text-slate-300">
                Your profile has been saved. Redirecting to your EwuSwap dashboard...
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
