import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type UserRole = "student" | "moderator" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  displayName: string;
  avatar: string;
  role: UserRole;
  credits: number;
  bdtBalance: number;
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user: User }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; user: User }>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapAuthUser = (authUser: any): User | null => {
  if (!authUser) return null;

  const metadata = authUser.user_metadata ?? {};
  const normalizedEmail = (authUser.email ?? "").trim().toLowerCase();
  const fullName = metadata.full_name || metadata.name || authUser.email?.split("@")?.[0] || "User";

  return {
    id: authUser.id,
    email: normalizedEmail,
    name: fullName,
    displayName: metadata.display_name || fullName,
    avatar: metadata.avatar_url || metadata.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
    role: (metadata.role as UserRole) || "student",
    credits: Number(metadata.credits ?? 0),
    bdtBalance: Number(metadata.bdt_balance ?? 0),
    isVerified: Boolean(metadata.is_verified ?? false),
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (isMounted) {
          setUser(mapAuthUser(session?.user) ?? null);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapAuthUser(session?.user) ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      throw error;
    }

    const mappedUser = mapAuthUser(data.user);
    if (!mappedUser) {
      throw new Error("No authenticated user returned from Supabase.");
    }

    setUser(mappedUser);
    return { success: true, user: mappedUser };
  };

  const signup = async (name: string, email: string, password: string) => {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: trimmedName,
          display_name: trimmedName,
          role: "student",
        },
      },
    });

    if (error) {
      throw error;
    }

    const mappedUser = mapAuthUser(data.user);
    if (!mappedUser) {
      throw new Error("Account created but no user session was returned from Supabase.");
    }

    setUser(mappedUser);
    return { success: true, user: mappedUser };
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setUser(null);
  };

  const hasRole = (allowedRoles: UserRole[]) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
