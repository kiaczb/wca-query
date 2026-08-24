"use client";

import Button from "./ui/Button";
import type { QueryFailure, QueryStage } from "@/lib/types";

const HEADINGS: Record<QueryStage, string> = {
  auth: "Bejelentkezés szükséges",
  rate_limit: "Túl sok lekérdezés",
  input: "Nézd át a kérdést",
  groq: "Nem készült lekérdezés",
  validation: "A lekérdezést elutasítottuk",
  wca: "A WCA API elutasította a lekérdezést",
};

const HINTS: Partial<Record<QueryStage, string>> = {
  groq: "Add meg a versenyszámot, a mutatót és az időszakot, aztán próbáld újra.",
  validation:
    "A WCA API felé csak egyetlen, csak olvasó SELECT, WITH vagy SHOW utasítás mehet ki.",
  wca: "A kérdés átfogalmazása általában olyan lekérdezést eredményez, amit az adatbázis elfogad.",
};

export default function ErrorNotice({ failure }: { failure: QueryFailure }) {
  const hint = HINTS[failure.stage];

  return (
    <div
      role="alert"
      className="rounded-card border border-brand-red/20 bg-brand-red/5 px-4 py-3.5"
    >
      <p className="text-sm font-semibold text-brand-red-strong">
        {HEADINGS[failure.stage]}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-foreground">
        {failure.error}
      </p>
      {hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}

      {failure.stage === "auth" ? (
        <div className="mt-4">
          <Button href="/api/auth/login" size="sm">
            Bejelentkezés WCA-fiókkal
          </Button>
        </div>
      ) : null}
    </div>
  );
}
