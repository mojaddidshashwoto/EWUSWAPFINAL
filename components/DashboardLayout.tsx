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
import { Logo } from "@/components/ui/Logo";
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

  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const handleLayoutMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      onMouseMove={handleLayoutMouseMove}
      className="min-h-screen bg-[#0a0a0b] text-foreground flex flex-col md:flex-row relative selection:bg-indigo-500/30 selection:text-white"
    >
      {/* Living Deep Space Aurora Mesh Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* Blob 1: Cosmic Purple & Indigo */}
        <div className="absolute -top-[25%] -left-[10%] w-[65vw] h-[65vw] rounded-full bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-transparent blur-[140px] animate-aurora-1" />
        {/* Blob 2: Oceanic Blue */}
        <div className="absolute top-[25%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-bl from-sky-900/25 via-blue-950/20 to-transparent blur-[150px] animate-aurora-2" />
        {/* Blob 3: Neon Mint & Emerald Pulse */}
        <div className="absolute -bottom-[20%] left-[20%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tr from-emerald-950/30 via-teal-900/15 to-transparent blur-[130px] animate-aurora-pulse" />
        {/* Dynamic Global Mouse Spotlight Follower */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full bg-radial from-indigo-500/10 via-emerald-500/05 to-transparent blur-[110px] pointer-events-none transition-transform duration-100 ease-out will-change-transform opacity-70"
          style={{
            transform: `translate(${mousePos.x - 250}px, ${mousePos.y - 250}px)`,
          }}
        />
      </div>

      {/* DESKTOP SIDEBAR - Spatial Frosted Glass Panel */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/10 bg-black/40 backdrop-blur-3xl sticky top-0 h-screen z-30 shadow-2xl">
        {/* Logo / Brand */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <Logo size="md" tagline className="transition-transform duration-300 group-hover:scale-[1.02]" />
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center justify-between">
            <span>Main Menu</span>
            {isAdminOrMod && (
              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">Staff Mode</span>
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
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  active
                    ? isSpecialAdmin
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                      : "bg-white/[0.08] text-white border border-white/15 shadow-[0_0_25px_rgba(99,102,241,0.25)]"
                    : isSpecialAdmin
                    ? "text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComponent
                    className={`w-4 h-4 ${
                      active
                        ? "text-white"
                        : isSpecialAdmin
                        ? "text-rose-400"
                        : "text-zinc-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      active
                        ? "bg-white/20 text-white"
                        : isSpecialAdmin
                        ? "bg-rose-950 text-rose-300 border border-rose-800"
                        : "bg-indigo-950/80 text-indigo-300 border border-indigo-800/80"
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
        <div className="p-3 border-t border-white/10 bg-white/[0.015]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/10 shadow-xs hover:border-white/20 transition-colors">
            <Link href="/profile" className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-85 transition-opacity">
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-9 h-9 rounded-full object-cover border border-indigo-500/30 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                  {user.displayName}
                  {isAdminOrMod ? (
                    <Badge className="bg-rose-500 text-[8px] px-1 py-0 h-3.5 uppercase font-black">
                      {user.role}
                    </Badge>
                  ) : (
                    user.isVerified && <Badge className="bg-indigo-500 text-[9px] px-1 py-0 h-3.5">✓</Badge>
                  )}
                </p>
                <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              title="Logout"
              className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* TOP HEADER - Spatial Frosted Glass */}
        <header className="sticky top-0 z-20 bg-black/40 backdrop-blur-3xl border-b border-white/10 px-4 md:px-8 py-3 flex items-center justify-between gap-4">
          {/* Mobile Header Brand & Hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-zinc-300 hover:text-white">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-[#0a0a0b]/95 backdrop-blur-3xl p-0 border-r border-white/10 text-white">
                <SheetHeader className="p-5 border-b border-white/10">
                  <SheetTitle className="flex items-center gap-2 text-left">
                    <Logo size="sm" />
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
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          active
                            ? isSpecialAdmin
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-white/[0.08] text-white border border-white/15"
                            : isSpecialAdmin
                            ? "text-rose-400 hover:bg-rose-500/10"
                            : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              isSpecialAdmin ? "bg-rose-950 text-rose-300" : "bg-indigo-950 text-indigo-300"
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

            <Link href="/dashboard" className="transition-opacity hover:opacity-85">
              <Logo size="sm" />
            </Link>
          </div>

          {/* Search Bar with zero background & glowing focus */}
          <div className="hidden sm:flex items-center flex-1 max-w-md relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search skills, providers, courses (e.g. Figma, Python)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs rounded-xl"
            />
          </div>

          {/* Header Action Badges & Profile Dropdown */}
          <div className="flex items-center gap-3">
            <Link
              href="/wallet"
              className="flex items-center gap-2 bg-white/[0.03] p-1.5 rounded-xl border border-white/10 text-xs font-bold hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all"
            >
              <div className="flex items-center gap-1.5 text-emerald-400 px-2 py-0.5">
                <Wallet className="w-3.5 h-3.5" />
                <span className="font-extrabold tracking-tight">৳ {user.bdtBalance.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hidden lg:inline">BDT</span>
              </div>
            </Link>

            {/* Notification Bell */}
            <Link
              href="/notifications"
              className="relative p-2 rounded-xl bg-white/[0.03] border border-white/10 text-zinc-400 hover:text-white hover:border-white/25 transition-all"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0a0a0b]" />
            </Link>

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-indigo-500/40 transition-all outline-none cursor-pointer">
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-8 h-8 rounded-full object-cover border border-white/15"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#0e0f14]/95 backdrop-blur-3xl border-white/10 text-white">
                <DropdownMenuLabel className="font-semibold text-xs">
                  <div className="flex items-center justify-between">
                    <span>{user.displayName}</span>
                    <Badge className={`text-[8px] uppercase font-bold px-1 py-0 h-3.5 ${isAdminOrMod ? "bg-rose-500" : "bg-indigo-500"}`}>
                      {user.role}
                    </Badge>
                  </div>
                  <div className="text-[10px] font-normal text-zinc-400 truncate">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />

                {/* Staff Admin Panel Link */}
                {isAdminOrMod && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setLocation("/admin")}
                      className="text-xs font-bold text-rose-400 cursor-pointer bg-rose-950/30 hover:bg-rose-900/40"
                    >
                      <ShieldAlert className="w-4 h-4 mr-2 text-rose-400" />
                      Admin Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                  </>
                )}

                <DropdownMenuItem onClick={() => setLocation("/profile")} className="text-xs cursor-pointer hover:bg-white/[0.06]">
                  <User className="w-4 h-4 mr-2 text-indigo-400" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/wallet")} className="text-xs cursor-pointer hover:bg-white/[0.06]">
                  <Wallet className="w-4 h-4 mr-2 text-emerald-400" />
                  Wallet (bKash/Nagad)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/onboarding")} className="text-xs cursor-pointer hover:bg-white/[0.06]">
                  <Sparkles className="w-4 h-4 mr-2 text-amber-400" />
                  Re-run Onboarding
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/settings")} className="text-xs cursor-pointer hover:bg-white/[0.06]">
                  <Settings className="w-4 h-4 mr-2 text-zinc-400" />
                  Settings & Security
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleLogout} className="text-xs text-rose-400 cursor-pointer hover:bg-rose-950/30">
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="animate-fade-in flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR - Spatial Glass */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0a0a0b]/85 backdrop-blur-3xl border-t border-white/10 flex items-center justify-around py-2 px-1">
        {MOBILE_CORE_ITEMS.map((item) => {
          const active = isCurrentPath(item.path);
          const IconComponent = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                active ? "text-indigo-400 font-bold" : "text-zinc-400 hover:text-white"
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
