import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { SkillCard, SkillCardProps } from "@/components/SkillCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Search, Filter, Sparkles, SlidersHorizontal, RotateCcw, Frown, Star, Coins, Plus,
  Clock, CheckCircle2, ShieldCheck, Globe
} from "lucide-react";
import { toast } from "sonner";
import { createSkillSwapListing, listPublishedSkillCourses } from "@/lib/supabase";

const SAMPLE_LISTINGS: (SkillCardProps & {
  format: "Online" | "Offline" | "Both";
  experienceLevel: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  availabilityStatus: "available" | "busy" | "vacation" | "unavailable";
  language: "English" | "Bengali" | "Both";
})[] = [
  {
    id: "l1",
    title: "Figma Systems & Component Sprint",
    providerName: "Noah Williams",
    providerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    isVerified: true,
    category: "Design",
    type: "Service",
    bdtCost: 1200,
    duration: "90 min",
    rating: 4.9,
    reviewsCount: 28,
    description: "Turn a messy product design file into a calm, reusable component system.",
    format: "Online",
    experienceLevel: "Advanced",
    availabilityStatus: "available",
    language: "English",
  },
  {
    id: "l2",
    title: "Build Your First Tableau Data Story",
    providerName: "Priya Shah",
    providerAvatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&q=80",
    isVerified: true,
    category: "Technology",
    type: "Course",
    bdtCost: 900,
    duration: "60 min",
    rating: 5.0,
    reviewsCount: 19,
    description: "A practical introduction to making analytics clear, visual, and useful.",
    format: "Online",
    experienceLevel: "Beginner",
    availabilityStatus: "available",
    language: "Both",
  },
  {
    id: "l3",
    title: "Brand Voice & Copywriting Fundamentals",
    providerName: "Elliot Brooks",
    providerAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80",
    isVerified: true,
    category: "Marketing",
    type: "Course",
    bdtCost: 1000,
    duration: "75 min",
    rating: 4.8,
    reviewsCount: 41,
    description: "Find a brand voice that feels specific, memorable, and unmistakably yours.",
    format: "Both",
    experienceLevel: "Intermediate",
    availabilityStatus: "busy",
    language: "English",
  },
  {
    id: "l4",
    title: "Conversational Bengali & Cultural Practice",
    providerName: "Tanvir Hasan",
    providerAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80",
    isVerified: true,
    category: "Languages",
    type: "Service",
    bdtCost: 750,
    duration: "45 min",
    rating: 4.9,
    reviewsCount: 32,
    description: "Practice everyday Bengali vocabulary with a friendly peer partner.",
    format: "Offline",
    experienceLevel: "Beginner",
    availabilityStatus: "available",
    language: "Bengali",
  },
  {
    id: "l5",
    title: "React & TypeScript Architecture Code Review",
    providerName: "Aisha Rahman",
    providerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=85",
    isVerified: true,
    category: "Technology",
    type: "Service",
    bdtCost: 1250,
    duration: "60 min",
    rating: 4.95,
    reviewsCount: 45,
    description: "Deep dive into clean component patterns, state management, and type safety.",
    format: "Online",
    experienceLevel: "Expert",
    availabilityStatus: "available",
    language: "Both",
  },
  {
    id: "l6",
    title: "Mindfulness & Sustainable Energy Workshop",
    providerName: "Lena Ortiz",
    providerAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80",
    isVerified: true,
    category: "Wellness",
    type: "Course",
    bdtCost: 800,
    duration: "90 min",
    rating: 4.92,
    reviewsCount: 22,
    description: "Create sustainable routines to manage study stress and boost focus.",
    format: "Both",
    experienceLevel: "Beginner",
    availabilityStatus: "available",
    language: "English",
  },
];

const CATEGORIES = ["All", "Arts", "Business", "Career", "Design", "Finance", "Languages", "Marketing", "Music", "Photography", "Productivity", "Science", "Technology", "Wellness", "Writing"];

