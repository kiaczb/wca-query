import { FaLock } from "react-icons/fa";

import QueryConsole from "@/components/QueryConsole";
import SiteHeader from "@/components/SiteHeader";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import StateMessage from "@/components/ui/StateMessage";
import { readSession, toPublicSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: PageProps<"/">) {
  const session = await readSession();
  const user = session ? toPublicSession(session) : null;
  const authError = (await searchParams).auth_error;

  return (
    <>
      <SiteHeader user={user} />

      <main id="main" className="flex-1 px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="mx-auto w-full max-w-5xl">
          <PageHeader
            title="WCA Statisztika AI"
            description="Írd le mit szeretnél tudni a hivatalos WCA versenyeredményekről. A kérdésből SQL lesz, azt ellenőrizzük, lefuttatjuk a WCA Statisztika API-n, és táblázatban kapod vissza — ugyanabból az adatbázisból, amit a WCA is használ."
          />

          <div className="mt-10 flex flex-col gap-10">
            {user ? null : (
              <StateMessage
                icon={<FaLock className="h-5 w-5" />}
                title="A lekérdezéshez be kell jelentkezni"
                description="A WCA Statisztika API csak bejelentkezett WCA-fiók nevében futtat lekérdezést. A belépéssel a nyilvános profilodon túl semmit nem osztasz meg, a token pedig a szerveren marad."
              >
                <Button href="/api/auth/login">
                  Bejelentkezés WCA-fiókkal
                </Button>
              </StateMessage>
            )}

            <QueryConsole
              signedIn={Boolean(user)}
              initialError={typeof authError === "string" ? authError : undefined}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-line bg-surface-inverse text-white">
        <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:px-12">
          <h2 className="text-lg font-bold tracking-tight">
            WCA Statisztika AI
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
            Az adatok a World Cube Association tulajdonában állnak, forrásuk a{" "}
            <a
              href="https://www.worldcubeassociation.org/results"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition-colors duration-200 ease-smooth hover:text-white"
            >
              worldcubeassociation.org/results
            </a>
            . Ez egy nem hivatalos eszköz, nem áll kapcsolatban a WCA-val.
          </p>
        </div>
      </footer>
    </>
  );
}
