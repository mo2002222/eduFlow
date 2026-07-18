import { createFileRoute, Link, Outlet, redirect, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getMe, getUnreadNotificationCount } from "@/lib/eduflow.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard, Users, Bell, User as UserIcon, LogOut, Moon, Sun, GraduationCap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: Layout,
});

function Layout() {
  const fetchMe = useServerFn(getMe);
  const fetchUnread = useServerFn(getUnreadNotificationCount);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const { data: unread } = useQuery({
    queryKey: ["notifs:unread"], queryFn: () => fetchUnread(), refetchInterval: 20000,
  });
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("eduflow-theme", next ? "dark" : "light"); } catch {}
  };

  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, dot: false },
    { to: "/groups", label: "Groups", icon: Users, dot: false },
    { to: "/notifications", label: "Notifications", icon: Bell, dot: (unread?.count ?? 0) > 0 },
    { to: "/profile", label: "Profile", icon: UserIcon, dot: false },
  ] as const;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><GraduationCap className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-semibold">EduFlow</p>
            <p className="text-xs text-muted-foreground capitalize">{me?.role ?? "—"}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((n) => {
            const active = pathname === n.to || pathname.startsWith(n.to + "/");
            return (
              <Link key={n.to} to={n.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"}`}>
                <span className="relative">
                  <n.icon className="h-4 w-4" />
                  {n.dot && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />}
                </span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3 space-y-2">
          <div className="px-2 py-1">
            <p className="truncate text-sm font-medium">{me?.profile?.full_name || "—"}</p>
            <p className="truncate text-xs text-muted-foreground">{me?.profile?.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={toggleTheme}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={async () => { await supabase.auth.signOut(); router.navigate({ to: "/" }); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="border-b bg-card/50 px-6 py-3 md:hidden flex items-center justify-between">
          <span className="font-semibold">EduFlow</span>
          <Button size="sm" variant="ghost" onClick={async () => { await supabase.auth.signOut(); router.navigate({ to: "/" }); }}>Sign out</Button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
