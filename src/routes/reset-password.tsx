import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { AuthShell } from "./login";

export const Route = createFileRoute("/reset-password")({ component: Page });

function Page() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm<{ password: string }>();
  const onSubmit = async (v: { password: string }) => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: v.password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    nav({ to: "/dashboard" });
  };
  return (
    <AuthShell title="Set a new password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div><Label>New password</Label><Input type="password" {...register("password", { required: true, minLength: 6 })} /></div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? "Updating..." : "Update password"}</Button>
      </form>
    </AuthShell>
  );
}
