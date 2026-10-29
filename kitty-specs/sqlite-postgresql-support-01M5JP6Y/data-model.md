# Persistence model and compatibility contract

## Canonical codecs

| Existing SQLite representation | Application contract | PostgreSQL plan |
|---|---|---|
| text ID | opaque string, preserve supplied IDs | text PK/FK; no implicit UUID cast |
| integer boolean | boolean | boolean with equivalent default/nullability |
| integer timestamp | Date at second precision; ISO JSON | timestamptz date mode, normalize precision explicitly |
| real | finite JavaScript number | double precision; retain progress/weight behavior |
| integer millisecond total | safe JS integer, can exceed 32 bits | bigint number mode plus safe-integer validation |
| ordinary integer | bounded integer | integer, unless field audit shows larger range |
| text JSON | stored string, parsed by existing application | text initially; no automatic JSONB conversion |
| enum-like text | existing literal union/application validation | text plus matching validation; do not add one-backend-only restrictions |
| day/month/week fields | existing date string and period semantics | same strings/integers; do not apply server-local timezone |

## Current tables

| Export | SQL table |
|---|---|
| `users` | `users` |
| `sessions` | `sessions` |
| `values` | `values` |
| `principles` | `principles` |
| `objectives` | `objectives` |
| `keyResults` | `key_results` |
| `timePeriods` | `time_periods` |
| `timeCommitments` | `time_commitments` |
| `tasks` | `tasks` |
| `taskAttributes` | `task_attributes` |
| `tags` | `tags` |
| `taskTags` | `task_tags` |
| `dailyMetrics` | `daily_metrics` |
| `savedQueries` | `saved_queries` |
| `dashboardWidgets` | `dashboard_widgets` |
| `plugins` | `plugins` |
| `systemConfig` | `system_config` |
| `userAiConfig` | `user_ai_config` |
| `metricsTemplates` | `metrics_templates` |
| `dailyMetricValues` | `daily_metric_values` |
| `objectiveReflections` | `objective_reflections` |
| `friendRequests` | `friend_requests` |
| `friendships` | `friendships` |
| `friendNotes` | `friend_notes` |
| `queryExecutionLogs` | `query_execution_logs` |

## Relationships and constraints

Preserve all declared FK cascade/set-null actions and app-managed links (including objective parent IDs and saved-query IDs). Inventory composite links without primary keys before implementing inserts/deletes. task_tags permits duplicate pairs in the current schema; adding uniqueness is a separate intentional change. objective_reflections index includes nullable month, so multiple null-month rows may exist under SQL uniqueness rules; retain behavior until a separate business requirement changes it. Database ownership columns, friend note privacy, and checks in routes/services remain explicit contract cases.

Keep a reviewed schema inventory of column names, defaults, nullability, codecs, FK targets/actions and indexes for each adapter; compare logical representations in tests. Never infer full parity merely from equal table counts.

## Backup boundary

User backup version 2 carries goals/KRs, periods/tasks/attributes/tag names, fixed/flexible metrics/templates, values/principles, saved queries, widgets, reflections and selected user preferences. Export strips IDs and maps links by name/index. Enumerate exact field coverage in WP07, including scoreLabel and embedded widget references. Installation tables users/sessions, social links/notes, query logs, global config, plugin credentials and AI configuration require native backup or a future explicit converter. Do not silently export secrets to expand user backup coverage.
