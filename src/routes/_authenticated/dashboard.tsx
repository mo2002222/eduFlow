import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe, getStudentDashboard, getTeacherDashboard } from "@/lib/eduflow.functions";
import { Users, CalendarCheck2, GraduationCap, Bell, Plus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Page });

function Stat({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function Page() {
  const fetchMe = useServerFn(getMe);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const role = me?.role;

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {me?.profile?.full_name?.split(" ")[0] || "there"} 👋</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening in your {role === "teacher" ? "classroom" : "studies"}.</p>
      </div>
      {role === "teacher" ? <TeacherView /> : <StudentView />}
    </div>
  );
}

function TeacherView() {
  const fn = useServerFn(getTeacherDashboard);
  const { data } = useQuery({ queryKey: ["dash:teacher"], queryFn: () => fn() });
  if (!data) return <p className="text-muted-foreground">Loading...</p>;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Total Groups" value={data.totalGroups} icon={Users} />
        <Stat label="Total Students" value={data.totalStudents} icon={GraduationCap} />
        <Stat label="Total Sessions" value={data.totalSessions} icon={CalendarCheck2} />
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-3">Quick actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to="/groups/new"><Plus className="h-4 w-4 mr-1" /> Create Group</Link></Button>
            <Button variant="outline" asChild><Link to="/groups">View Groups</Link></Button>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Bell className="h-4 w-4" /> Recent activity</h3>
          {data.notifications.length === 0 ? <p className="text-sm text-muted-foreground">No notifications yet.</p> : (
            <ul className="space-y-2 text-sm">
              {data.notifications.slice(0, 5).map((n: any) => (
                <li key={n.id} className="flex justify-between"><span>{n.title}</span><span className="text-muted-foreground text-xs">{new Date(n.created_at).toLocaleDateString()}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-4 rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-3">Upcoming exams</h3>
        {data.upcomingExams.length === 0 ? <p className="text-sm text-muted-foreground">None scheduled.</p> : (
          <ul className="space-y-2 text-sm">{data.upcomingExams.map((e: any) => (
            <li key={e.id} className="flex justify-between"><span>{e.title}</span><span className="text-muted-foreground">{new Date(e.start_at).toLocaleString()}</span></li>
          ))}</ul>
        )}
      </div>
    </>
  );
}

function StudentView() {
  const fn = useServerFn(getStudentDashboard);
  const { data } = useQuery({ queryKey: ["dash:student"], queryFn: () => fn() });
  if (!data) return <p className="text-muted-foreground">Loading...</p>;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Joined Groups" value={data.groups.length} icon={Users} />
        <Stat label="Upcoming Exams" value={data.upcomingExams.length} icon={CalendarCheck2} />
        <Stat label="Recent Grades" value={data.recentGrades.length} icon={GraduationCap} />
      </div>
      <div className="mt-8 flex flex-wrap gap-2">
        <Button asChild><Link to="/groups/join"><LogIn className="h-4 w-4 mr-1" /> Join a group</Link></Button>
        <Button variant="outline" asChild><Link to="/groups">My groups</Link></Button>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-3">Upcoming exams</h3>
          {data.upcomingExams.length === 0 ? <p className="text-sm text-muted-foreground">None scheduled.</p> : (
            <ul className="space-y-2 text-sm">{data.upcomingExams.map((e: any) => (
              <li key={e.id} className="flex justify-between"><span>{e.title}</span><span className="text-muted-foreground">{new Date(e.start_at).toLocaleString()}</span></li>
            ))}</ul>
          )}
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-3">Recent grades</h3>
          {data.recentGrades.length === 0 ? <p className="text-sm text-muted-foreground">No grades yet.</p> : (
            <ul className="space-y-2 text-sm">{data.recentGrades.map((g: any) => (
              <li key={g.id} className="flex justify-between"><span className="capitalize">{g.source}</span><span className="font-medium">{g.score}/{g.max_score}</span></li>
            ))}</ul>
          )}
        </div>
      </div>
    </>
  );
}
