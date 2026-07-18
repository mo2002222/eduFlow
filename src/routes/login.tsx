import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string; password: string }>();

  const onSubmit = async (v: { email: string; password: string }) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(v);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    nav({ to: "/dashboard" });
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your EduFlow account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email", { required: true })} />
          {errors.email && <p className="mt-1 text-xs text-destructive">Email is required</p>}
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...register("password", { required: true, minLength: 6 })} />
          {errors.password && <p className="mt-1 text-xs text-destructive">Min 6 characters</p>}
        </div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? "Signing in..." : "Sign in"}</Button>
        <div className="flex justify-between text-sm">
          <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
          <Link to="/register/student" className="text-primary hover:underline">Create account</Link>
        </div>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <Link to="/" className="mb-8 inline-flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><GraduationCap className="h-5 w-5" /></div>
          <span className="text-lg font-semibold">EduFlow</span>
        </Link>
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
