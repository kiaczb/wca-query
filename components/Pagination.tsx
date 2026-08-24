"use client";

import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

import Button from "./ui/Button";
import type { QueryResults } from "@/lib/types";

export default function Pagination({
  results,
  onPageChange,
  busy,
}: {
  results: QueryResults;
  onPageChange: (page: number) => void;
  busy: boolean;
}) {
  const { number: page, totalPages } = results;
  if (totalPages <= 1) return null;

  return (
    <nav
      className="flex items-center justify-between gap-4"
      aria-label="Találati oldalak"
    >
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={busy || page <= 0}
        icon={<FaChevronLeft className="h-3 w-3" />}
      >
        Előző
      </Button>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        <span className="tabular font-mono text-foreground">{page + 1}</span>
        {" / "}
        <span className="tabular font-mono text-foreground">{totalPages}</span>
        {" oldal"}
      </p>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={busy || page + 1 >= totalPages}
        iconRight={<FaChevronRight className="h-3 w-3" />}
      >
        Következő
      </Button>
    </nav>
  );
}
