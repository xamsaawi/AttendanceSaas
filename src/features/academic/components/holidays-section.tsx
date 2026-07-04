"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createHoliday, deleteHoliday } from "@/features/academic/actions";
import { holidaySchema, type HolidayInput } from "@/lib/validations/academic";

const NO_YEAR = "none";

export type HolidayRow = {
  id: string;
  academic_year_id: string | null;
  name: string;
  start_date: string;
  end_date: string;
};

export function HolidaysSection({
  holidays,
  academicYears,
}: {
  holidays: HolidayRow[];
  academicYears: { id: string; name: string }[];
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<HolidayInput>({ resolver: zodResolver(holidaySchema) });

  async function onSubmit(data: HolidayInput) {
    setIsSubmitting(true);
    const result = await createHoliday(data);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Holiday added");
    reset({ academicYearId: undefined, name: "", startDate: "", endDate: "" });
  }

  async function onDelete(id: string) {
    const result = await deleteHoliday(id);
    if (!result.success) toast.error(result.error);
  }

  const yearNameById = new Map(academicYears.map((y) => [y.id, y.name]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Holidays</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Academic year</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.map((holiday) => (
              <TableRow key={holiday.id}>
                <TableCell>{holiday.name}</TableCell>
                <TableCell>
                  {holiday.academic_year_id
                    ? (yearNameById.get(holiday.academic_year_id) ?? "—")
                    : "—"}
                </TableCell>
                <TableCell>{holiday.start_date}</TableCell>
                <TableCell>{holiday.end_date}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => onDelete(holiday.id)}>
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
            <Label htmlFor="holiday-year">Academic year</Label>
            <Controller
              control={control}
              name="academicYearId"
              render={({ field }) => (
                <Select
                  value={field.value ?? NO_YEAR}
                  onValueChange={(value) =>
                    field.onChange(value === NO_YEAR ? undefined : value)
                  }
                >
                  <SelectTrigger id="holiday-year">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_YEAR}>None</SelectItem>
                    {academicYears.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="holiday-name">Name</Label>
            <Input id="holiday-name" placeholder="Winter Break" {...register("name")} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="holiday-start">Start date</Label>
            <Input id="holiday-start" type="date" {...register("startDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="holiday-end">End date</Label>
            <Input id="holiday-end" type="date" {...register("endDate")} />
            {errors.endDate && (
              <p className="text-destructive text-sm">{errors.endDate.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add holiday"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
