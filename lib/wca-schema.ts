// Everything here is sent to Groq on every uncached question, so it is written
// to be compact: every character costs tokens against the Groq quota. Keep new
// additions terse, and prefer one sharp rule or example over several similar ones.

export const SQL_DIALECT = "MySQL 8";

export const WCA_SCHEMA = `
persons: wca_id (e.g. '2015KOSK01'; = results.person_id), sub_id (1 = current row; >1 = old name/country rows), name, country_id (= countries.id, e.g. 'Hungary'), gender ('m','f','o','')
results (one row per person+event+round): id, pos (placing in round), person_id, person_name, country_id (represented there), competition_id, event_id, round_type_id, format_id, value1..value5 (attempts), best (single), average (0 if format has none), regional_single_record, regional_average_record ('WR','ER','NAR','AsR','AfR','OcR','SAR','NR', NULL or '')
result_attempts: result_id (= results.id), attempt_number (1-based), value
competitions: id (e.g. 'WC2025'), name, cell_name (short name), city_name, country_id, venue, start_date, end_date, results_posted_at (NULL until published), cancelled_at (NULL unless cancelled), competitor_limit, latitude, longitude (microdegrees)
events: id, name (e.g. '3x3x3 Cube'), rank (display order), format
round_types: id ('1','2','3','d','e','g','h'; 'c' combined final, 'f' final), name, cell_name, rank, final (1 = final)
formats: id ('1','2','3' best of N, 'a' average of 5, 'm' mean of 3), name, sort_by, expected_solve_count, trim_fastest_n, trim_slowest_n
ranks_single, ranks_average (current PB per person+event): person_id, event_id, best, world_rank, continent_rank, country_rank
countries: id (the English name, e.g. 'Hungary'), name, continent_id (e.g. '_Europe'), iso2
continents: id ('_Africa','_Asia','_Europe','_North America','_Oceania','_South America'), name, record_name ('AfR','AsR','ER','NAR','OcR','SAR')
championships: competition_id, championship_type ('world', a continent id or a country iso2)
scrambles: competition_id, event_id, round_type_id, group_id, is_extra, scramble_num, scramble
concise_single_results (every single, date pre-split, no join needed): best, person_id, event_id, country_id, continent_id, year, month, day
concise_average_results (same, for averages): average, person_id, event_id, country_id, continent_id, year, month, day
`.trim();

export const EVENT_IDS = `
333, 222, 444, 555, 666, 777, 333bf, 333fm, 333oh, clock, minx, pyram, skewb, sq1, 444bf, 555bf, 333mbf
`.trim();

export const HUNGARIAN_GLOSSARY = `
hármas -> 333; vak/vakon/BLD -> 333bf; 4x4 vak -> 444bf; 5x5 vak -> 555bf; multivak/többkockás vak/MBLD -> 333mbf; egykezes/OH -> 333oh; legkevesebb lépés/FMC -> 333fm; óra -> clock; piramis -> pyram; négyzet-1 -> sq1
szimpla/egyéni/single -> best; átlag/mean -> average; megoldás/próbálkozás -> value1..value5; PB/egyéni csúcs/ranglista -> ranks_single / ranks_average
sub-10 -> best < 1000; helyezés -> pos; dobogó -> pos <= 3; döntő -> round_types.final = 1
világrekord/VR/WR -> 'WR'; Európa-rekord -> 'ER'; országos/nemzeti rekord/OR -> 'NR'
verseny -> competitions; versenyző/kockázó -> persons; magyar/hazai -> country_id = 'Hungary'
idén -> YEAR(CURDATE()); tavaly -> YEAR(CURDATE()) - 1
`.trim();

export const RESULT_CONVENTIONS = `
- Times are hundredths of a second (474 = 4.74 s). -1 DNF, -2 DNS, 0 missing: ALWAYS filter "> 0" before ranking or averaging.
- 333fm: single = moves, average = mean x 100. 333mbf: packed DDTTTTTMM, never do arithmetic on it.
- Format values with wca_statistics_time_format(value, event_id, 'single'|'average').
- Filter persons with sub_id = 1 unless the question is about name/country changes.
- competitions includes upcoming and cancelled ones: use results_posted_at IS NOT NULL AND cancelled_at IS NULL when counting.
`.trim();

