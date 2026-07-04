"use client";

import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { SearchResultItem, SearchResults } from "@/app/api/search/route";

const EMPTY_RESULTS: SearchResults = { students: [], teachers: [], guardians: [] };

const GROUPS: { key: keyof SearchResults; title: string; href: string }[] = [
  { key: "students", title: "Students", href: "/dashboard/students" },
  { key: "teachers", title: "Teachers", href: "/dashboard/teachers" },
  { key: "guardians", title: "Parents", href: "/dashboard/parents" },
];

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const searchTerm = debouncedQuery.length >= 2 ? debouncedQuery : "";

  const { data: results = EMPTY_RESULTS, isFetching } = useQuery({
    queryKey: ["global-search", searchTerm],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
      return (await res.json()) as SearchResults;
    },
    enabled: open && searchTerm.length >= 2,
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function goTo(href: string) {
    router.push(href);
    setOpen(false);
    setQuery("");
  }

  const displayResults = searchTerm ? results : EMPTY_RESULTS;
  const hasResults = GROUPS.some((group) => displayResults[group.key].length > 0);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} type="button">
        <SearchIcon />
        Search
        <kbd className="text-muted-foreground ml-2 hidden text-xs sm:inline">⌘K</kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Search students, teachers, parents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-80 space-y-4 overflow-y-auto">
            {isFetching && <p className="text-muted-foreground text-sm">Searching...</p>}
            {!isFetching && searchTerm && !hasResults && (
              <p className="text-muted-foreground text-sm">No results found.</p>
            )}
            {!isFetching &&
              GROUPS.map((group) => {
                const items = displayResults[group.key];
                if (items.length === 0) return null;
                return (
                  <div key={group.key} className="space-y-1">
                    <p className="text-muted-foreground text-xs font-medium uppercase">
                      {group.title}
                    </p>
                    {items.map((item: SearchResultItem) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => goTo(group.href)}
                        className="hover:bg-muted flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm"
                      >
                        <span>{item.label}</span>
                        {item.sublabel && (
                          <span className="text-muted-foreground text-xs">{item.sublabel}</span>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
