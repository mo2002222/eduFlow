import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useServerFn } from "@tanstack/react-start";
import { joinGroupByCode } from "@/lib/eduflow.functions";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/groups/join")({ component: Page });

function Page() {
  const nav = useNavigate();
  const fn = useServerFn(joinGroupByCode);
  const { register, handleSubmit } = useForm<{ code: string }>();
  const m = useMutation({
    mutationFn: (data: { code: string }) => fn({ data }),
    onSuccess: (r) => { toast.success(`Joined ${r.name}!`); nav({ to: "/groups/$id", params: { id: r.groupId } }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="max-w-md mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-6">Join a group</h1>
      <form onSubmit={handleSubmit((v) => m.mutate(v))} className="space-y-4 rounded-xl border bg-card p-6">
        <div>
          <Label>Join code</Label>
          <Input placeholder="MATH-7XQ92P" {...register("code", { required: true })} className="font-mono uppercase" />
        </div>
        <Button type="submit" disabled={m.isPending} className="w-full">{m.isPending ? "Joining..." : "Join group"}</Button>
      </form>
    </div>
  );
}
