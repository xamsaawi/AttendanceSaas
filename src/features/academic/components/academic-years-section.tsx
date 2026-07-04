"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createAcademicYear, deleteAcademicYear } from "@/features/academic/actions";
import { academicYearSchema, type AcademicYearInput } from "@/lib/validations/academic";

export type AcademicYearRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
};

export function AcademicYearsSection({ years }: { years: AcademicYearRow[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<AcademicYearInput>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: { isCurrent: false },
  });

  async function onSubmit(data: AcademicYearInput) {
    setIsSubmitting(true);
    const result = await createAcademicYear(data);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Academic year added");
    reset({ name: "", startDate: "", endDate: "", isCurrent: false });
  }

  async function onDelete(id: string) {
    const result = await deleteAcademicYear(id);
    if (!result.success) toast.error(result.error);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic years</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {years.map((year) => (
              <TableRow key={year.id}>
                <TableCell className="flex items-center gap-2">
                  {year.name}
                  {year.is_current && <Badge>Current</Badge>}
                </TableCell>
                <TableCell>{year.start_date}</TableCell>
                <TableCell>{year.end_date}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => onDelete(year.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-wrap items-end gap-3 border-t pt-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="year-name">Name</Label>
            <Input id="year-name" placeholder="2025/2026" {...register("name")} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="year-start">Start date</Label>
            <Input id="year-start" type="date" {...register("startDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year-end">End date</Label>
            <Input id="year-end" type="date" {...register("endDate")} />
            {errors.endDate && (
              <p className="text-destructive text-sm">{errors.endDate.message}</p>
            )}
          </div>
          <div className="flex items-center gap-2 pb-1.5">
            <Controller
              control={control}
              name="isCurrent"
              render={({ field }) => (
                <Switch
                  id="year-current"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="year-current">Current year</Label>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add year"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
