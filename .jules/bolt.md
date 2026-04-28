## 2024-04-28 - Cartesian Explosion in Dashboard Queries
**Learning:** Found a critical backend performance bottleneck in `src/services/groupService.ts` where multiple `LEFT JOIN`s against one-to-many tables (members, expenses, settlements) caused an O(M×E×S) Cartesian explosion in rows before grouping, resulting in extreme memory/CPU load as group data grows.
**Action:** Avoid joining multiple independent one-to-many tables in the same query. Always use scalar subqueries or lateral joins to fetch aggregates independently.
