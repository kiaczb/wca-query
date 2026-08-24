"use client";

import { FaTable } from "react-icons/fa";

import StateMessage from "./ui/StateMessage";
import type { QueryResults } from "@/lib/types";

const NUMERIC = /^-?[\d.,:]+$/;

const HEAD_CELL =
  "sticky top-0 z-20 whitespace-nowrap border-b border-line bg-surface-muted px-3 py-2.5 " +
  "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

const BODY_CELL = "border-b border-line px-3 py-2 align-top";
const ROW_HOVER =
  "transition-colors duration-200 ease-smooth group-hover:bg-surface-muted";

function headerLabel(header: string): string {
  return header.replace(/_/g, " ");
}

function numericColumns(headers: string[], content: string[][]): boolean[] {
  return headers.map((_, columnIndex) => {
    let seen = 0;
    for (const row of content) {
      const value = row[columnIndex] ?? "";
      if (value === "") continue;
      if (!NUMERIC.test(value)) return false;
      seen += 1;
    }
    return seen > 0;
  });
}

export default function ResultsTable({ results }: { results: QueryResults }) {
  const { headers, content } = results;

  if (headers.length === 0 || content.length === 0) {
    return (
      <StateMessage
        icon={<FaTable className="h-5 w-5" />}
        title="Nincs találat"
        description="A lekérdezés lefutott, de nem talált ilyen sort. Próbáld tágabbra venni a versenyszámot, az időszakot vagy az országot."
      />
    );
  }

  const rightAligned = numericColumns(headers, content);

  return (
    <div className="max-h-[75vh] overflow-auto rounded-card border border-line bg-surface shadow-card">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={`${header}-${index}`}
                scope="col"
                className={`${HEAD_CELL} ${
                  rightAligned[index] ? "text-right" : "text-left"
                }`}
              >
                {headerLabel(header)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {content.map((row, rowIndex) => (
            <tr key={rowIndex} className="group">
              {headers.map((header, columnIndex) => {
                const value = row[columnIndex] ?? "";
                return (
                  <td
                    key={`${header}-${columnIndex}`}
                    className={`${BODY_CELL} ${ROW_HOVER} max-w-[26rem] truncate ${
                      rightAligned[columnIndex]
                        ? "tabular text-right font-mono"
                        : ""
                    } ${
                      value === ""
                        ? "text-subtle-foreground"
                        : "text-foreground"
                    }`}
                    title={value}
                  >
                    {value === "" ? "—" : value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
