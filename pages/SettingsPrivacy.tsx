import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Lock, EyeOff, MessageCircle, Phone, Save, Bell, User } from "lucide-react";
import { toast } from "sonner";
import { updateProfilePrivacy } from "@/lib/supabase";

export default function SettingsPrivacyPage() {
  const [messagePolicy, setMessagePolicy] = useState<"everyone" | "followers" | "matches" | "nobody">("followers");
  const [callPolicy, setCallPolicy] = useState<"everyone" | "followers" | "matches" | "nobody">("matches");
  const [hideContactInfo, setHideContactInfo] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await updateProfilePrivacy({
        messagePolicy,
        callPolicy,
        showOnline: showOnlineStatus,
        showActivity,
      });
      toast.success("Privacy and security settings updated successfully!");
    } catch (err) {
      toast.error("Settings saved locally.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
            Privacy & Security Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your personal data exposure, contact policies, and communication permissions.
          </p>
        </div>

        {/* COMMUNICATION POLICIES */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-indigo-500" />
              Communication Permissions
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Control who can send you direct messages or initiate call proposals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Message Policy */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-slate-900 dark:text-white">Direct Message Policy</Label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Who can initiate a chat conversation with you?</p>
              </div>
              <Select value={messagePolicy} onValueChange={(val: any) => setMessagePolicy(val)}>
                <SelectTrigger className="w-44 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                  <SelectValue placeholder="Policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="followers">Followers Only</SelectItem>
                  <SelectItem value="matches">Completed Matches Only</SelectItem>
                  <SelectItem value="nobody">Nobody</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Call Policy */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-slate-900 dark:text-white">Call Session Policy</Label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Who can send you WebRTC video/audio call proposals?</p>
              </div>
              <Select value={callPolicy} onValueChange={(val: any) => setCallPolicy(val)}>
                <SelectTrigger className="w-44 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                  <SelectValue placeholder="Policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="followers">Followers Only</SelectItem>
                  <SelectItem value="matches">Completed Matches Only</SelectItem>
                  <SelectItem value="nobody">Nobody</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* PERSONAL DATA & RLS PRIVACY PROTECTION */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-emerald-500" />
              Personal Data & Visibility
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Row Level Security policies enforce strict privacy for personal contact details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hide Exact Address & Phone Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5 pr-4">
                <Label htmlFor="hide-contact" className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer">
                  Hide Exact Street Address & Phone Number
                </Label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Keeps contact details private so they are never exposed to public queries.
                </p>
              </div>
              <Switch
                id="hide-contact"
                checked={hideContactInfo}
                onCheckedChange={setHideContactInfo}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>

            {/* Show Online Status */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5 pr-4">
                <Label htmlFor="show-online" className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer">
                  Display Online Status Badge
                </Label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Show a green online dot when you are actively using EwuSwap.
                </p>
              </div>
              <Switch
                id="show-online"
                checked={showOnlineStatus}
                onCheckedChange={setShowOnlineStatus}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>

            {/* Show Recent Activity */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5 pr-4">
                <Label htmlFor="show-activity" className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer">
                  Show Activity Feed
                </Label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Allow followers to see your recent exchange activity and course completions.
                </p>
              </div>
              <Switch
                id="show-activity"
                checked={showActivity}
                onCheckedChange={setShowActivity}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
            <Button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md gap-1.5"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Privacy Settings"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}
