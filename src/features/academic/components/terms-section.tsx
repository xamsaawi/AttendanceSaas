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
import { createTerm, deleteTerm } from "@/features/academic/actions";
import { termSchema, type TermInput } from "@/lib/validations/academic";

export type TermRow = {
  id: string;
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
};

export function TermsSection({
  terms,
  academicYears,
}: {
  terms: TermRow[];
  academicYears: { id: string; name: string }[];
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<TermInput>({ resolver: zodResolver(termSchema) });

  async function onSubmit(data: TermInput) {
    setIsSubmitting(true);
    const result = await createTerm(data);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Term added");
    reset({ academicYearId: data.academicYearId, name: "", startDate: "", endDate: "" });
  }

  async function onDelete(id: string) {
    const result = await deleteTerm(id);
    if (!result.success) toast.error(result.error);
  }

  const yearNameById = new Map(academicYears.map((y) => [y.id, y.name]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Terms</CardTitle>
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
            {terms.map((term) => (
              <TableRow key={term.id}>
                <TableCell>{term.name}</TableCell>
                <TableCell>{yearNameById.get(term.academic_year_id) ?? "—"}</TableCell>
                <TableCell>{term.start_date}</TableCell>
                <TableCell>{term.end_date}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => onDelete(term.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {academicYears.length === 0 ? (
          <p className="text-muted-foreground border-t pt-4 text-sm">
            Add an academic year before adding terms.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-wrap items-end gap-3 border-t pt-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="term-year">Academic year</Label>
              <Controller
                control={control}
                name="academicYearId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="term-year">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
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
              <Label htmlFor="term-name">Name</Label>
              <Input id="term-name" placeholder="Term 1" {...register("name")} />
              {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="term-start">Start date</Label>
              <Input id="term-start" type="date" {...register("startDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="term-end">End date</Label>
              <Input id="term-end" type="date" {...register("endDate")} />
              {errors.endDate && (
                <p className="text-destructive text-sm">{errors.endDate.message}</p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add term"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
