import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Calendar, Clock, Coins, Wallet, ShieldCheck, TrendingUp, Plus, Pencil, GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createGroupLearningSession,
  joinGroupLearningSession,
  listGroupLearningSessions,
  updateGroupLearningSession,
  type GroupLearningSession,
} from "@/lib/supabase";

const GROUP_CATEGORIES = ["Arts", "Business", "Career", "Design", "Finance", "Languages", "Marketing", "Music", "Photography", "Productivity", "Science", "Technology", "Wellness", "Writing"];

function toLocalDateTimeInput(value: Date) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function GroupLearningPage() {
  const [groups, setGroups] = useState<GroupLearningSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSession, setEditingSession] = useState<GroupLearningSession | null>(null);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupOutcomes, setNewGroupOutcomes] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState("technology");
  const [newGroupCost, setNewGroupCost] = useState("10");
  const [newGroupCapacity, setNewGroupCapacity] = useState("15");
  const [newGroupStartsAt, setNewGroupStartsAt] = useState(() => toLocalDateTimeInput(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [newGroupEndsAt, setNewGroupEndsAt] = useState(() => toLocalDateTimeInput(new Date(Date.now() + 24 * 60 * 60 * 1000 + 90 * 60 * 1000)));

  const loadGroups = async () => {
    try {
      setGroups(await listGroupLearningSessions());
    } catch (error: any) {
      toast.error(error?.message || "Could not load group sessions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const clearForm = () => {
    setEditingSession(null);
    setNewGroupTitle("");
    setNewGroupDescription("");
    setNewGroupOutcomes("");
    setNewGroupCategory("technology");
    setNewGroupCost("10");
    setNewGroupCapacity("15");
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    setNewGroupStartsAt(toLocalDateTimeInput(startsAt));
    setNewGroupEndsAt(toLocalDateTimeInput(new Date(startsAt.getTime() + 90 * 60 * 1000)));
  };

  const handleJoinGroup = async (group: GroupLearningSession) => {
    try {
      await joinGroupLearningSession(group.id, !group.isJoined);
      await loadGroups();
      toast.success(group.isJoined ? `Left "${group.title}".` : `Joined "${group.title}".`);
    } catch (error: any) {
      toast.error(error?.message || `Could not update membership for "${group.title}".`);
    }
  };

  const openManageSession = (group: GroupLearningSession) => {
    setEditingSession(group);
    setNewGroupTitle(group.title);
    setNewGroupDescription(group.description);
    setNewGroupOutcomes(group.learningOutcomes);
    setNewGroupCategory(group.category.toLowerCase());
    setNewGroupCost(String(group.creditCost));
    setNewGroupCapacity(String(group.maxStudents));
    setNewGroupStartsAt(toLocalDateTimeInput(new Date(group.startsAt)));
    setNewGroupEndsAt(toLocalDateTimeInput(new Date(group.endsAt)));
    setCreateModalOpen(true);
  };

  const handleSaveGroup = async () => {
    const cost = Number(newGroupCost);
    const capacity = Number(newGroupCapacity);
    const startsAt = new Date(newGroupStartsAt);
    const endsAt = new Date(newGroupEndsAt);
    if (newGroupTitle.trim().length < 5 || newGroupDescription.trim().length < 20 || newGroupOutcomes.trim().length < 10) {
      toast.error("Add a title (5+ characters), description (20+), and learning outcomes (10+).");
      return;
    }
    if (!Number.isInteger(cost) || cost < 0 || !Number.isInteger(capacity) || capacity < 2 || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt <= new Date() || endsAt <= startsAt) {
      toast.error("Check the credit price, capacity, and future session start/end times.");
      return;
    }

    const payload = {
      title: newGroupTitle.trim(),
      description: newGroupDescription.trim(),
      learningOutcomes: newGroupOutcomes.trim(),
      categorySlug: newGroupCategory,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      creditCost: cost,
      maxStudents: capacity,
    };

    setIsSaving(true);
    try {
      if (editingSession) {
        await updateGroupLearningSession(editingSession.id, payload);
        toast.success("Your group session was updated.");
      } else {
        await createGroupLearningSession(payload);
        toast.success("Your group session was published.");
      }
      await loadGroups();
      setCreateModalOpen(false);
      clearForm();
    } catch (error: any) {
      toast.error(error?.message || "Could not save the group session.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-500" />
              Group Learning & Study Circles
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Join multi-student study sessions or host your own group class.
            </p>
          </div>

          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Host Group Session
          </Button>
        </div>

        {/* VALUE EMPHASIS BANNER */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white border border-indigo-800/40 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Why Group Learning Works Better on EwuSwap
              </h3>
              <p className="text-xs text-indigo-200 leading-relaxed max-w-2xl">
                Group learning makes sessions <strong className="text-emerald-300">more affordable for students</strong> (lower credit cost per student) while providers <strong className="text-amber-300">earn higher total returns</strong> from multiple enrolled students simultaneously!
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs shrink-0 self-start sm:self-center">
            Win-Win Economy
          </Badge>
        </div>

        {/* GROUP CARDS GRID */}
        {isLoading ? (
          <p className="py-12 text-center text-sm text-slate-500">Loading group sessions...</p>
        ) : groups.length === 0 ? (
          <Card className="border-dashed text-center">
            <CardContent className="py-12 text-sm text-slate-500">No group sessions are listed yet. Host the first one.</CardContent>
          </Card>
        ) : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((grp) => (
            <Card key={grp.id} className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden">
              <div>
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">
                    {grp.category}
                  </Badge>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{grp.enrolledStudents} / {grp.maxStudents} Enrolled</span>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-3">
                  {/* Provider */}
                  <div className="flex items-center gap-2.5">
                    <img src={grp.hostAvatar} alt={grp.hostName} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        {grp.hostName}
                        {grp.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />}
                      </h4>
                      <p className="text-[10px] text-slate-400">Host / Teacher</p>
                    </div>
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{grp.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {grp.description}
                    </p>
                  </div>

                  <div className="rounded-lg bg-indigo-50/70 p-3 dark:bg-indigo-950/30">
                    <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300">
                      <GraduationCap className="h-3.5 w-3.5" /> What you'll learn
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{grp.learningOutcomes}</p>
                  </div>

                  {/* Schedule */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" /> {new Date(grp.startsAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {new Date(grp.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}–{new Date(grp.endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                </CardContent>
              </div>

              {/* Price & Join CTA */}
              <CardFooter className="px-5 py-3 bg-slate-50/60 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                    <Wallet className="w-4 h-4" />
                    <span>৳ {(grp.creditCost * 10).toLocaleString()} BDT</span>
                  </div>
                  <span className="text-[10px] text-slate-400">per student · Escrow Protected</span>
                </div>

                {grp.isOwner ? (
                  <Button size="sm" variant="outline" onClick={() => openManageSession(grp)} className="gap-1.5 text-xs">
                    <Pencil className="h-3.5 w-3.5" /> Manage Session
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleJoinGroup(grp)} disabled={!grp.isJoined && grp.enrolledStudents >= grp.maxStudents} variant={grp.isJoined ? "outline" : "default"} className="text-xs">
                    {grp.isJoined ? "Leave Session" : grp.enrolledStudents >= grp.maxStudents ? "Session Full" : "Join Group Session"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>}
      </div>

      {/* CREATE GROUP MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              {editingSession ? "Manage Group Session" : "Host a Group Study Session"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Add a clear description, learning outcomes, schedule, and capacity for your group.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="group-title">Session title</Label>
              <Input id="group-title" placeholder="e.g. Next.js App Router Masterclass" value={newGroupTitle} onChange={(e) => setNewGroupTitle(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-description">Brief description</Label>
              <Textarea id="group-description" placeholder="Who is this for, and what will the session cover?" value={newGroupDescription} onChange={(e) => setNewGroupDescription(e.target.value)} minLength={20} maxLength={1000} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-outcomes">What will people learn?</Label>
              <Textarea id="group-outcomes" placeholder="List the skills or outcomes attendees will leave with." value={newGroupOutcomes} onChange={(e) => setNewGroupOutcomes(e.target.value)} minLength={10} maxLength={1000} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={newGroupCategory} onValueChange={setNewGroupCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GROUP_CATEGORIES.map((category) => <SelectItem key={category} value={category.toLowerCase()}>{category}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="group-credit-cost">Price per student (৳ BDT)</Label>
                <Input id="group-credit-cost" type="number" min="0" step="50" value={newGroupCost} onChange={(e) => setNewGroupCost(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="group-capacity">Maximum attendees</Label>
                <Input id="group-capacity" type="number" min="2" max="500" step="1" value={newGroupCapacity} onChange={(e) => setNewGroupCapacity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="group-start">Starts</Label>
                <Input id="group-start" type="datetime-local" value={newGroupStartsAt} onChange={(e) => setNewGroupStartsAt(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="group-end">Ends</Label>
                <Input id="group-end" type="datetime-local" value={newGroupEndsAt} onChange={(e) => setNewGroupEndsAt(e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => { setCreateModalOpen(false); clearForm(); }} disabled={isSaving} className="text-xs">Cancel</Button>
            <Button onClick={handleSaveGroup} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-xl">
              {isSaving ? "Saving..." : editingSession ? "Save Changes" : "Publish Group Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
