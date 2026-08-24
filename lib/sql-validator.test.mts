

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateSql } from "./sql-validator.ts";

const ACCEPTED = [
  "SELECT * FROM persons p LIMIT 5",
  "select p.name, r.best from results r join persons p on p.wca_id = r.person_id and p.sub_id = 1 where r.event_id = '333' and r.best > 0 order by r.best limit 10",
  "SELECT c.created_at, c.updated_at, c.start_date, c.end_date FROM competitions c",
  "WITH fast AS (SELECT person_id, best FROM results WHERE best > 0) SELECT * FROM fast",
  "SELECT wca_statistics_time_format(r.best, r.event_id, 'single') AS single FROM results r",
  "SELECT name FROM persons -- a trailing comment\n",
  "SELECT p.name FROM persons p /* block comment */ WHERE p.sub_id = 1",
  "SELECT 'DROP TABLE persons' AS harmless",
  'SELECT "DELETE FROM results" AS harmless',
  "SELECT `select` FROM persons",
  "SELECT name FROM persons WHERE name LIKE 'O''Brien%'",
  "SELECT COUNT(*) FROM results;",
  "SHOW TABLES",
];

const REJECTED: [label: string, sql: string][] = [
  ["empty", ""],
  ["whitespace only", "   "],
  ["drop", "DROP TABLE persons"],
  ["insert", "INSERT INTO persons VALUES (1)"],
  ["update", "UPDATE results SET best = 0"],
  ["delete", "DELETE FROM results"],
  ["alter", "ALTER TABLE results ADD COLUMN x INT"],
  ["create", "CREATE TABLE t (id INT)"],
  ["truncate", "TRUNCATE results"],
  ["grant", "GRANT ALL ON *.* TO 'x'"],
  ["revoke", "REVOKE ALL ON *.* FROM 'x'"],
  ["merge", "MERGE INTO a USING b ON (1=1)"],
  ["call", "CALL some_procedure()"],
  ["exec", "EXEC xp_cmdshell"],
  ["stacked statements", "SELECT 1; DROP TABLE persons"],
  ["stacked without spaces", "SELECT 1;DROP TABLE persons;"],
  ["separator behind a comment", "SELECT 1 -- ok\n; DROP TABLE persons"],
  ["separator hidden by a trailing comment", "SELECT 1 FROM persons; -- ; DROP TABLE persons"],
  ["file write", "SELECT * INTO OUTFILE '/tmp/x' FROM persons"],
  ["file read", "SELECT load_file('/etc/passwd')"],
  ["sleep", "SELECT SLEEP(120)"],
  ["benchmark", "SELECT BENCHMARK(100000000, MD5('x'))"],
  ["system catalogue", "SELECT * FROM mysql.user"],
  ["session variable", "SET @x = 1"],
  ["unterminated string", "SELECT 'unterminated"],
  ["unterminated comment", "SELECT /* unterminated FROM persons"],
  ["unbalanced open paren", "SELECT (1 FROM persons"],
  ["unbalanced close paren", "SELECT 1) FROM persons"],
  ["unsupported statement", "EXPLAIN SELECT * FROM persons"],
  ["mysql executable comment", "SELECT /*! DROP */ 1"],
  ["optimizer hint comment", "SELECT /*+ BKA(t) */ 1"],
  ["cte in front of a write", "WITH x AS (SELECT 1) DELETE FROM results"],
];

describe("validateSql", () => {
  for (const sql of ACCEPTED) {
    it(`accepts ${JSON.stringify(sql.slice(0, 60))}`, () => {
      const result = validateSql(sql);
      assert.equal(result.ok, true, result.ok ? "" : result.reason);
    });
  }

  for (const [label, sql] of REJECTED) {
    it(`rejects ${label}`, () => {
      assert.equal(validateSql(sql).ok, false);
    });
  }

  it("strips a trailing semicolon from the forwarded query", () => {
    const result = validateSql("SELECT 1 ;  ");
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.sql, "SELECT 1");
  });
});
