# TKA SD Project Documents

This directory registers the imported project source documents and their authority. The imported files retain their original contents.

## Authority order

1. [Product Blueprint — Source of Truth V1.0](blueprint/TKA_SD_Blueprint_Source_of_Truth_v1.0.md) governs product scope and business decisions.
2. [Implementation Specification V1.0](implementation/00_Implementation_Specification_V1.0.md) translates that scope into an engineering baseline and cannot silently override the Blueprint.
3. Reviewed ADRs record approved technical decisions within the first two documents; an ADR cannot override them.
4. Committed migrations implement the reviewed database design and decisions; they do not define product requirements.
5. Application code implements the documents above and cannot silently change their contracts.

When sources conflict, stop the affected implementation and resolve the conflict at the highest applicable authority before proceeding. Supporting taxonomy, ERD, migration-plan, and backlog artifacts must remain consistent with this order.

## Imported source documents

| Document | Repository path | Role |
|---|---|---|
| Technical & Product Blueprint — Source of Truth V1.0 | [docs/blueprint/TKA_SD_Blueprint_Source_of_Truth_v1.0.md](blueprint/TKA_SD_Blueprint_Source_of_Truth_v1.0.md) | Product and scope authority |
| Implementation Specification V1.0 | [docs/implementation/00_Implementation_Specification_V1.0.md](implementation/00_Implementation_Specification_V1.0.md) | Engineering baseline subordinate to the Blueprint |
| Taxonomy Seed Specification V1.0 | [docs/implementation/01_TKA_Taxonomy_Seed_V1.0.md](implementation/01_TKA_Taxonomy_Seed_V1.0.md) | Taxonomy rules |
| Taxonomy seed JSON V1.0 | [docs/implementation/01_taxonomy_seed_v1.json](implementation/01_taxonomy_seed_v1.json) | Machine-readable seed paired with the taxonomy specification |
| Database ERD & Schema V1.0 | [docs/implementation/02_Database_ERD_and_Schema_V1.0.md](implementation/02_Database_ERD_and_Schema_V1.0.md) | Database design reference; import does not create a schema |
| Database Migration Plan V1.0 | [docs/implementation/03_Database_Migration_Plan_V1.0.md](implementation/03_Database_Migration_Plan_V1.0.md) | Migration sequencing and safety reference; import does not create migrations |
| M0 Foundation Backlog V1.0 | [docs/implementation/04_M0_Foundation_Backlog_V1.0.md](implementation/04_M0_Foundation_Backlog_V1.0.md) | Source backlog for M0 planning |
| Engineering package README | [docs/implementation/README.md](implementation/README.md) | Original package index and authority note |

The original artifacts were copied without substantive edits. Their own status labels are preserved.

## Repository documentation layout

- `blueprint/` — approved product and technical Blueprint source.
- `implementation/` — original engineering specification package and supporting documents.
- `adr/` — architecture decision records, subordinate to the Blueprint and Implementation Specification.

## Implementation and checkpoint evidence

The imported source documents above remain authoritative for product and engineering decisions. The explicit contract for each task defines its current scope and stop boundary. Checkpoint status, validation evidence, and deferred items are recorded in docs/validation/; those records support implementation review and do not change the authority order above.
