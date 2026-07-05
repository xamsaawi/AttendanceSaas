"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSchoolSettings } from "@/features/organizations/actions";
import { schoolSettingsSchema, type SchoolSettingsInput } from "@/lib/validations/organization";

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

export function SchoolSettingsForm({ defaultValues }: { defaultValues: SchoolSettingsInput }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SchoolSettingsInput>({
    resolver: zodResolver(schoolSettingsSchema),
    defaultValues,
  });

  async function onSubmit(data: SchoolSettingsInput) {
    setIsSubmitting(true);
    const result = await updateSchoolSettings(data);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("School settings saved");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">School name</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" placeholder="e.g. Africa/Mogadishu" {...register("timezone")} />
          {errors.timezone && (
            <p className="text-destructive text-sm">{errors.timezone.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact email</Label>
          <Input id="contactEmail" type="email" {...register("contactEmail")} />
          {errors.contactEmail && (
            <p className="text-destructive text-sm">{errors.contactEmail.message}</p>
          )}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" {...register("address")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Working days</Label>
        <Controller
          control={control}
          name="workingDays"
          render={({ field }) => (
            <div className="flex flex-wrap gap-4">
              {WEEKDAYS.map((day) => {
                const checked = field.value?.includes(day.value) ?? false;
                return (
                  <label key={day.value} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => {
                        const current = field.value ?? [];
                        field.onChange(
                          next === true
                            ? [...current, day.value].sort((a, b) => a - b)
                            : current.filter((d) => d !== day.value),
                        );
                      }}
                    />
                    {day.label}
                  </label>
                );
              })}
            </div>
          )}
        />
        {errors.workingDays && (
          <p className="text-destructive text-sm">{errors.workingDays.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="beforeBreakCutoff">Before Break cutoff</Label>
          <Input id="beforeBreakCutoff" type="time" {...register("beforeBreakCutoff")} />
          {errors.beforeBreakCutoff && (
            <p className="text-destructive text-sm">{errors.beforeBreakCutoff.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="afterBreakCutoff">After Break cutoff</Label>
          <Input id="afterBreakCutoff" type="time" {...register("afterBreakCutoff")} />
          {errors.afterBreakCutoff && (
            <p className="text-destructive text-sm">{errors.afterBreakCutoff.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="attendanceLockGraceHours">Lock grace period (hours)</Label>
          <Input
            id="attendanceLockGraceHours"
            type="number"
            min={0}
            {...register("attendanceLockGraceHours")}
          />
          {errors.attendanceLockGraceHours && (
            <p className="text-destructive text-sm">{errors.attendanceLockGraceHours.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
