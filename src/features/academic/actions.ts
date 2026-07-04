"use server";

import { revalidatePath } from "next/cache";

import { requireAdminMembership } from "@/features/organizations/queries";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  academicYearSchema,
  holidaySchema,
  termSchema,
  type AcademicYearInput,
  type HolidayInput,
  type TermInput,
} from "@/lib/validations/academic";
import type { ActionResult } from "@/types/action-result";

const SETTINGS_PATH = "/dashboard/settings";

export async function createAcademicYear(input: AcademicYearInput): Promise<ActionResult> {
  const parsed = academicYearSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage academic years" };
  }

  const supabase = await createClient();

  if (parsed.data.isCurrent) {
    await supabase
      .from("academic_years")
      .update({ is_current: false })
      .eq("organization_id", membership.organizationId);
  }

  const { error } = await supabase.from("academic_years").insert({
    organization_id: membership.organizationId,
    name: parsed.data.name,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    is_current: parsed.data.isCurrent,
  });

  if (error) {
    logger.warn("Failed to create academic year", { message: error.message });
    return { success: false, error: "Failed to create academic year" };
  }

  revalidatePath(SETTINGS_PATH);
  return { success: true };
}

export async function updateAcademicYear(
  id: string,
  input: AcademicYearInput,
): Promise<ActionResult> {
  const parsed = academicYearSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage academic years" };
  }

  const supabase = await createClient();

  if (parsed.data.isCurrent) {
    await supabase
      .from("academic_years")
      .update({ is_current: false })
      .eq("organization_id", membership.organizationId);
  }

  const { error } = await supabase
    .from("academic_years")
    .update({
      name: parsed.data.name,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      is_current: parsed.data.isCurrent,
    })
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    logger.warn("Failed to update academic year", { message: error.message });
    return { success: false, error: "Failed to update academic year" };
  }

  revalidatePath(SETTINGS_PATH);
  return { success: true };
}

export async function deleteAcademicYear(id: string): Promise<ActionResult> {
  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage academic years" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("academic_years")
    .delete()
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    logger.warn("Failed to delete academic year", { message: error.message });
    return { success: false, error: "Failed to delete academic year" };
  }

  revalidatePath(SETTINGS_PATH);
  return { success: true };
}

export async function createTerm(input: TermInput): Promise<ActionResult> {
  const parsed = termSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage terms" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("terms").insert({
    organization_id: membership.organizationId,
    academic_year_id: parsed.data.academicYearId,
    name: parsed.data.name,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
  });

  if (error) {
    logger.warn("Failed to create term", { message: error.message });
    return { success: false, error: "Failed to create term" };
  }

  revalidatePath(SETTINGS_PATH);
  return { success: true };
}

export async function deleteTerm(id: string): Promise<ActionResult> {
  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage terms" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("terms")
    .delete()
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    logger.warn("Failed to delete term", { message: error.message });
    return { success: false, error: "Failed to delete term" };
  }

  revalidatePath(SETTINGS_PATH);
  return { success: true };
}

export async function createHoliday(input: HolidayInput): Promise<ActionResult> {
  const parsed = holidaySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage holidays" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("holidays").insert({
    organization_id: membership.organizationId,
    academic_year_id: parsed.data.academicYearId ?? null,
    name: parsed.data.name,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
  });

  if (error) {
    logger.warn("Failed to create holiday", { message: error.message });
    return { success: false, error: "Failed to create holiday" };
  }

  revalidatePath(SETTINGS_PATH);
  return { success: true };
}

export async function deleteHoliday(id: string): Promise<ActionResult> {
  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage holidays" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("holidays")
    .delete()
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    logger.warn("Failed to delete holiday", { message: error.message });
    return { success: false, error: "Failed to delete holiday" };
  }

  revalidatePath(SETTINGS_PATH);
  return { success: true };
}
