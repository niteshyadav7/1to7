# Autonomous Rule: Always Log Production Issues & Interview Case Studies

## Trigger Condition
Whenever you debug, audit, investigate, or resolve any:
- Bug, runtime crash, or edge case (client-side or server-side)
- Production scaling or performance bottleneck (e.g. query limits, caching, pagination)
- Database issue (PostgreSQL, Supabase, PostgREST, triggers, indexes, sequences)
- User discrepancy / missing data reports
- Business workflow or architecture implementation (e.g. payments, ghosting, OAuth, RBAC)

## Mandatory Action (DO NOT WAIT FOR USER TO ASK)
You must ALWAYS automatically append the case study to:
`problems/PRODUCTION_INTERVIEW_CASE_STUDIES.txt`

## Required Structure:
Each entry must follow this exact format:
- CASE N: <Title>
- CATEGORIES: <e.g., Backend / PostgreSQL / Performance / UX>
- INTERVIEW QUESTION: <"Tell me about a time when...">
- [SITUATION]: Exact production scenario and symptom observed.
- [ROOT CAUSE]: Deep technical root cause (SQL queries, limits, type casting, concurrency, etc.).
- [SOLUTION & ARCHITECTURE]: Code changes, schema updates, and architecture implemented.
- [INTERVIEW STAR TAKEAWAY]: Concise STAR summary (Situation, Task, Action, Result) for job interviews.

Also update the INDEX list at the top of `problems/PRODUCTION_INTERVIEW_CASE_STUDIES.txt`.