export const API_CONSTRAINTS = `
- The API runs SELECT * FROM (<query>) alias LIMIT n OFFSET m, so every output column needs a unique alias, no SELECT * across joins, no semicolon, one statement.
- Paging is automatic: add LIMIT only for "top N" questions, always with ORDER BY.
- 120 s timeout, and the API runs the query twice (once more for count(*)), so avoid full scans:
  * first/last year or "competed in year Y": use concise_*_results.year (MIN/MAX GROUP BY person_id, or EXISTS ... WHERE year = Y), not results JOIN competitions with YEAR(start_date).
  * Join competitions only for columns only it has (name, city, exact date, cancellation).
  * Filter on person_id, event_id, competition_id, year before aggregating.
`.trim();

export const EXAMPLES = `
Q: A 10 leggyorsabb 3x3 szimpla 2025-ben
SELECT p.name AS nev, r.person_id AS wca_id,
  wca_statistics_time_format(r.best, r.event_id, 'single') AS szimpla,
  c.name AS verseny, c.start_date AS datum
FROM results r
JOIN competitions c ON c.id = r.competition_id
JOIN persons p ON p.wca_id = r.person_id AND p.sub_id = 1
WHERE r.event_id = '333' AND r.best > 0 AND YEAR(c.start_date) = 2025
ORDER BY r.best LIMIT 10

Q: List the current Hungarian 3x3 top 10 by average.
SELECT ra.country_rank AS country_rank, p.name AS person_name, ra.person_id AS wca_id,
  wca_statistics_time_format(ra.best, ra.event_id, 'average') AS average
FROM ranks_average ra
JOIN persons p ON p.wca_id = ra.person_id AND p.sub_id = 1
WHERE ra.event_id = '333' AND p.country_id = 'Hungary'
ORDER BY ra.country_rank LIMIT 10

Q: Ki állította be a legtöbb egykezes világrekordot?
SELECT p.name AS nev, r.person_id AS wca_id, COUNT(*) AS vilagrekordok
FROM results r
JOIN persons p ON p.wca_id = r.person_id AND p.sub_id = 1
WHERE r.event_id = '333oh' AND r.regional_single_record = 'WR'
GROUP BY r.person_id, p.name
ORDER BY vilagrekordok DESC LIMIT 25

Q: Akik 2006-ban vagy 2016-ban versenyeztek először és idén is versenyeztek
SELECT p.name AS nev, p.wca_id AS wca_id, fy.elso_ev AS elso_ev
FROM persons p
JOIN (SELECT person_id, MIN(year) AS elso_ev FROM concise_single_results GROUP BY person_id) fy
  ON fy.person_id = p.wca_id
WHERE p.sub_id = 1 AND fy.elso_ev IN (2006, 2016)
  AND EXISTS (SELECT 1 FROM concise_single_results csr
              WHERE csr.person_id = p.wca_id AND csr.year = YEAR(CURDATE()))
ORDER BY p.name
`.trim();

export function buildSystemPrompt(): string {
  return `You write one read-only ${SQL_DIALECT} SELECT (optionally WITH) for the WCA Statistics database.

Rules:
- Use only the tables, columns, event ids and functions below; never invent any. No INSERT/UPDATE/DELETE/DDL/CALL, no semicolons.
- If the schema cannot answer the question, set ok=false and say what is missing. Do not guess.
- Give every output column a readable unique alias; format result values and show names next to WCA IDs.
- Questions are usually Hungarian. Write "explanation" and "error" in the question's language, and use ASCII-safe aliases in that language.
- "explanation": one or two plain sentences for a competitor, no SQL jargon.

SCHEMA
${WCA_SCHEMA}

EVENT IDS: ${EVENT_IDS}

HUNGARIAN TERMS
${HUNGARIAN_GLOSSARY}

VALUES
${RESULT_CONVENTIONS}

API
${API_CONSTRAINTS}

EXAMPLES
${EXAMPLES}`;
}