export default function Discover() {
  const [, setLocation] = useLocation();
  const [publishedListings, setPublishedListings] = useState<typeof SAMPLE_LISTINGS>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceCategory, setServiceCategory] = useState("Design");
  const [serviceDeliveryMode, setServiceDeliveryMode] = useState<"on_campus" | "online">("online");
  const [servicePriceBdt, setServicePriceBdt] = useState("500");
  const [serviceDuration, setServiceDuration] = useState("60");

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedFormat, setSelectedFormat] = useState("All");
  const [selectedMinRating, setSelectedMinRating] = useState("0");
  const [selectedAvailability, setSelectedAvailability] = useState("All");
  const [maxPriceBdt, setMaxPriceBdt] = useState<number>(5000);
  const [selectedLevel, setSelectedLevel] = useState("All");

  useEffect(() => {
    let isActive = true;
    listPublishedSkillCourses()
      .then((courses) => {
        if (!isActive) return;
        setPublishedListings(courses.map((course) => ({
          id: course.id,
          title: course.title,
          providerName: course.instructorName,
          providerAvatar: course.instructorAvatar,
          isVerified: course.isVerified,
          category: course.category,
          type: course.type === "service" ? "Service" : "Course",
          bdtCost: course.priceBdt,
          duration: `${course.durationMinutes} min`,
          rating: course.averageRating,
          reviewsCount: course.reviewCount,
          description: course.description,
          format: (course.deliveryMode === "on_campus" ? "Offline" : "Online") as "Online" | "Offline",
          experienceLevel: "Intermediate",
          availabilityStatus: "available",
          language: "English",
          authorId: course.instructorId,
          deliveryMode: course.deliveryMode ?? "online",
        })));
      })
      .catch((error) => {
        if (isActive) toast.error(error?.message || "Could not load marketplace listings.");
      })
      .finally(() => {
        if (isActive) setIsLoadingListings(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedFormat("All");
    setSelectedMinRating("0");
    setSelectedAvailability("All");
    setMaxPriceBdt(5000);
    setSelectedLevel("All");
    toast.info("Filters reset to default.");
  };

  const refreshPublishedListings = async () => {
    const courses = await listPublishedSkillCourses();
    setPublishedListings(courses.map((course) => ({
      id: course.id,
      title: course.title,
      providerName: course.instructorName,
      providerAvatar: course.instructorAvatar,
      isVerified: course.isVerified,
      category: course.category,
      type: course.type === "service" ? "Service" : "Course",
      bdtCost: course.priceBdt,
      duration: `${course.durationMinutes} min`,
      rating: course.averageRating,
      reviewsCount: course.reviewCount,
      description: course.description,
      format: (course.deliveryMode === "on_campus" ? "Offline" : "Online") as "Online" | "Offline",
      experienceLevel: "Intermediate",
      availabilityStatus: "available",
      language: "English",
      authorId: course.instructorId,
      deliveryMode: course.deliveryMode ?? "online",
    })));
  };

  const handlePublishService = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const priceBdt = Number(servicePriceBdt);
    const durationMinutes = Number(serviceDuration);
    if (serviceTitle.trim().length < 8 || serviceDescription.trim().length < 20) {
      toast.error("Use a title of at least 8 characters and a description of at least 20 characters.");
      return;
    }
    if (isNaN(priceBdt) || priceBdt < 10 || !Number.isInteger(durationMinutes) || durationMinutes < 15) {
      toast.error("Set a price of at least ৳10 BDT and a session duration of at least 15 minutes.");
      return;
    }

    setIsPublishing(true);
    try {
      await createSkillSwapListing({
        title: serviceTitle.trim(),
        description: serviceDescription.trim(),
        category: serviceCategory,
        exchangeType: "paid",
        availableSkills: [],
        learningGoals: [],
        durationMinutes,
        availability: "available",
        priceBdt,
        deliveryMode: serviceDeliveryMode,
      });
      await refreshPublishedListings();
      setIsPublishOpen(false);
      setServiceTitle("");
      setServiceDescription("");
      setServiceDeliveryMode("online");
      toast.success("Your service is published.");
    } catch (error: any) {
      toast.error(error?.message || "Could not publish your service.");
    } finally {
      setIsPublishing(false);
    }
  };

  const filteredListings = useMemo(() => {
    return publishedListings.filter((item) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesProvider = item.providerName.toLowerCase().includes(q);
        const matchesCategory = item.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesProvider && !matchesCategory) return false;
      }

      // Category
      if (selectedCategory !== "All" && item.category !== selectedCategory) return false;

      // Format
      if (selectedFormat !== "All" && item.format !== "Both" && item.format !== selectedFormat) return false;

      // Min Rating
      if (parseFloat(selectedMinRating) > 0 && item.rating < parseFloat(selectedMinRating)) return false;

      // Availability Status
      if (selectedAvailability !== "All" && item.availabilityStatus !== selectedAvailability) return false;

      // Max Price (BDT)
      if (item.bdtCost > maxPriceBdt) return false;

      // Experience Level
      if (selectedLevel !== "All" && item.experienceLevel !== selectedLevel) return false;

      return true;
    });
  }, [publishedListings, searchQuery, selectedCategory, selectedFormat, selectedMinRating, selectedAvailability, maxPriceBdt, selectedLevel]);

  const handleBook = (id: string) => {
    setLocation(`/skills/${id}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-500" />
              Skill Exchange Marketplace
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Browse peer-to-peer services, courses, and 1-on-1 mentorship sessions.
            </p>
          </div>

          <Button onClick={() => setIsPublishOpen(true)} className="bg-indigo-600 text-white hover:bg-indigo-500">
            <Plus className="mr-2 h-4 w-4" /> Post a Service
          </Button>

          {/* Mobile Filter Button */}
          <div className="sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs border-slate-300 dark:border-slate-800">
                  <Filter className="w-4 h-4" />
                  Advanced Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-left font-bold text-base">Filter Skills</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-4">
                  {/* Category */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-950 text-xs">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Format */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Format</Label>
                    <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-950 text-xs">
                        <SelectValue placeholder="Format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Formats</SelectItem>
                        <SelectItem value="Online">Online Only</SelectItem>
                        <SelectItem value="Offline">Offline / In-Person</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reset Button */}
                  <Button onClick={resetFilters} variant="secondary" className="w-full text-xs gap-1.5 mt-2">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset All Filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by skill title, provider name, category, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs rounded-xl shadow-xs focus-visible:ring-indigo-500"
          />
        </div>

        {/* Category Pills Quick Select */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 ${
                  active
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Main Grid & Desktop Filters Sidebar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* DESKTOP ADVANCED FILTERS SIDEBAR */}
          <aside className="hidden md:block md:col-span-1 space-y-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs h-fit">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                Advanced Filters
              </h3>
              <button onClick={resetFilters} className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline">
                Reset
              </button>
            </div>

            {/* Format Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Session Format</Label>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Formats</SelectItem>
                  <SelectItem value="Online">Online Only</SelectItem>
                  <SelectItem value="Offline">Offline / In-Person</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Minimum Rating */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Minimum Rating</Label>
              <Select value={selectedMinRating} onValueChange={setSelectedMinRating}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any Rating</SelectItem>
                  <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  <SelectItem value="4.8">4.8+ Stars</SelectItem>
                  <SelectItem value="5.0">5.0 Stars Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Availability Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Availability Status</Label>
              <Select value={selectedAvailability} onValueChange={setSelectedAvailability}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="available">Available Now</SelectItem>
                  <SelectItem value="busy">Busy / Select Requests</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Max Price BDT Slider/Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Max Price (BDT)</Label>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">৳ {maxPriceBdt.toLocaleString()} BDT</span>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="50"
                value={maxPriceBdt}
                onChange={(e) => setMaxPriceBdt(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>৳ 100</span>
                <span>৳ 5,000</span>
              </div>
            </div>

            {/* Experience Level */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Experience Level</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Levels</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                  <SelectItem value="Expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </aside>

          {/* GRID OF SKILL CARDS */}
          <div className="md:col-span-3">
            {filteredListings.length > 0 ? (
              <div className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredListings.map((skill) => (
                  <SkillCard key={skill.id} {...skill} onBook={handleBook} />
                ))}
              </div>
            ) : (
              /* EMPTY STATE */
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-center py-12 px-4 shadow-sm">
                <CardContent className="space-y-3">
                  <div className="w-14 h-14 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
                    <Frown className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{isLoadingListings ? "Loading published skills..." : "No published skills match these filters"}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    {isLoadingListings ? "Fetching live courses and services." : "Adjust the filters or check back after a provider publishes a course or service."}
                  </p>
                  <Button onClick={resetFilters} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-xl shadow-md gap-1.5 mt-2">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset All Filters
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
        <DialogContent className="bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Publish a Service</DialogTitle>
            <DialogDescription>Your listing will appear in Discover after it is saved to your account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePublishService} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="service-title">Service title</Label>
              <Input id="service-title" value={serviceTitle} onChange={(event) => setServiceTitle(event.target.value)} maxLength={120} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service-description">Description</Label>
              <Textarea id="service-description" value={serviceDescription} onChange={(event) => setServiceDescription(event.target.value)} maxLength={2000} minLength={20} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service-delivery-mode">Delivery Mode</Label>
              <Select value={serviceDeliveryMode} onValueChange={(val: "on_campus" | "online") => setServiceDeliveryMode(val)}>
                <SelectTrigger id="service-delivery-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_campus">On-Campus Session</SelectItem>
                  <SelectItem value="online">Online (Google Meet/Zoom)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={serviceCategory} onValueChange={setServiceCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter((category) => category !== "All").map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="service-price">Price (৳ BDT)</Label>
                <Input id="service-price" type="number" min="10" step="10" value={servicePriceBdt} onChange={(event) => setServicePriceBdt(event.target.value)} required />
                <p className="text-xs text-slate-500">Provider receives 95% after 5% platform fee</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="service-duration">Duration (minutes)</Label>
                <Input id="service-duration" type="number" min="15" step="15" value={serviceDuration} onChange={(event) => setServiceDuration(event.target.value)} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPublishOpen(false)} disabled={isPublishing}>Cancel</Button>
              <Button type="submit" disabled={isPublishing}>{isPublishing ? "Publishing..." : "Publish Service"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
