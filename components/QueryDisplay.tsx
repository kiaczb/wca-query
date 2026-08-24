"use client";

import { Fragment, useState } from "react";
import { FaCheck, FaRegCopy } from "react-icons/fa";

import Button from "./ui/Button";
import SectionLabel from "./ui/SectionLabel";

const KEYWORDS = new Set(
  `select from where group by having order limit offset join inner left right
   full outer cross on as and or not in is null like between union all distinct
   case when then else end asc desc with count sum avg min max round year month
   day date if ifnull coalesce concat cast over partition row_number rank
   dense_rank exists any some using`
    .split(/\s+/)
    .filter(Boolean),
);

type Token = {
  text: string;
  kind: "keyword" | "string" | "number" | "comment" | "plain";
};

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  const pattern =
    /(--[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\]|\\.|'')*'|"(?:[^"\\]|\\.)*"|`[^`]*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z_0-9]*)/g;

  let cursor = 0;
  for (const match of sql.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      tokens.push({ text: sql.slice(cursor, index), kind: "plain" });
    }
    const [text, comment, string, number, word] = match;
    if (comment) tokens.push({ text, kind: "comment" });
    else if (string) tokens.push({ text, kind: "string" });
    else if (number) tokens.push({ text, kind: "number" });
    else if (word) {
      tokens.push({
        text,
        kind: KEYWORDS.has(word.toLowerCase()) ? "keyword" : "plain",
      });
    }
    cursor = index + text.length;
  }
  if (cursor < sql.length) {
    tokens.push({ text: sql.slice(cursor), kind: "plain" });
  }
  return tokens;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      icon={
        copied ? (
          <FaCheck className="h-3 w-3 text-brand-green" />
        ) : (
          <FaRegCopy className="h-3 w-3" />
        )
      }
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Másolva" : "Másolás"}
    </Button>
  );
}

export default function QueryDisplay({
  query,
  explanation,
}: {
  query: string;
  explanation?: string;
}) {
  return (
    <section aria-labelledby="sql-heading">
      <SectionLabel id="sql-heading" trailing={<CopyButton value={query} />}>
        Generált SQL
      </SectionLabel>

      <pre className="overflow-x-auto rounded-card border border-line bg-surface p-4 text-[0.8125rem] leading-relaxed shadow-card">
        <code className="font-mono">
          {tokenize(query).map((token, index) => (
            <Fragment key={index}>
              {token.kind === "plain" ? (
                token.text
              ) : (
                <span className={`tok-${token.kind}`}>{token.text}</span>
              )}
            </Fragment>
          ))}
        </code>
      </pre>

      {explanation ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {explanation}
        </p>
      ) : null}
    </section>
  );
}
