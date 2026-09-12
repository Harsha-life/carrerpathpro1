import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/AppShell";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [{ to: "/admin", label: "Overview", icon: LayoutDashboard }] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-5">
            <Brand />
            <div className="hidden h-7 w-px bg-border sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
              <ShieldCheck className="size-4 text-primary" />
              <span className="text-sm font-semibold">Admin workspace</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-52 truncate text-xs text-muted-foreground lg:inline">{user?.email}</span>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">
                <ArrowLeft className="size-4" /> Back to app
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
        <nav className="border-t border-border/60">
          <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 py-2">
            {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                  pathname === to && "bg-secondary text-foreground",
                )}
              >
                <Icon className="size-4" /> {label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-10">{children}</main>
    </div>
  );
}