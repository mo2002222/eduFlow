import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe, getStudentProfile } from "@/lib/eduflow.functions";

export const Route = createFileRoute("/_authenticated/profile")({ component: Page });

function Page() {
  const fnMe = useServerFn(getMe);
  const fnSP = useServerFn(getStudentProfile);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => fnMe() });
  const { data: sp } = useQuery({ queryKey: ["studentProfile"], queryFn: () => fnSP(), enabled: me?.role === "student" });
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>
      <div className="rounded-xl border bg-card p-6 mb-6">
        <h3 className="font-semibold mb-3">Personal information</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-muted-foreground">Name</dt><dd>{me?.profile?.full_name || "—"}</dd>
          <dt className="text-muted-foreground">Email</dt><dd>{me?.profile?.email}</dd>
          <dt className="text-muted-foreground">Phone</dt><dd>{me?.profile?.phone || "—"}</dd>
          <dt className="text-muted-foreground">Role</dt><dd className="capitalize">{me?.role}</dd>
          {me?.profile?.grade_level && <><dt className="text-muted-foreground">Grade level</dt><dd>{me.profile.grade_level}</dd></>}
        </dl>
      </div>
      {me?.role === "student" && sp && (
        <>
          <div className="rounded-xl border bg-card p-6 mb-6">
            <h3 className="font-semibold mb-3">Attendance</h3>
            <p className="text-3xl font-bold">{sp.attendancePct}%</p>
            <p className="text-sm text-muted-foreground">{sp.attendanceRecords.length} sessions recorded</p>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-3">Grades</h3>
            {sp.grades.length === 0 ? <p className="text-sm text-muted-foreground">No grades yet.</p> : (
              <ul className="divide-y">{sp.grades.map((g: any) => (
                <li key={g.id} className="py-2 flex justify-between text-sm"><span className="capitalize">{g.source} · {g.groups?.name}</span><span className="font-medium">{g.score}/{g.max_score}</span></li>
              ))}</ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
