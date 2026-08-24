

export type SqlValidation =
  | { ok: true; sql: string }
  | { ok: false; reason: string };

const MAX_LENGTH = 8000;

const ALLOWED_LEADING_KEYWORDS = ["select", "with", "show"];

const FORBIDDEN_KEYWORDS = [
  "insert", "update", "delete", "drop", "alter", "create", "truncate",
  "rename", "merge",
  "grant", "revoke", "flush", "reset", "shutdown", "kill", "purge",
  "install", "uninstall", "optimize", "repair", "checksum",
  "call", "exec", "execute", "prepare", "deallocate", "handler",
  "begin", "commit", "rollback", "savepoint", "start", "lock", "unlock",
  "signal", "resignal", "declare", "delimiter",
  "set", "use", "do",
  "load", "load_file", "outfile", "dumpfile", "infile", "into",
  "sleep", "benchmark", "get_lock", "release_lock", "master_pos_wait",
];

const FORBIDDEN_PATTERN = new RegExp(
  `\\b(?:${FORBIDDEN_KEYWORDS.join("|")})\\b`,
  "i",
);

const SYSTEM_DATABASE_PATTERN = /\bmysql\s*\.\s*[a-z_]/i;

type MaskResult = { masked: string } | { error: string };

function hasControlCharacters(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    const isAllowedWhitespace = code === 9 || code === 10 || code === 13;
    if ((code < 32 && !isAllowedWhitespace) || code === 127) return true;
  }
  return false;
}

function mask(sql: string): MaskResult {
  const out: string[] = [];
  let i = 0;

  const blank = (count: number) => out.push(" ".repeat(count));

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if ((ch === "-" && next === "-") || ch === "#") {
      const end = sql.indexOf("\n", i);
      const stop = end === -1 ? sql.length : end;
      blank(stop - i);
      i = stop;
      continue;
    }

    if (ch === "/" && next === "*") {
      if (sql[i + 2] === "!" || sql[i + 2] === "+") {
        return {
          error: "A lekérdezés futtatható MySQL-megjegyzést használ, ez nem engedélyezett.",
        };
      }
      const end = sql.indexOf("*/", i + 2);
      if (end === -1) {
        return { error: "A lekérdezésben lezáratlan megjegyzés van." };
      }
      blank(end + 2 - i);
      i = end + 2;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      out.push(quote);
      i += 1;
      let closed = false;
      while (i < sql.length) {
        const c = sql[i];
        if (c === "\\" && quote !== "`") {
          blank(Math.min(2, sql.length - i));
          i += 2;
          continue;
        }
        if (c === quote) {
          if (sql[i + 1] === quote) {
            blank(2);
            i += 2;
            continue;
          }
          out.push(quote);
          i += 1;
          closed = true;
          break;
        }
        blank(1);
        i += 1;
      }
      if (!closed) {
        return {
          error: "A lekérdezésben lezáratlan szöveg vagy azonosító van.",
        };
      }
      continue;
    }

    out.push(ch);
    i += 1;
  }

  return { masked: out.join("") };
}

function trimTrailingSemicolons(sql: string): string {
  let end = sql.length;
  while (end > 0 && (sql[end - 1] === ";" || /\s/.test(sql[end - 1]))) {
    end -= 1;
  }
  return sql.slice(0, end);
}

export function validateSql(input: string): SqlValidation {
  if (typeof input !== "string") {
    return { ok: false, reason: "Nem készült SQL lekérdezés." };
  }

  const raw = input.trim();

  if (raw.length === 0) {
    return { ok: false, reason: "Nem készült SQL lekérdezés." };
  }
  if (raw.length > MAX_LENGTH) {
    return {
      ok: false,
      reason: `A lekérdezés hosszabb a megengedett ${MAX_LENGTH} karakternél.`,
    };
  }
  if (hasControlCharacters(raw)) {
    return { ok: false, reason: "A lekérdezés vezérlőkaraktereket tartalmaz." };
  }

  const sql = trimTrailingSemicolons(raw);
  if (sql.length === 0) {
    return { ok: false, reason: "Nem készült SQL lekérdezés." };
  }

  const maskResult = mask(sql);
  if ("error" in maskResult) {
    return { ok: false, reason: maskResult.error };
  }
  const masked = maskResult.masked;

  if (masked.includes(";")) {
    return { ok: false, reason: "Egyszerre csak egy utasítás futtatható." };
  }

  const leading = masked.trimStart().match(/^[a-z_]+/i)?.[0].toLowerCase();
  if (!leading || !ALLOWED_LEADING_KEYWORDS.includes(leading)) {
    return { ok: false, reason: "Csak SELECT, WITH és SHOW lekérdezés futtatható." };
  }

  if (leading === "with" && !/\bselect\b/i.test(masked)) {
    return { ok: false, reason: "A WITH kifejezésnek SELECT utasítással kell zárulnia." };
  }

  const forbidden = masked.match(FORBIDDEN_PATTERN);
  if (forbidden) {
    return {
      ok: false,
      reason: `A lekérdezés tiltott kulcsszót használ: "${forbidden[0].toUpperCase()}". Csak olvasó lekérdezés futtatható.`,
    };
  }

  if (SYSTEM_DATABASE_PATTERN.test(masked)) {
    return { ok: false, reason: "A lekérdezés a MySQL belső tábláit olvasná." };
  }

  let depth = 0;
  for (const ch of masked) {
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    if (depth < 0) break;
  }
  if (depth !== 0) {
    return { ok: false, reason: "A lekérdezésben nem záródnak le a zárójelek." };
  }

  return { ok: true, sql };
}
