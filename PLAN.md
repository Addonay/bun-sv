# Bundaa Codebase Overhaul Plan

## Phase 1: Database Layer Restructure (Effect + Drizzle, no raw SQL)

### 1a. Extract schema to `src/bun/schema.ts`
- Move `qosConfig` and `qosData` table definitions out of `db.ts`
- Use proper Drizzle column types (no raw SQL for table creation)
- Add `serial()` or `integer().primaryKey().$defaultFn(...)` instead of raw sequences
- Export all table schemas from this file — future tables go here too

### 1b. Create `src/bun/db.ts` as a pure connection/init module
- Keep DuckDB instance + connection + drizzle `db` export
- Use `@duckdbfan/drizzle-duckdb`'s `migrate()` for table creation instead of raw `CREATE TABLE`
- OR use `db.execute(sql)` with Drizzle's schema push (the adapter supports it)
- Create a simple `initDb()` function using Effect that:
  - Creates the connection
  - Pushes schema (ensures tables exist)
  - Returns the db instance

### 1c. Create `src/bun/services/db-service.ts` — Effect Service layer
- Define an Effect `Context.Tag` for `DbService`
- Wrap all DB operations as Effect programs:
  - `getQosConfig` → `Effect<QosConfig | null, DbError>`
  - `saveQosConfig` → `Effect<void, DbError>`
  - `saveQosData` → `Effect<void, DbError>`
  - `clearQosData` → `Effect<void, DbError>`
  - `createDynamicTable` → for user-created tables
  - `dropDynamicTable` → cleanup
- All use Drizzle query builder — **zero raw SQL**:
  - Replace `db.execute(drizzleSql\`INSERT...\`)` with `db.insert().values().onConflictDoUpdate()`
  - Replace `drizzleSql\`id = 1\`` with `eq(qosConfig.id, 1)`
- Provide a `DbServiceLive` Layer that creates the real DuckDB-backed implementation

### 1d. Refactor `src/bun/background.ts`
- Keep the Effect schedule logic but consume `DbService` via Effect context instead of direct imports
- This makes it testable and composable

## Phase 2: Cleanup — Delete unnecessary files

Delete these root-level scripts (one-time migration scripts, no longer needed):
- `fix-db.ts`
- `fix-rpc.ts`
- `fix-ui.ts`
- `fix-view.ts`
- `update-files.ts`
- `test-effect.ts`
- `test-lc.svelte`

Also delete:
- `data/app.duckdb` (using `:memory:`, this is stale)

## Phase 3: Wire up `src/bun/index.ts`

- Use Effect to compose the full app startup:
  - Init DB (with schema push)
  - Start background wipe task
  - Create window + RPC handlers
- RPC handlers call into DbService Effect programs
- Clean up the redundant `_` catch-all handler pattern

## Phase 4: QoS Dashboard UI Overhaul

### Problems with current UI:
1. `bg-white/70 backdrop-blur` hardcoded — breaks dark mode
2. Status cards are plain, no visual richness
3. Chart cards are cramped, the `-mx-2` hack causes overflow issues
4. No clear visual hierarchy between the controls bar, stats, and chart grid
5. The overall layout feels cluttered

### Fixes:
- **Controls bar**: Combine region selector, group filters, and date range into a single compact toolbar strip (no card wrapper needed — use inline flex with subtle dividers)
- **Stats cards**: Make them smaller pill/badge style inline with the toolbar, not a separate 3-column grid row
- **Chart grid**:
  - Remove the `-mx-2` overflow hack from kpi-chart
  - Use `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` with consistent gap
  - Make chart cards use `bg-card` instead of hardcoded `bg-white/70`
  - Give charts more height (`h-48` instead of `h-40`)
  - Clean up the status indicator — just a colored left border instead of pulsing dots
- **Section headers**: Use a subtle separator line with label, not just plain text
- **Empty states**: Cleaner centered empty states

## Phase 5: Build Verification

- Run `vite build` to confirm no compilation errors
- Fix the `state_referenced_locally` warning in `chart-container.svelte` (line 20)
- The Electrobun launcher error is a platform issue (missing build artifacts), not a code issue — `vite build` succeeding is the real check

## File Changes Summary

### New files:
- `src/bun/schema.ts` — all Drizzle table schemas
- `src/bun/services/db-service.ts` — Effect-based DB service

### Modified files:
- `src/bun/db.ts` — stripped to connection only
- `src/bun/index.ts` — use Effect composition, cleaned up RPC
- `src/bun/background.ts` — consume DbService
- `src/lib/components/qos/qos-dashboard.svelte` — UI overhaul
- `src/lib/components/qos/kpi-chart.svelte` — cleaner chart cards
- `src/lib/components/ui/chart/chart-container.svelte` — fix warning

### Deleted files:
- `fix-db.ts`, `fix-rpc.ts`, `fix-ui.ts`, `fix-view.ts`
- `update-files.ts`, `test-effect.ts`, `test-lc.svelte`
- `data/app.duckdb`
