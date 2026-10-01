import { z } from "zod";

const codeSchema = z
  .string()
  .min(1)
  .regex(/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/);
const labelSchema = z.string().min(1).refine((value) => value.trim().length > 0);
const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const enumValuesSchema = z.array(codeSchema).min(1);

const topicSchema = z
  .object({
    code: codeSchema,
    name: labelSchema,
    slug: slugSchema,
    sort_order: z.number().int(),
    parent_code: codeSchema.optional(),
  })
  .strict();

const domainSchema = z
  .object({
    code: codeSchema,
    name: labelSchema,
    slug: slugSchema,
    sort_order: z.number().int(),
    topics: z.array(topicSchema),
  })
  .strict();

const competencySchema = z
  .object({
    code: codeSchema,
    name: labelSchema,
    sort_order: z.number().int(),
  })
  .strict();

const indicatorSchema = z
  .object({
    code: codeSchema,
    competency_code: codeSchema,
    description: labelSchema,
  })
  .strict();

const subjectSchema = z
  .object({
    code: codeSchema,
    name: labelSchema,
    slug: slugSchema,
    sort_order: z.number().int(),
    domains: z.array(domainSchema),
    competencies: z.array(competencySchema),
    indicators: z.array(indicatorSchema).optional(),
  })
  .strict();

const enumSchema = z
  .object({
    cognitive_level: enumValuesSchema,
    difficulty: enumValuesSchema,
    question_type: enumValuesSchema,
    usage_type: enumValuesSchema,
    content_status: enumValuesSchema,
    source_type: enumValuesSchema,
    stimulus_type: enumValuesSchema,
    text_type: enumValuesSchema,
  })
  .strict();

export const taxonomySeedSchema = z
  .object({
    version: z.literal("1.0"),
    subjects: z.array(subjectSchema).min(1),
    enums: enumSchema,
  })
  .strict();

export type TaxonomySeed = z.infer<typeof taxonomySeedSchema>;

export type TaxonomySeedRows = {
  subjects: Array<{
    code: string;
    name: string;
    slug: string;
    sortOrder: number;
  }>;
  domains: Array<{
    code: string;
    subjectCode: string;
    name: string;
    slug: string;
    sortOrder: number;
  }>;
  topics: Array<{
    code: string;
    domainCode: string;
    parentCode: string | null;
    name: string;
    slug: string;
    sortOrder: number;
  }>;
  competencies: Array<{
    code: string;
    subjectCode: string;
    name: string;
    sortOrder: number;
  }>;
  indicators: Array<{
    code: string;
    subjectCode: string;
    competencyCode: string;
    description: string;
    sortOrder: number;
  }>;
  tags: [];
  counts: {
    subjects: number;
    domains: number;
    topics: number;
    competencies: number;
    indicators: number;
    tags: 0;
  };
};

function ensureUnique<T>(
  values: T[],
  label: string,
  keyFor: (value: T) => string,
): void {
  const seen = new Set<string>();

  for (const value of values) {
    const key = keyFor(value);
    if (seen.has(key)) {
      throw new Error(`Taxonomy seed contains duplicate ${label}: ${key}`);
    }
    seen.add(key);
  }
}

