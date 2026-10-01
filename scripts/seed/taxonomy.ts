import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "@neondatabase/serverless";
import { config as loadDotEnv } from "dotenv";
import {
  and,
  count,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { alias } from "drizzle-orm/pg-core";
import { parseServerEnv } from "../../src/config/server-env-schema";
import {
  competencies,
  domains,
  indicators,
  subjects,
  tags,
  topics,
} from "../../src/db/schema";
import { mapTaxonomySeed, type TaxonomySeedRows } from "./taxonomy-input";

const sourcePath = "docs/implementation/01_taxonomy_seed_v1.json";
const expectedDevelopmentHost =
  "ep-billowing-block-az2xv602-pooler.c-3.ap-southeast-1.aws.neon.tech";
const expectedDatabaseName = "neondb";

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${String(expected)}, received ${String(actual)}.`);
  }
}

function indexByCode<T extends { code: string }>(
  rows: T[],
  tableName: string,
): Map<string, T> {
  const result = new Map<string, T>();
  for (const row of rows) {
    if (result.has(row.code)) {
      throw new Error(`Database returned duplicate ${tableName} code ${row.code}.`);
    }
    result.set(row.code, row);
  }
  return result;
}

function verifyRows<T extends { code: string }>(
  tableName: string,
  expected: Array<{ code: string }>,
  actual: T[],
): Map<string, T> {
  assertEqual(actual.length, expected.length, `${tableName} source-code row count`);
  const byCode = indexByCode(actual, tableName);
  for (const row of expected) {
    if (!byCode.has(row.code)) {
      throw new Error(`Database is missing ${tableName} code ${row.code}.`);
    }
  }
  return byCode;
}

function expectedCodes(rows: TaxonomySeedRows) {
  return {
    subjects: rows.subjects.map((row) => row.code),
    domains: rows.domains.map((row) => row.code),
    topics: rows.topics.map((row) => row.code),
    competencies: rows.competencies.map((row) => row.code),
    indicators: rows.indicators.map((row) => row.code),
  };
}

async function main(): Promise<void> {
  loadDotEnv({
    path: resolve(process.cwd(), ".env.local"),
    override: false,
    quiet: true,
  });
  const { DATABASE_URL } = parseServerEnv(process.env);
  const connectionUrl = new URL(DATABASE_URL);
  const databaseName = decodeURIComponent(connectionUrl.pathname.replace(/^\/+/, ""));

  if (
    connectionUrl.hostname.toLowerCase() !== expectedDevelopmentHost ||
    databaseName !== expectedDatabaseName
  ) {
    throw new Error(
      "Refusing to seed: DATABASE_URL does not match the verified tka-sd development endpoint and neondb database.",
    );
  }

  const rawSeed = await readFile(resolve(process.cwd(), sourcePath), "utf8");
  const seedRows = mapTaxonomySeed(JSON.parse(rawSeed) as unknown);
  const codes = expectedCodes(seedRows);
  const pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
  const db = drizzle({ client: pool });

  try {
    const report = await db.transaction(async (tx) => {
      const connection = await tx.execute(
        sql`SELECT current_database()::text AS database_name`,
      );
      const actualDatabaseName = String(connection.rows[0]?.database_name ?? "");
      assertEqual(actualDatabaseName, expectedDatabaseName, "Connected database");

      const tableNamesBeforeResult = await tx.execute(sql`
        SELECT table_name::text AS table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      const tableNamesBefore = tableNamesBeforeResult.rows.map((row) =>
        String(row.table_name),
      );
      const identityCountsBefore = await getIdentityCounts(tx);
      const countsBefore = await getTaxonomyCounts(tx);
      const matchingBefore = await getMatchingCounts(tx, codes);

      const subjectIds = new Map<string, string>();
      for (const row of seedRows.subjects) {
        await tx
          .insert(subjects)
          .values({
            id: randomUUID(),
            code: row.code,
            name: row.name,
            slug: row.slug,
            sortOrder: row.sortOrder,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: subjects.code,
            set: {
              name: sql`excluded.name`,
              slug: sql`excluded.slug`,
              sortOrder: sql`excluded.sort_order`,
              updatedAt: sql`now()`,
            },
            setWhere: sql`
              ${subjects.name} IS DISTINCT FROM excluded.name OR
              ${subjects.slug} IS DISTINCT FROM excluded.slug OR
              ${subjects.sortOrder} IS DISTINCT FROM excluded.sort_order
            `,
          });

        const [resolved] = await tx
          .select({ id: subjects.id })
          .from(subjects)
          .where(eq(subjects.code, row.code));
        if (!resolved) {
          throw new Error(`Could not resolve subject code ${row.code} after upsert.`);
        }
        subjectIds.set(row.code, resolved.id);
      }

      const domainIds = new Map<string, string>();
      for (const row of seedRows.domains) {
        const subjectId = subjectIds.get(row.subjectCode);
        if (!subjectId) {
          throw new Error(`Could not resolve subject code ${row.subjectCode}.`);
        }

        await tx
          .insert(domains)
          .values({
            id: randomUUID(),
            subjectId,
            code: row.code,
            name: row.name,
            slug: row.slug,
            description: null,
            sortOrder: row.sortOrder,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: domains.code,
            set: {
              subjectId: sql`excluded.subject_id`,
              name: sql`excluded.name`,
              slug: sql`excluded.slug`,
              sortOrder: sql`excluded.sort_order`,
            },
            setWhere: sql`
              ${domains.subjectId} IS DISTINCT FROM excluded.subject_id OR
              ${domains.name} IS DISTINCT FROM excluded.name OR
              ${domains.slug} IS DISTINCT FROM excluded.slug OR
              ${domains.sortOrder} IS DISTINCT FROM excluded.sort_order
            `,
          });

        const [resolved] = await tx
          .select({ id: domains.id })
          .from(domains)
          .where(eq(domains.code, row.code));
        if (!resolved) {
          throw new Error(`Could not resolve domain code ${row.code} after upsert.`);
        }
        domainIds.set(row.code, resolved.id);
      }

      const topicIds = new Map<string, string>();
      for (const row of seedRows.topics) {
        const domainId = domainIds.get(row.domainCode);
        if (!domainId) {
          throw new Error(`Could not resolve domain code ${row.domainCode}.`);
        }
        const parentTopicId = row.parentCode
          ? topicIds.get(row.parentCode)
          : null;
        if (row.parentCode && !parentTopicId) {
          throw new Error(
            `Could not resolve parent topic code ${row.parentCode} for ${row.code}.`,
          );
        }

        await tx
          .insert(topics)
          .values({
            id: randomUUID(),
            domainId,
            parentTopicId,
            code: row.code,
            name: row.name,
            slug: row.slug,
            description: null,
            sortOrder: row.sortOrder,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: topics.code,
            set: {
              domainId: sql`excluded.domain_id`,
              parentTopicId: sql`excluded.parent_topic_id`,
              name: sql`excluded.name`,
              slug: sql`excluded.slug`,
              sortOrder: sql`excluded.sort_order`,
            },
            setWhere: sql`
              ${topics.domainId} IS DISTINCT FROM excluded.domain_id OR
              ${topics.parentTopicId} IS DISTINCT FROM excluded.parent_topic_id OR
              ${topics.name} IS DISTINCT FROM excluded.name OR
              ${topics.slug} IS DISTINCT FROM excluded.slug OR
              ${topics.sortOrder} IS DISTINCT FROM excluded.sort_order
            `,
          });

        const [resolved] = await tx
          .select({ id: topics.id })
          .from(topics)
          .where(eq(topics.code, row.code));
        if (!resolved) {
          throw new Error(`Could not resolve topic code ${row.code} after upsert.`);
        }
        topicIds.set(row.code, resolved.id);
      }

      const competencyIds = new Map<string, string>();
      for (const row of seedRows.competencies) {
        const subjectId = subjectIds.get(row.subjectCode);
        if (!subjectId) {
          throw new Error(`Could not resolve subject code ${row.subjectCode}.`);
        }

        await tx
          .insert(competencies)
          .values({
            id: randomUUID(),
            subjectId,
            code: row.code,
            name: row.name,
            description: null,
            sortOrder: row.sortOrder,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: competencies.code,
            set: {
              subjectId: sql`excluded.subject_id`,
              name: sql`excluded.name`,
              sortOrder: sql`excluded.sort_order`,
            },
            setWhere: sql`
              ${competencies.subjectId} IS DISTINCT FROM excluded.subject_id OR
              ${competencies.name} IS DISTINCT FROM excluded.name OR
              ${competencies.sortOrder} IS DISTINCT FROM excluded.sort_order
            `,
          });

        const [resolved] = await tx
          .select({ id: competencies.id })
          .from(competencies)
          .where(eq(competencies.code, row.code));
        if (!resolved) {
          throw new Error(
            `Could not resolve competency code ${row.code} after upsert.`,
          );
        }
        competencyIds.set(row.code, resolved.id);
      }

      for (const row of seedRows.indicators) {
        const subjectId = subjectIds.get(row.subjectCode);
        const competencyId = competencyIds.get(row.competencyCode);
        if (!subjectId || !competencyId) {
          throw new Error(
            `Could not resolve subject or competency parent for indicator ${row.code}.`,
          );
        }

        await tx
          .insert(indicators)
          .values({
            id: randomUUID(),
            subjectId,
            topicId: null,
            competencyId,
            code: row.code,
            description: row.description,
            officialReference: null,
            sortOrder: row.sortOrder,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: indicators.code,
            set: {
              subjectId: sql`excluded.subject_id`,
              competencyId: sql`excluded.competency_id`,
              description: sql`excluded.description`,
              sortOrder: sql`excluded.sort_order`,
            },
            setWhere: sql`
              ${indicators.subjectId} IS DISTINCT FROM excluded.subject_id OR
              ${indicators.competencyId} IS DISTINCT FROM excluded.competency_id OR
              ${indicators.description} IS DISTINCT FROM excluded.description OR
              ${indicators.sortOrder} IS DISTINCT FROM excluded.sort_order
            `,
          });
      }

      const actualSubjects = await tx
        .select()
        .from(subjects)
        .where(inArray(subjects.code, codes.subjects));
      const actualDomains = await tx
        .select()
        .from(domains)
        .where(inArray(domains.code, codes.domains));
      const actualTopics = await tx
        .select()
        .from(topics)
        .where(inArray(topics.code, codes.topics));
      const actualCompetencies = await tx
        .select()
        .from(competencies)
        .where(inArray(competencies.code, codes.competencies));
      const actualIndicators = await tx
        .select()
        .from(indicators)
        .where(inArray(indicators.code, codes.indicators));

      const subjectsByCode = verifyRows(
        "subject",
        seedRows.subjects,
        actualSubjects,
      );
      const domainsByCode = verifyRows("domain", seedRows.domains, actualDomains);
      const topicsByCode = verifyRows("topic", seedRows.topics, actualTopics);
      const competenciesByCode = verifyRows(
        "competency",
        seedRows.competencies,
        actualCompetencies,
      );
      verifyRows("indicator", seedRows.indicators, actualIndicators);

      for (const expected of seedRows.subjects) {
        const actual = subjectsByCode.get(expected.code);
        if (!actual) throw new Error(`Missing subject ${expected.code} during read-back.`);
        assertEqual(actual.name, expected.name, `Subject ${expected.code} name`);
        assertEqual(actual.slug, expected.slug, `Subject ${expected.code} slug`);
        assertEqual(actual.sortOrder, expected.sortOrder, `Subject ${expected.code} sort_order`);
      }

      for (const expected of seedRows.domains) {
        const actual = domainsByCode.get(expected.code);
        const subjectId = subjectsByCode.get(expected.subjectCode)?.id;
        if (!actual || !subjectId) {
          throw new Error(`Missing domain or subject ${expected.code} during read-back.`);
        }
        assertEqual(actual.subjectId, subjectId, `Domain ${expected.code} subject_id`);
        assertEqual(actual.name, expected.name, `Domain ${expected.code} name`);
        assertEqual(actual.slug, expected.slug, `Domain ${expected.code} slug`);
        assertEqual(actual.sortOrder, expected.sortOrder, `Domain ${expected.code} sort_order`);
      }

      for (const expected of seedRows.topics) {
        const actual = topicsByCode.get(expected.code);
        const domainId = domainsByCode.get(expected.domainCode)?.id;
        const parentTopicId = expected.parentCode
          ? topicsByCode.get(expected.parentCode)?.id
          : null;
        if (!actual || !domainId) {
          throw new Error(`Missing topic or domain ${expected.code} during read-back.`);
        }
        assertEqual(actual.domainId, domainId, `Topic ${expected.code} domain_id`);
        assertEqual(
          actual.parentTopicId,
          parentTopicId ?? null,
          `Topic ${expected.code} parent_topic_id`,
        );
        assertEqual(actual.name, expected.name, `Topic ${expected.code} name`);
        assertEqual(actual.slug, expected.slug, `Topic ${expected.code} slug`);
        assertEqual(actual.sortOrder, expected.sortOrder, `Topic ${expected.code} sort_order`);
      }

      for (const expected of seedRows.competencies) {
        const actual = competenciesByCode.get(expected.code);
        const subjectId = subjectsByCode.get(expected.subjectCode)?.id;
        if (!actual || !subjectId) {
          throw new Error(`Missing competency or subject ${expected.code} during read-back.`);
        }
        assertEqual(actual.subjectId, subjectId, `Competency ${expected.code} subject_id`);
        assertEqual(actual.name, expected.name, `Competency ${expected.code} name`);
        assertEqual(actual.sortOrder, expected.sortOrder, `Competency ${expected.code} sort_order`);
      }

      const indicatorsByCode = indexByCode(actualIndicators, "indicator");
      for (const expected of seedRows.indicators) {
        const actual = indicatorsByCode.get(expected.code);
        const subjectId = subjectsByCode.get(expected.subjectCode)?.id;
        const competencyId = competenciesByCode.get(expected.competencyCode)?.id;
        if (!actual || !subjectId || !competencyId) {
          throw new Error(`Missing indicator parent for ${expected.code} during read-back.`);
        }
        assertEqual(actual.subjectId, subjectId, `Indicator ${expected.code} subject_id`);
        assertEqual(
          actual.competencyId,
          competencyId,
          `Indicator ${expected.code} competency_id`,
        );
        assertEqual(
          actual.description,
          expected.description,
          `Indicator ${expected.code} description`,
        );
        assertEqual(
          actual.sortOrder,
          expected.sortOrder,
          `Indicator ${expected.code} derived sort_order`,
        );
      }

      const parentTopics = alias(topics, "parent_topic");
      const invalidDomains = await tx
        .select({ id: domains.id })
        .from(domains)
        .leftJoin(subjects, eq(domains.subjectId, subjects.id))
        .where(isNull(subjects.id));
      const invalidTopics = await tx
        .select({ id: topics.id })
        .from(topics)
        .leftJoin(domains, eq(topics.domainId, domains.id))
        .leftJoin(parentTopics, eq(topics.parentTopicId, parentTopics.id))
        .where(
          or(
            isNull(domains.id),
            and(isNotNull(topics.parentTopicId), isNull(parentTopics.id)),
            and(
              isNotNull(parentTopics.id),
              ne(parentTopics.domainId, topics.domainId),
            ),
          ),
        );
      const invalidCompetencies = await tx
        .select({ id: competencies.id })
        .from(competencies)
        .leftJoin(subjects, eq(competencies.subjectId, subjects.id))
        .where(isNull(subjects.id));
      const invalidIndicators = await tx
        .select({ id: indicators.id })
        .from(indicators)
        .leftJoin(subjects, eq(indicators.subjectId, subjects.id))
        .leftJoin(competencies, eq(indicators.competencyId, competencies.id))
        .leftJoin(topics, eq(indicators.topicId, topics.id))
        .where(
          or(
            isNull(subjects.id),
            isNull(competencies.id),
            and(isNotNull(indicators.topicId), isNull(topics.id)),
          ),
        );
      assertEqual(invalidDomains.length, 0, "Unresolved domain subject FKs");
      assertEqual(invalidTopics.length, 0, "Unresolved topic/domain/parent FKs");
      assertEqual(invalidCompetencies.length, 0, "Unresolved competency subject FKs");
      assertEqual(invalidIndicators.length, 0, "Unresolved indicator FKs");

      const duplicateGroups = await getDuplicateHierarchyGroups(tx);
      for (const [label, duplicateCount] of Object.entries(duplicateGroups)) {
        assertEqual(duplicateCount, 0, `${label} duplicate groups`);
      }

      const countsAfter = await getTaxonomyCounts(tx);
      for (const table of [
        "subjects",
        "domains",
        "topics",
        "competencies",
        "indicators",
        "tags",
      ] as const) {
        const expectedCount =
          countsBefore[table] + seedRows.counts[table] - matchingBefore[table];
        assertEqual(countsAfter[table], expectedCount, `${table} table count`);
      }

      const identityCountsAfter = await getIdentityCounts(tx);
      assertEqual(
        JSON.stringify(identityCountsAfter),
        JSON.stringify(identityCountsBefore),
        "Non-taxonomy identity row counts",
      );
      const tableNamesAfterResult = await tx.execute(sql`
        SELECT table_name::text AS table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      const tableNamesAfter = tableNamesAfterResult.rows.map((row) =>
        String(row.table_name),
      );
      assertEqual(
        JSON.stringify(tableNamesAfter),
        JSON.stringify(tableNamesBefore),
        "Public application table list",
      );

      const stablePairs = [
        ...actualSubjects.map((row) => `subjects:${row.code}:${row.id}`),
        ...actualDomains.map((row) => `domains:${row.code}:${row.id}`),
        ...actualTopics.map((row) => `topics:${row.code}:${row.id}`),
        ...actualCompetencies.map((row) => `competencies:${row.code}:${row.id}`),
        ...actualIndicators.map((row) => `indicators:${row.code}:${row.id}`),
      ].sort();
      const stableIdFingerprint = createHash("sha256")
        .update(stablePairs.join("\n"))
        .digest("hex");

      return {
        target: "Neon tka-sd / development",
        source: sourcePath,
        expectedSeedCounts: seedRows.counts,
        existingSeedCodesBefore: matchingBefore,
        databaseCountsBefore: countsBefore,
        databaseCountsAfter: countsAfter,
        seedCodeRowsAfter: {
          subjects: actualSubjects.length,
          domains: actualDomains.length,
          topics: actualTopics.length,
          competencies: actualCompetencies.length,
          indicators: actualIndicators.length,
          tags: seedRows.counts.tags,
        },
        stableCodeIdCount: stablePairs.length,
        stableIdFingerprint,
        foreignKeys: "PASS",
        duplicateCodeAndSlugChecks: "PASS",
        nonTaxonomyTablesAndIdentityCounts: "UNCHANGED",
      };
    });

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await pool.end();
  }
}

async function getAllRowCounts(
  tx: Parameters<Parameters<ReturnType<typeof drizzle>["transaction"]>[0]>[0],
) {
  const result = await tx.execute(sql`
    SELECT
      (SELECT count(*) FROM public.subjects)::integer AS subjects,
      (SELECT count(*) FROM public.domains)::integer AS domains,
      (SELECT count(*) FROM public.topics)::integer AS topics,
      (SELECT count(*) FROM public.competencies)::integer AS competencies,
      (SELECT count(*) FROM public.indicators)::integer AS indicators,
      (SELECT count(*) FROM public.tags)::integer AS tags,
      (SELECT count(*) FROM public.users)::integer AS users,
      (SELECT count(*) FROM public.child_profiles)::integer AS child_profiles,
      (SELECT count(*) FROM public.parent_pins)::integer AS parent_pins
  `);
  const row = result.rows[0] as Record<string, unknown> | undefined;
  const asCount = (key: string) => Number(row?.[key] ?? 0);

  return {
    taxonomy: {
      subjects: asCount("subjects"),
      domains: asCount("domains"),
      topics: asCount("topics"),
      competencies: asCount("competencies"),
      indicators: asCount("indicators"),
      tags: asCount("tags"),
    },
    identity: {
      users: asCount("users"),
      child_profiles: asCount("child_profiles"),
      parent_pins: asCount("parent_pins"),
    },
  };
}

async function getTaxonomyCounts(
  tx: Parameters<Parameters<ReturnType<typeof drizzle>["transaction"]>[0]>[0],
) {
  return (await getAllRowCounts(tx)).taxonomy;
}

async function getIdentityCounts(
  tx: Parameters<Parameters<ReturnType<typeof drizzle>["transaction"]>[0]>[0],
) {
  return (await getAllRowCounts(tx)).identity;
}

async function getMatchingCounts(
  tx: Parameters<Parameters<ReturnType<typeof drizzle>["transaction"]>[0]>[0],
  codes: ReturnType<typeof expectedCodes>,
) {
  return {
    subjects: (
      await tx
        .select({ code: subjects.code })
        .from(subjects)
        .where(inArray(subjects.code, codes.subjects))
    ).length,
    domains: (
      await tx
        .select({ code: domains.code })
        .from(domains)
        .where(inArray(domains.code, codes.domains))
    ).length,
    topics: (
      await tx
        .select({ code: topics.code })
        .from(topics)
        .where(inArray(topics.code, codes.topics))
    ).length,
    competencies: (
      await tx
        .select({ code: competencies.code })
        .from(competencies)
        .where(inArray(competencies.code, codes.competencies))
    ).length,
    indicators: (
      await tx
        .select({ code: indicators.code })
        .from(indicators)
        .where(inArray(indicators.code, codes.indicators))
    ).length,
    tags: 0,
  };
}

async function getDuplicateHierarchyGroups(
  tx: Parameters<Parameters<ReturnType<typeof drizzle>["transaction"]>[0]>[0],
) {
  const duplicateSubjectCodes = await tx
    .select({ value: count() })
    .from(subjects)
    .groupBy(subjects.code)
    .having(sql`count(*) > 1`);
  const duplicateSubjectSlugs = await tx
    .select({ value: count() })
    .from(subjects)
    .groupBy(subjects.slug)
    .having(sql`count(*) > 1`);
  const duplicateDomainCodes = await tx
    .select({ value: count() })
    .from(domains)
    .groupBy(domains.code)
    .having(sql`count(*) > 1`);
  const duplicateDomainSlugs = await tx
    .select({ value: count() })
    .from(domains)
    .groupBy(domains.subjectId, domains.slug)
    .having(sql`count(*) > 1`);
  const duplicateTopicCodes = await tx
    .select({ value: count() })
    .from(topics)
    .groupBy(topics.code)
    .having(sql`count(*) > 1`);
  const duplicateTopicSlugs = await tx
    .select({ value: count() })
    .from(topics)
    .groupBy(topics.domainId, topics.parentTopicId, topics.slug)
    .having(sql`count(*) > 1`);
  const duplicateCompetencies = await tx
    .select({ value: count() })
    .from(competencies)
    .groupBy(competencies.code)
    .having(sql`count(*) > 1`);
  const duplicateIndicators = await tx
    .select({ value: count() })
    .from(indicators)
    .groupBy(indicators.code)
    .having(sql`count(*) > 1`);
  const duplicateTags = await tx
    .select({ value: count() })
    .from(tags)
    .groupBy(tags.slug)
    .having(sql`count(*) > 1`);

  return {
    subjectCodes: duplicateSubjectCodes.length,
    subjectSlugs: duplicateSubjectSlugs.length,
    domainCodes: duplicateDomainCodes.length,
    domainSlugs: duplicateDomainSlugs.length,
    topicCodes: duplicateTopicCodes.length,
    topicHierarchySlugs: duplicateTopicSlugs.length,
    competencies: duplicateCompetencies.length,
    indicators: duplicateIndicators.length,
    tags: duplicateTags.length,
  };
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Taxonomy seed failed.";
  console.error(message);
  process.exitCode = 1;
});
