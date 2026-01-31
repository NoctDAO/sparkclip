import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthResult {
  error: Error | null;
  isRateLimited?: boolean;
  retryAfter?: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-rate-limit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Origin": window.location.origin,
          },
          body: JSON.stringify({ action: "signup", email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { 
          error: new Error(data.message || data.error || "Sign up failed"),
          isRateLimited: response.status === 429,
          retryAfter: data.retry_after,
        };
      }

      // Set session if returned
      if (data.session) {
        await supabase.auth.setSession(data.session);
      }

      return { error: null, isRateLimited: false };
    } catch (err) {
      return { error: err as Error, isRateLimited: false };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-rate-limit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Origin": window.location.origin,
          },
          body: JSON.stringify({ action: "signin", email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { 
          error: new Error(data.message || data.error || "Sign in failed"),
          isRateLimited: response.status === 429,
          retryAfter: data.retry_after,
        };
      }

      // Set session
      if (data.session) {
        await supabase.auth.setSession(data.session);
      }

      return { error: null, isRateLimited: false };
    } catch (err) {
      return { error: err as Error, isRateLimited: false };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}