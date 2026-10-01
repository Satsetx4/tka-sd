import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { mapTaxonomySeed, validateTaxonomySeed } from "./taxonomy-input";

const seed = JSON.parse(
  readFileSync("docs/implementation/01_taxonomy_seed_v1.json", "utf8"),
) as unknown;

test("maps the approved seed to the expected taxonomy counts", () => {
  const rows = mapTaxonomySeed(seed);

  assert.deepEqual(rows.counts, {
    subjects: 2,
    domains: 4,
    topics: 25,
    competencies: 8,
    indicators: 10,
    tags: 0,
  });
  assert.equal(
    rows.indicators.find((indicator) => indicator.code === "BIN_IN_MAIN")
      ?.description,
    "Menyimpulkan ide pokok, gagasan pendukung, amanat, tokoh, peristiwa, dan/atau nilai-nilai dalam teks.",
  );
  assert.deepEqual(
    rows.indicators.map((indicator) => indicator.sortOrder),
    [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  );
});

test("rejects malformed input before mapping", () => {
  const malformed = structuredClone(seed) as {
    subjects: Array<Record<string, unknown>>;
  };
  delete malformed.subjects[0]?.name;

  assert.throws(() => validateTaxonomySeed(malformed), /Invalid taxonomy seed/);
});

test("rejects duplicate stable codes", () => {
  const duplicateCode = structuredClone(seed) as {
    subjects: Array<{
      domains: Array<{ topics: Array<{ code: string }> }>;
    }>;
  };
  const firstDomain = duplicateCode.subjects[0]?.domains[0];
  if (!firstDomain) {
    throw new Error("Test seed is missing its first domain.");
  }
  firstDomain.topics[1]!.code = firstDomain.topics[0]!.code;

  assert.throws(() => mapTaxonomySeed(duplicateCode), /duplicate topic code/);
});

test("rejects unresolved topic parents and competency references", () => {
  const unresolvedParent = structuredClone(seed) as {
    subjects: Array<{
      domains: Array<{ topics: Array<{ parent_code?: string }> }>;
    }>;
  };
  const childTopic = unresolvedParent.subjects[0]?.domains[0]?.topics[1];
  if (!childTopic) {
    throw new Error("Test seed is missing its first child topic.");
  }
  childTopic.parent_code = "MAT_MISSING";
  assert.throws(
    () => validateTaxonomySeed(unresolvedParent),
    /references missing parent code MAT_MISSING/,
  );

  const unresolvedCompetency = structuredClone(seed) as {
    subjects: Array<{
      indicators?: Array<{ competency_code: string }>;
    }>;
  };
  unresolvedCompetency.subjects[1]!.indicators![0]!.competency_code =
    "BIN_MISSING";
  assert.throws(
    () => validateTaxonomySeed(unresolvedCompetency),
    /references missing competency code BIN_MISSING/,
  );
});