function validateRelationships(seed: TaxonomySeed): void {
  ensureUnique(seed.subjects, "subject code", (subject) => subject.code);
  ensureUnique(seed.subjects, "subject slug", (subject) => subject.slug);

  const domains = seed.subjects.flatMap((subject) => subject.domains);
  const topics = domains.flatMap((domain) => domain.topics);
  const competencies = seed.subjects.flatMap((subject) => subject.competencies);
  const indicators = seed.subjects.flatMap(
    (subject) => subject.indicators ?? [],
  );

  ensureUnique(domains, "domain code", (domain) => domain.code);
  ensureUnique(topics, "topic code", (topic) => topic.code);
  ensureUnique(competencies, "competency code", (competency) => competency.code);
  ensureUnique(indicators, "indicator code", (indicator) => indicator.code);

  for (const subject of seed.subjects) {
    ensureUnique(
      subject.domains,
      `domain slug in subject ${subject.code}`,
      (domain) => domain.slug,
    );

    for (const domain of subject.domains) {
      ensureUnique(
        domain.topics,
        `topic hierarchy slug in domain ${domain.code}`,
        (topic) => `${topic.parent_code ?? "<root>"}\0${topic.slug}`,
      );

      const topicByCode = new Map(
        domain.topics.map((topic) => [topic.code, topic]),
      );
      for (const topic of domain.topics) {
        if (topic.parent_code && !topicByCode.has(topic.parent_code)) {
          throw new Error(
            `Topic ${topic.code} references missing parent code ${topic.parent_code} in domain ${domain.code}`,
          );
        }
      }

      for (const topic of domain.topics) {
        const visited = new Set<string>([topic.code]);
        let parentCode = topic.parent_code;
        while (parentCode) {
          if (visited.has(parentCode)) {
            throw new Error(`Topic hierarchy contains a cycle at ${parentCode}`);
          }
          visited.add(parentCode);
          parentCode = topicByCode.get(parentCode)?.parent_code;
        }
      }
    }

    const competencyCodes = new Set(
      subject.competencies.map((competency) => competency.code),
    );
    for (const indicator of subject.indicators ?? []) {
      if (!competencyCodes.has(indicator.competency_code)) {
        throw new Error(
          `Indicator ${indicator.code} references missing competency code ${indicator.competency_code} in subject ${subject.code}`,
        );
      }
    }
  }

  for (const [enumName, values] of Object.entries(seed.enums)) {
    ensureUnique(values, `${enumName} enum value`, (value) => value);
  }
}

export function validateTaxonomySeed(input: unknown): TaxonomySeed {
  const result = taxonomySeedSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "seed"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid taxonomy seed: ${issues}`);
  }

  validateRelationships(result.data);
  return result.data;
}

export function mapTaxonomySeed(input: unknown): TaxonomySeedRows {
  const seed = validateTaxonomySeed(input);
  const subjects = seed.subjects.map((subject) => ({
    code: subject.code,
    name: subject.name,
    slug: subject.slug,
    sortOrder: subject.sort_order,
  }));
  const domains = seed.subjects.flatMap((subject) =>
    subject.domains.map((domain) => ({
      code: domain.code,
      subjectCode: subject.code,
      name: domain.name,
      slug: domain.slug,
      sortOrder: domain.sort_order,
    })),
  );

  const sourceTopics = seed.subjects.flatMap((subject) =>
    subject.domains.flatMap((domain) =>
      domain.topics.map((topic) => ({
        code: topic.code,
        domainCode: domain.code,
        parentCode: topic.parent_code ?? null,
        name: topic.name,
        slug: topic.slug,
        sortOrder: topic.sort_order,
      })),
    ),
  );
  const pendingTopics = [...sourceTopics];
  const topics: TaxonomySeedRows["topics"] = [];
  const insertedTopicCodes = new Set<string>();

  while (pendingTopics.length > 0) {
    const readyTopics = pendingTopics.filter(
      (topic) => !topic.parentCode || insertedTopicCodes.has(topic.parentCode),
    );

    if (readyTopics.length === 0) {
      throw new Error("Taxonomy seed topic parents cannot be resolved.");
    }

    for (const topic of readyTopics) {
      topics.push(topic);
      insertedTopicCodes.add(topic.code);
    }

    const readyCodes = new Set(readyTopics.map((topic) => topic.code));
    for (let index = pendingTopics.length - 1; index >= 0; index -= 1) {
      if (readyCodes.has(pendingTopics[index]?.code ?? "")) {
        pendingTopics.splice(index, 1);
      }
    }
  }

  const competencies = seed.subjects.flatMap((subject) =>
    subject.competencies.map((competency) => ({
      code: competency.code,
      subjectCode: subject.code,
      name: competency.name,
      sortOrder: competency.sort_order,
    })),
  );
  const indicators = seed.subjects.flatMap((subject) =>
    (subject.indicators ?? []).map((indicator, index) => ({
      code: indicator.code,
      subjectCode: subject.code,
      competencyCode: indicator.competency_code,
      description: indicator.description,
      // The approved list order is part of the JSON source; the schema requires
      // an integer sort order, so preserve that order in steps of ten.
      sortOrder: (index + 1) * 10,
    })),
  );

  return {
    subjects,
    domains,
    topics,
    competencies,
    indicators,
    tags: [],
    counts: {
      subjects: subjects.length,
      domains: domains.length,
      topics: topics.length,
      competencies: competencies.length,
      indicators: indicators.length,
      tags: 0,
    },
  };
}
