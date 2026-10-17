# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A single user: the owner (Petr), a rider with several bikes who maintains them himself. Czech UI. No other audiences are planned.

## Product Purpose

BikeVault is a personal garage logbook: which bikes and components exist, how far each has gone, what service or replacement is due, how each bike is set up, and what it all costs. Success means the owner can trust the numbers and act on them without keeping notes elsewhere.

## Positioning

Three things neighbouring tools (Strava gear, ProBikeGarage) do not combine:
- a clear record of each bike's setup (tyre pressures, suspension settings) that can be read and changed quickly;
- per-component mileage tracking that survives moving parts between bikes and drives service and replacement;
- cost tracking for bikes and parts.

Data lives in the owner's own Google Drive file; there is no BikeVault database.

## Operating Context

- **Desktop at home** (primary): overview, planning service, recording replacements, finances, statistics.
- **Phone out on the trail or at the trailhead**: checking or changing bike setup (tyre pressures, suspension), quick lookups. Short sessions, outdoors, one hand.
- Mileage comes from Strava sync; odometer can also be updated by hand.

## Capabilities and Constraints

- Screens: Garáž, bike detail (components, service, setup, history, finances), Komponenty, Servis (schedules, overdue), Finance, Statistiky, Seznamy, Nastavení.
- Google sign-in, Drive `drive.file` scope only; daily JSON backups to Drive; restore with add-only merge.
- Strava OAuth for mileage; tokens are the only server-side data.
- Light UI only; Czech copy only.

## Evidence on Hand

- Demo data: `src/fixtures/demoVaultData.ts` (used for local previews).
- No users besides the owner, no testimonials or public claims; none should be invented.

## Product Principles

1. Numbers are the content: km, intervals, pressures and costs must be legible and trustworthy at a glance.
2. Setup must be readable in seconds on a phone outdoors.
3. User data is never at risk; every destructive action is explicit and reversible where possible.
4. Dense but ordered: the owner works with lists of parts and records, not marketing.
