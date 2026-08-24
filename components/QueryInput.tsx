"use client";

import { FaPlay, FaSpinner } from "react-icons/fa";

import Button from "./ui/Button";

const EXAMPLES = [
  "A 10 leggyorsabb 3x3 szimpla 2025-ben",
  "Kinek volt a legtöbb sub-10 3x3 szimplája 2025-ben?",
  "Melyik országban volt a legtöbb verseny?",
  "A magyar 3x3 átlag ranglista első 10 helyezettje",
];

export default function QueryInput({
  value,
  onChange,
  onSubmit,
  running,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  running: boolean;
  disabled: boolean;
}) {
  return (
    <section aria-labelledby="ask-heading">
      <h2 id="ask-heading" className="sr-only">
        Kérdés megadása
      </h2>

      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card transition-[border-color,box-shadow] duration-200 ease-smooth focus-within:border-line-strong focus-within:shadow-card-hover">
        <label htmlFor="prompt" className="sr-only">
          A kérdésed
        </label>
        <textarea
          id="prompt"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              onSubmit();
            }
          }}
          rows={3}
          maxLength={500}
          disabled={disabled}
          placeholder="Ki állította be a legtöbb 3x3 világrekordot?"
          className="block w-full resize-y bg-transparent px-4 py-4 text-base leading-relaxed text-foreground placeholder:text-subtle-foreground focus:outline-none disabled:opacity-60 sm:text-lg"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-muted px-4 py-3">
          <p className="text-xs text-muted-foreground">
            <kbd className="font-mono">Ctrl</kbd> +{" "}
            <kbd className="font-mono">Enter</kbd> a futtatáshoz
          </p>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={disabled || running || value.trim().length === 0}
            icon={
              running ? (
                <FaSpinner className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FaPlay className="h-3 w-3" />
              )
            }
          >
            {running ? "Fut…" : "Lekérdezés"}
          </Button>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <li key={example}>
            <button
              type="button"
              onClick={() => onChange(example)}
              disabled={disabled || running}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-200 ease-smooth hover:border-line-strong hover:bg-surface-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              {example}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
