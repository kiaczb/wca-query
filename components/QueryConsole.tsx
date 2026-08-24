"use client";

import { useCallback, useRef, useState } from "react";
import { FaSpinner } from "react-icons/fa";

import type { QueryFailure, QuerySuccess } from "@/lib/types";
import ErrorNotice from "./ErrorNotice";
import Pagination from "./Pagination";
import QueryDisplay from "./QueryDisplay";
import QueryInput from "./QueryInput";
import ResultsTable from "./ResultsTable";
import SectionLabel from "./ui/SectionLabel";
import StateMessage from "./ui/StateMessage";

type Body = { prompt: string } | { queryId: string; page: number };

export default function QueryConsole({
  signedIn,
  initialError,
}: {
  signedIn: boolean;
  initialError?: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<QuerySuccess | null>(null);
  const [failure, setFailure] = useState<QueryFailure | null>(
    initialError ? { stage: "auth", error: initialError } : null,
  );
  const [running, setRunning] = useState(false);
  const [paging, setPaging] = useState(false);

  const runId = useRef(0);

  const send = useCallback(async (body: Body, isNewQuery: boolean) => {
    const id = ++runId.current;

    if (isNewQuery) {
      setRunning(true);
      setResult(null);
    } else {
      setPaging(true);
    }
    setFailure(null);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as QuerySuccess | QueryFailure;
      if (id !== runId.current) return;

      if (!response.ok) {
        setFailure(payload as QueryFailure);
        return;
      }
      setResult(payload as QuerySuccess);
    } catch {
      if (id !== runId.current) return;
      setFailure({
        stage: "wca",
        error:
          "A kérés nem jutott el a szerverig. Ellenőrizd az internetkapcsolatot.",
      });
    } finally {
      if (id === runId.current) {
        if (isNewQuery) setRunning(false);
        else setPaging(false);
      }
    }
  }, []);

  const runQuery = useCallback(() => {
    const question = prompt.trim();
    if (question.length === 0) return;
    void send({ prompt: question }, true);
  }, [prompt, send]);

  const goToPage = useCallback(
    (page: number) => {
      if (!result) return;
      void send({ queryId: result.queryId, page }, false);
    },
    [result, send],
  );

  return (
    <div className="flex flex-col gap-10">
      <QueryInput
        value={prompt}
        onChange={setPrompt}
        onSubmit={runQuery}
        running={running}
        disabled={!signedIn}
      />

      {running ? (
        <div aria-live="polite">
          <StateMessage
            icon={<FaSpinner className="h-5 w-5 animate-spin" />}
            title="Lekérdezés készítése és futtatása"
            description="A kérdésből SQL lesz, azt ellenőrizzük, majd lefuttatjuk a WCA Statisztika API-n. Nagy lekérdezésnél ez eltarthat egy ideig."
          />
        </div>
      ) : null}

      {failure ? <ErrorNotice failure={failure} /> : null}

      {failure?.query && !result ? <QueryDisplay query={failure.query} /> : null}

      {result ? (
        <>
          <QueryDisplay query={result.query} explanation={result.explanation} />

          <section aria-labelledby="results-heading">
            <SectionLabel
              id="results-heading"
              trailing={
                paging ? (
                  <span className="flex items-center gap-2 text-xs text-subtle-foreground">
                    <FaSpinner className="h-3 w-3 animate-spin" />
                    Betöltés
                  </span>
                ) : (
                  <p className="tabular font-mono text-xs text-subtle-foreground">
                    {result.results.totalElements.toLocaleString("hu-HU")} sor
                  </p>
                )
              }
            >
              Eredmény
            </SectionLabel>

            <div
              className={
                paging
                  ? "opacity-50 transition-opacity duration-200 ease-smooth"
                  : undefined
              }
              aria-busy={paging}
            >
              <ResultsTable results={result.results} />
            </div>

            <div className="mt-5">
              <Pagination
                results={result.results}
                onPageChange={goToPage}
                busy={paging}
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
