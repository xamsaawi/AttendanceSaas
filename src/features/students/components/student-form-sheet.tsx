"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { PhotoUpload } from "@/components/shared/photo-upload";
import { Button } from "@/components/ui/button";
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
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { createStudent, updateStudent, uploadStudentPhoto } from "@/features/students/actions";
import { studentSchema, type StudentInput } from "@/lib/validations/students";

const NONE_VALUE = "__none__";

const GENDER_LABELS: Record<string, string> = {
  [NONE_VALUE]: "Unspecified",
  male: "Male",
  female: "Female",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  graduated: "Graduated",
  withdrawn: "Withdrawn",
};

export type StudentEditData = {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  class_id: string | null;
  status: StudentInput["status"];
  enrollment_date: string;
  address: string | null;
  notes: string | null;
  photoSignedUrl: string | null;
};

export function StudentFormSheet({
  student,
  classOptions,
}: {
  student?: StudentEditData;
  classOptions: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentInput>({
    resolver: zodResolver(studentSchema),
    defaultValues: student
      ? {
          admissionNumber: student.admission_number,
          firstName: student.first_name,
          lastName: student.last_name,
          dateOfBirth: student.date_of_birth ?? "",
          gender: (student.gender as StudentInput["gender"]) ?? undefined,
          classId: student.class_id ?? undefined,
          status: student.status,
          enrollmentDate: student.enrollment_date,
          address: student.address ?? "",
          notes: student.notes ?? "",
        }
      : {
          admissionNumber: "",
          firstName: "",
          lastName: "",
          dateOfBirth: "",
          status: "active",
          enrollmentDate: new Date().toISOString().slice(0, 10),
          address: "",
          notes: "",
        },
  });

  async function onSubmit(data: StudentInput) {
    setIsSubmitting(true);
    const result = student ? await updateStudent(student.id, data) : await createStudent(data);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(student ? "Student updated" : "Student added");
    if (!student) reset();
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!student && (
        <Button
          onClick={() => setOpen(true)}
          type="button"
        >
          <PlusIcon />
          Add student
        </Button>
      )}
      {student && (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} type="button">
          Edit
        </Button>
      )}
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{student ? "Edit student" : "Add student"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4">
          {student && (
            <PhotoUpload
              currentUrl={student.photoSignedUrl}
              fallbackText={`${student.first_name[0] ?? ""}${student.last_name[0] ?? ""}`}
              action={(formData) => {
                formData.set("studentId", student.id);
                return uploadStudentPhoto(formData);
              }}
            />
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="student-first-name">First name</Label>
                <Input id="student-first-name" {...register("firstName")} />
                {errors.firstName && (
                  <p className="text-destructive text-sm">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-last-name">Last name</Label>
                <Input id="student-last-name" {...register("lastName")} />
                {errors.lastName && (
                  <p className="text-destructive text-sm">{errors.lastName.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-admission">Admission number</Label>
              <Input id="student-admission" {...register("admissionNumber")} />
              {errors.admissionNumber && (
                <p className="text-destructive text-sm">{errors.admissionNumber.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="student-dob">Date of birth</Label>
                <Input id="student-dob" type="date" {...register("dateOfBirth")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-gender">Gender</Label>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? NONE_VALUE}
                      onValueChange={(value) =>
                        field.onChange(value === NONE_VALUE ? undefined : value)
                      }
                    >
                      <SelectTrigger id="student-gender" className="w-full">
                        <SelectValue placeholder="Select">
                          {(value: string) => GENDER_LABELS[value] ?? value}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>Unspecified</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-class">Class</Label>
              <Controller
                control={control}
                name="classId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? NONE_VALUE}
                    onValueChange={(value) =>
                      field.onChange(value === NONE_VALUE ? undefined : value)
                    }
                  >
                    <SelectTrigger id="student-class" className="w-full">
                      <SelectValue placeholder="Unassigned">
                        {(value: string) =>
                          value === NONE_VALUE
                            ? "Unassigned"
                            : (classOptions.find((o) => o.id === value)?.label ?? value)
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
                      {classOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="student-status">Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="student-status" className="w-full">
                        <SelectValue>{(value: string) => STATUS_LABELS[value] ?? value}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="graduated">Graduated</SelectItem>
                        <SelectItem value="withdrawn">Withdrawn</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-enrollment">Enrollment date</Label>
                <Input id="student-enrollment" type="date" {...register("enrollmentDate")} />
                {errors.enrollmentDate && (
                  <p className="text-destructive text-sm">{errors.enrollmentDate.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-address">Address</Label>
              <Textarea id="student-address" {...register("address")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-notes">Notes</Label>
              <Textarea id="student-notes" {...register("notes")} />
            </div>
            <SheetFooter className="px-0">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : student ? "Save changes" : "Add student"}
              </Button>
            </SheetFooter>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
