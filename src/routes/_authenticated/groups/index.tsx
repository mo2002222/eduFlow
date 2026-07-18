import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listGroups } from "@/lib/eduflow.functions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Plus, LogIn, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/groups/")({ component: Page });

function Page() {
  const { session, loading } = useAuth();
  const fn = useServerFn(listGroups);
  const { data, error } = useQuery({
    queryKey: ["groups:list"],
    queryFn: () => fn(),
    enabled: !!session?.access_token,
    retry: false,
  });
  if (loading || !session || !data) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (error) return <div className="p-8 text-destructive">{error.message}</div>;
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
        <div className="flex gap-2">
          {data.role === "teacher"
            ? <Button asChild><Link to="/groups/new"><Plus className="h-4 w-4 mr-1" />Create group</Link></Button>
            : <Button asChild><Link to="/groups/join"><LogIn className="h-4 w-4 mr-1" />Join group</Link></Button>}
        </div>
      </div>
      {data.groups.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No groups yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.groups.map((g: any) => (
            <Link key={g.id} to="/groups/$id" params={{ id: g.id }} className="rounded-xl border bg-card p-5 shadow-sm hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{g.name}</h3>
                <span className="text-xs text-muted-foreground">{g.grade}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{g.subject}</p>
              {data.role === "teacher" && (
                <p className="mt-3 text-xs font-mono bg-secondary text-secondary-foreground inline-block px-2 py-1 rounded">{g.join_code}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
