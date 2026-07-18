import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Users, CalendarCheck2, FileText, ClipboardList, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><GraduationCap className="h-5 w-5" /></div>
            <span className="text-lg font-semibold tracking-tight">EduFlow</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link to="/login" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">Login</Link>
            <Link to="/register/student" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Get started</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">Modern education management</span>
        <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold tracking-tight md:text-6xl">Teach, learn, and grow — all in one workspace.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">EduFlow gives teachers and students one beautifully simple place for groups, sessions, attendance, assignments, exams and grading.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/register/teacher" className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">Register as Teacher</Link>
          <Link to="/register/student" className="rounded-lg border border-input bg-card px-6 py-3 text-sm font-semibold hover:bg-accent">Register as Student</Link>
          <Link to="/login" className="rounded-lg px-6 py-3 text-sm font-semibold hover:bg-accent">Login</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Users, title: "Groups & Join Codes", body: "Create a class in seconds. Students join with a unique code or link." },
            { icon: CalendarCheck2, title: "Sessions & Attendance", body: "Plan sessions, mark attendance, and track participation over time." },
            { icon: FileText, title: "Files & Resources", body: "Share PDFs, images, videos and documents securely with your class." },
            { icon: ClipboardList, title: "Assignments", body: "Hand out work, collect submissions, and grade with feedback." },
            { icon: BarChart3, title: "Exams & Quizzes", body: "Build timed exams with MCQ, True/False and short-answer questions." },
            { icon: GraduationCap, title: "Grades & Profiles", body: "Auto-aggregated grades and rich student profiles with attendance %." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-sm">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} EduFlow</footer>
    </div>
  );
}
