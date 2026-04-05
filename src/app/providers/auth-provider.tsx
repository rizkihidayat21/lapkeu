import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, Profile, supabase } from "../../lib/supabase";

interface SignInInput {
  email: string;
  password: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  configError: string | null;
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
  updatePassword: (nextPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(userId: string) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data as Profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setIsLoading(false);
        return;
      }

      setSession(data.session);
      setUser(data.session?.user ?? null);

      if (data.session?.user) {
        try {
          const nextProfile = await loadProfile(data.session.user.id);
          if (isMounted) {
            setProfile(nextProfile);
          }
        } catch {
          if (isMounted) {
            setProfile(null);
          }
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      loadProfile(nextSession.user.id)
        .then((nextProfile) => setProfile(nextProfile))
        .catch(() => setProfile(null))
        .finally(() => setIsLoading(false));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function refreshProfile() {
    if (!user) {
      setProfile(null);
      return;
    }

    const nextProfile = await loadProfile(user.id);
    setProfile(nextProfile);
  }

  async function signIn(input: SignInInput) {
    if (!supabase) {
      throw new Error("Supabase belum dikonfigurasi.");
    }

    const email = input.email.trim().toLowerCase();
    const password = input.password;

    if (!email || !password) {
      throw new Error("Email dan password wajib diisi.");
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message);
    }
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  async function updatePassword(nextPassword: string) {
    if (!supabase) {
      throw new Error("Supabase belum dikonfigurasi.");
    }

    const password = nextPassword.trim();
    if (password.length < 8) {
      throw new Error("Password baru minimal 8 karakter.");
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw new Error(error.message);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      isLoading,
      isConfigured: isSupabaseConfigured,
      configError: isSupabaseConfigured
        ? null
        : "Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY terlebih dahulu.",
      signIn,
      signOut,
      updatePassword,
      refreshProfile,
    }),
    [session, user, profile, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider.");
  }
  return context;
}
