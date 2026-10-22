// Copy every row from one Postgres database into another, e.g. to move to a new Prisma Postgres account:
//   OLD_DATABASE_URL=... NEW_DATABASE_URL=... bun scripts/copy-db.ts          # dry run: row counts on both sides
//   OLD_DATABASE_URL=... NEW_DATABASE_URL=... bun scripts/copy-db.ts --yes    # copy, then verify
// Use the direct URLs (db.prisma.io:5432), not the pooled ones. The new database must already have the schema at the
// same migration (DATABASE_URL=<new> bun run db:deploy). --yes EMPTIES every table in the new database first, then
// copies parents before children in one transaction (a failure changes nothing), resets autoincrement sequences, and
// checks that row counts and contents match. Afterwards point DATABASE_URL (here and on Render) at the new database.
import { SQL } from "bun";

const { OLD_DATABASE_URL, NEW_DATABASE_URL } = process.env;
if (!OLD_DATABASE_URL || !NEW_DATABASE_URL) throw new Error("Set OLD_DATABASE_URL and NEW_DATABASE_URL");
if (OLD_DATABASE_URL === NEW_DATABASE_URL) throw new Error("OLD and NEW are the same database");
const old = new SQL(OLD_DATABASE_URL);
const neu = new SQL(NEW_DATABASE_URL);
const run = process.argv.includes("--yes");

const tables = async (db: SQL): Promise<string[]> =>
  (
    await db`select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE' and table_name <> '_prisma_migrations' order by 1`
  ).map((r: { table_name: string }) => r.table_name);
const count = async (db: SQL, t: string) => Number((await db.unsafe(`select count(*)::int as n from "${t}"`))[0].n);
const hash = async (db: SQL, t: string) =>
  (await db.unsafe(`select md5(coalesce(string_agg(x::text, chr(10) order by x::text), '')) as h from "${t}" x`))[0].h as string;
const migrations = async (db: SQL) =>
  (await db`select migration_name from _prisma_migrations where finished_at is not null order by 1`)
    .map((r: { migration_name: string }) => r.migration_name)
    .join(",");

try {
  const list = await tables(old);
  const target = await tables(neu);
  const missing = list.filter((t) => !target.includes(t));
  if (missing.length) throw new Error(`The new database lacks ${missing.join(", ")}: run db:deploy against it first`);
  if ((await migrations(old)) !== (await migrations(neu))) throw new Error("The databases are at different migrations");

  if (!run) {
    for (const t of list) console.log(t.padEnd(24), "old", await count(old, t), " new", await count(neu, t));
    console.log("\nDry run. Rerun with --yes to empty the new database and copy everything into it.");
  } else {
    // Parents before children, from the foreign keys.
    const fks = (await old`
      select c.relname as child, p.relname as parent from pg_constraint k
      join pg_class c on c.oid = k.conrelid join pg_class p on p.oid = k.confrelid
      join pg_namespace s on s.oid = c.relnamespace
      where k.contype = 'f' and s.nspname = 'public' and c.relname <> p.relname`) as { child: string; parent: string }[];
    const order: string[] = [];
    const left = new Set(list);
    while (left.size) {
      const ready = [...left].filter((t) => !fks.some((f) => f.child === t && left.has(f.parent)));
      if (!ready.length) throw new Error(`Foreign key cycle among ${[...left].join(", ")}`);
      for (const t of ready) {
        order.push(t);
        left.delete(t);
      }
    }

    await neu.begin(async (tx) => {
      await tx.unsafe(`truncate ${order.map((t) => `"${t}"`).join(", ")} cascade`);
      for (const t of order) {
        // Each table travels as one JSON array. Bun binds a string as a JSON string scalar, so unwrap it with #>>.
        const rows = (await old.unsafe(`select coalesce(json_agg(x), '[]'::json)::text as j from "${t}" x`))[0].j as string;
        const n = (JSON.parse(rows) as unknown[]).length;
        if (n) await tx.unsafe(`insert into "${t}" select * from json_populate_recordset(null::"${t}", ($1::jsonb #>> array[]::text[])::json)`, [rows]);
        console.log(t.padEnd(24), n);
      }
      // Autoincrement ids carry on after the copied rows.
      const seqs = (await tx`
        select c.relname as t, a.attname as col, pg_get_serial_sequence(format('%I', c.relname), a.attname) as seq
        from pg_class c join pg_attribute a on a.attrelid = c.oid join pg_namespace s on s.oid = c.relnamespace
        where s.nspname = 'public' and c.relkind = 'r' and a.attnum > 0
          and pg_get_serial_sequence(format('%I', c.relname), a.attname) is not null`) as { t: string; col: string; seq: string }[];
      for (const { t, col, seq } of seqs) await tx.unsafe(`select setval('${seq}', coalesce((select max("${col}") from "${t}"), 0) + 1, false)`);
      console.log(`sequences reset: ${seqs.length}`);
    });

    const bad: string[] = [];
    for (const t of list) if ((await count(old, t)) !== (await count(neu, t)) || (await hash(old, t)) !== (await hash(neu, t))) bad.push(t);
    console.log(bad.length ? `\nMISMATCH in ${bad.join(", ")}` : `\nCopied. Row counts and contents match in all ${list.length} tables.`);
    if (bad.length) process.exitCode = 1;
  }
} finally {
  await old.close();
  await neu.close();
}
