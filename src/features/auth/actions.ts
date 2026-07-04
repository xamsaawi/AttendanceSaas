"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validations/auth";
import type { ActionResult } from "@/types/action-result";

export type { ActionResult };

export async function login(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    logger.warn("Login failed", { email: parsed.data.email, message: error.message });
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function register(input: RegisterInput): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });

  if (error) {
    logger.warn("Registration failed", { email: parsed.data.email, message: error.message });
    return { success: false, error: error.message };
  }

  if (data.user) {
    try {
      await createSchoolForNewOwner(data.user.id, parsed.data.schoolName);
    } catch (err) {
      logger.error("Failed to create school for new owner", {
        userId: data.user.id,
        message: err instanceof Error ? err.message : String(err),
      });
      return {
        success: false,
        error: "Your account was created, but we couldn't set up your school. Please contact support.",
      };
    }
  }

  return { success: true };
}

async function createSchoolForNewOwner(userId: string, schoolName: string) {
  const admin = createAdminClient();
  const slugBase = slugify(schoolName) || "school";
  const slug = `${slugBase}-${userId.slice(0, 8)}`;

  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .insert({ name: schoolName, slug })
    .select("id")
    .single();

  if (orgError) throw orgError;

  const { error: memberError } = await admin
    .from("organization_members")
    .insert({ organization_id: organization.id, user_id: userId, role: "owner" });

  if (memberError) throw memberError;
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email);

  if (error) {
    logger.warn("Password reset request failed", {
      email: parsed.data.email,
      message: error.message,
    });
    return { success: false, error: error.message };
  }

  return { success: true };
}
