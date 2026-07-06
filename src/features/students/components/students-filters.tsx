"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_VALUE = "__all__";

const STATUS_LABELS: Record<string, string> = {
  [ALL_VALUE]: "All statuses",
  active: "Active",
  inactive: "Inactive",
  graduated: "Graduated",
  withdrawn: "Withdrawn",
};

export function StudentsFilters({
  search,
  status,
}: {
  search: string;
  status: string;
}) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(search);

  function pushParams(next: { search?: string; status?: string }) {
    const params = new URLSearchParams();
    const nextSearch = next.search ?? search;
    const nextStatus = next.status ?? status;
    if (nextSearch) params.set("search", nextSearch);
    if (nextStatus) params.set("status", nextStatus);
    router.push(`/dashboard/students?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search by name or admission number"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") pushParams({ search: searchValue });
        }}
        onBlur={() => pushParams({ search: searchValue })}
        className="max-w-xs"
      />
      <Select
        value={status || ALL_VALUE}
        onValueChange={(value) => pushParams({ status: !value || value === ALL_VALUE ? "" : value })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All statuses">{(value: string) => STATUS_LABELS[value] ?? value}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="graduated">Graduated</SelectItem>
          <SelectItem value="withdrawn">Withdrawn</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
