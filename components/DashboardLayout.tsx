import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Search,
  Sparkles,
  BookOpen,
  Repeat,
  MessageCircle,
  Users,
  User,
  Settings,
  Bell,
  Menu,
  X,
  Wallet,
  Award,
  LogOut,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getCurrentUser, type UserRole } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  isAdmin?: boolean;
}

const BASE_NAV_ITEMS: NavigationItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Discover", path: "/discover", icon: Search },
  { label: "Exchanges", path: "/exchanges", icon: Repeat },
  { label: "Wallet", path: "/wallet", icon: Wallet },
  { label: "Messages", path: "/messages", icon: MessageCircle },
  { label: "Groups", path: "/groups", icon: Users },
  { label: "Community", path: "/community", icon: Sparkles },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Profile", path: "/profile", icon: User },
  { label: "Settings", path: "/settings", icon: Settings },
];

const MOBILE_CORE_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Discover", path: "/discover", icon: Search },
  { label: "Exchanges", path: "/exchanges", icon: Repeat },
  { label: "Wallet", path: "/wallet", icon: Wallet },
  { label: "Profile", path: "/profile", icon: User },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  // Dynamic user state from local storage / auth
  const [user, setUser] = useState({
    displayName: "Guest User",
    email: "",
    bdtBalance: 0,
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
    isVerified: false,
    role: "student" as UserRole,
  });

  const loadUserData = async () => {
    const current = await getCurrentUser();
    if (current) {
      setUser({
        displayName: current.displayName || current.name || "Aisha Rahman",
        email: current.email || "aisha@ewu.edu.bd",
        bdtBalance: current.bdtBalance ?? 2880,
        avatarUrl: current.avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=85",
        isVerified: current.isVerified ?? true,
        role: current.role || "student",
      });
    }
  };

  useEffect(() => {
    loadUserData();
    const handleUpdate = () => loadUserData();
    window.addEventListener("ss_user_changed", handleUpdate);
    window.addEventListener("ss_wallet_updated", handleUpdate);
    return () => {
      window.removeEventListener("ss_user_changed", handleUpdate);
      window.removeEventListener("ss_wallet_updated", handleUpdate);
    };
  }, []);

  const isAdminOrMod = user.role === "admin" || user.role === "moderator";

  // Build nav items dynamically: include Admin Panel when role is admin or moderator
  const navItems: NavigationItem[] = [
    ...BASE_NAV_ITEMS,
    ...(isAdminOrMod
      ? [
          {
            label: "Admin Panel",
            path: "/admin",
            icon: ShieldAlert,
            badge: user.role === "admin" ? "ADMIN" : "MOD",
            isAdmin: true,
          },
        ]
      : []),
  ];

  const isCurrentPath = (path: string) => {
    if (path === "/dashboard" && (location === "/" || location === "/dashboard")) return true;
    return location === path;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 h-screen z-30 shadow-xs">
        {/* Logo / Brand */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              E
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                Ewu<span className="text-indigo-600 dark:text-indigo-400">Swap</span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium">Campus Skill Exchange</p>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Main Menu</span>
            {isAdminOrMod && (
              <span className="text-[9px] font-bold text-rose-500 uppercase">Staff Mode</span>
            )}
          </div>
          {navItems.map((item) => {
            const active = isCurrentPath(item.path);
            const IconComponent = item.icon;
            const isSpecialAdmin = (item as any).isAdmin;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? isSpecialAdmin
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                      : "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : isSpecialAdmin
                    ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComponent
                    className={`w-4 h-4 ${
                      active
                        ? "text-white"
                        : isSpecialAdmin
                        ? "text-rose-500"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      active
                        ? "bg-white/20 text-white"
                        : isSpecialAdmin
                        ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                        : "bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Card with Role Badge */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <Link href="/profile" className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-85 transition-opacity">
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-9 h-9 rounded-full object-cover border border-indigo-500/30 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1">
                  {user.displayName}
                  {isAdminOrMod ? (
                    <Badge className="bg-rose-500 text-[8px] px-1 py-0 h-3.5 uppercase font-black">
                      {user.role}
                    </Badge>
                  ) : (
                    user.isVerified && <Badge className="bg-indigo-500 text-[9px] px-1 py-0 h-3.5">✓</Badge>
                  )}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              title="Logout"
              className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* TOP HEADER */}
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 md:px-8 py-3 flex items-center justify-between gap-4">
          {/* Mobile Header Brand & Hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-600 dark:text-slate-300">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-white dark:bg-slate-900 p-0 border-r border-slate-200 dark:border-slate-800">
                <SheetHeader className="p-5 border-b border-slate-100 dark:border-slate-800">
                  <SheetTitle className="flex items-center gap-2 text-left">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-base">
                      E
                    </div>
                    <span className="text-lg font-extrabold tracking-tight">
                      Ewu<span className="text-indigo-600">Swap</span>
                    </span>
                  </SheetTitle>
                </SheetHeader>
                <div className="px-3 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-80px)]">
                  {navItems.map((item) => {
                    const active = isCurrentPath(item.path);
                    const IconComponent = item.icon;
                    const isSpecialAdmin = (item as any).isAdmin;
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${
                          active
                            ? isSpecialAdmin
                              ? "bg-rose-600 text-white"
                              : "bg-indigo-600 text-white"
                            : isSpecialAdmin
                            ? "text-rose-600 hover:bg-rose-50"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              isSpecialAdmin ? "bg-rose-100 text-rose-700" : "bg-indigo-100 text-indigo-600"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/dashboard" className="text-base font-extrabold tracking-tight">
              Ewu<span className="text-indigo-600">Swap</span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="hidden sm:flex items-center flex-1 max-w-md relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search skills, providers, courses (e.g. Figma, Python)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-100/70 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-xs rounded-xl focus-visible:ring-indigo-500"
            />
          </div>

          {/* Header Action Badges & Profile Dropdown */}
          <div className="flex items-center gap-3">
            <Link
              href="/wallet"
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs font-bold hover:border-indigo-400/50 transition-colors"
            >
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 px-2 py-0.5">
                <Wallet className="w-3.5 h-3.5" />
                <span>৳ {user.bdtBalance.toLocaleString()}</span>
                <span className="text-[10px] font-normal text-slate-400 hidden lg:inline">BDT</span>
              </div>
            </Link>

            {/* Notification Bell */}
            <Link
              href="/notifications"
              className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            </Link>

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-indigo-500/30 transition-all outline-none">
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DropdownMenuLabel className="font-semibold text-xs">
                  <div className="flex items-center justify-between">
                    <span>{user.displayName}</span>
                    <Badge className={`text-[8px] uppercase font-bold px-1 py-0 h-3.5 ${isAdminOrMod ? "bg-rose-500" : "bg-indigo-500"}`}>
                      {user.role}
                    </Badge>
                  </div>
                  <div className="text-[10px] font-normal text-slate-400 truncate">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Staff Admin Panel Link */}
                {isAdminOrMod && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setLocation("/admin")}
                      className="text-xs font-bold text-rose-600 dark:text-rose-400 cursor-pointer bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100"
                    >
                      <ShieldAlert className="w-4 h-4 mr-2 text-rose-600 dark:text-rose-400" />
                      Admin Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem onClick={() => setLocation("/profile")} className="text-xs cursor-pointer">
                  <User className="w-4 h-4 mr-2 text-indigo-500" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/wallet")} className="text-xs cursor-pointer">
                  <Wallet className="w-4 h-4 mr-2 text-emerald-500" />
                  Wallet (bKash/Nagad)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/onboarding")} className="text-xs cursor-pointer">
                  <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
                  Re-run Onboarding
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/settings")} className="text-xs cursor-pointer">
                  <Settings className="w-4 h-4 mr-2 text-slate-500" />
                  Settings & Security
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-xs text-rose-500 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-2 px-1">
        {MOBILE_CORE_ITEMS.map((item) => {
          const active = isCurrentPath(item.path);
          const IconComponent = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                active ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <IconComponent className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
