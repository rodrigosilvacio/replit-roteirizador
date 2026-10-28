---
name: Routing provider constraints
description: Public routing service choice and reliability boundaries for the initial planner
---
Use public map services only as an initial low-volume solution; do not promise live traffic or guaranteed availability.

**Why:** The first version avoids requiring credentials. On 2026-10-28 router.osrm.org redirected to an unrelated domain, while the OpenStreetMap Germany car-routing service returned valid OSRM routes.

**How to apply:** Recheck provider availability and terms before increasing traffic or offering reliability guarantees; do not switch back to a familiar demo hostname without verifying its response.
