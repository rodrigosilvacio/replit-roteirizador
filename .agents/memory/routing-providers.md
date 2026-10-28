---
name: Routing provider constraints
description: Public routing service choice and reliability boundaries for the initial planner
---
Use public map services only as an initial low-volume solution; do not promise live traffic or guaranteed availability.

**Why:** The first version avoids requiring credentials. On 2026-10-28 router.osrm.org redirected to an unrelated domain, while the OpenStreetMap Germany car-routing service returned valid OSRM routes.

**How to apply:** Recheck provider availability and terms before increasing traffic or offering reliability guarantees; do not switch back to a familiar demo hostname without verifying its response.

Optimization must compare complete original and candidate routes before claiming savings, not just sums from the directed time matrix.

**Why:** Pairwise times can differ from a full route because of maneuver and waypoint handling; shorter matrix cost alone does not guarantee a faster final itinerary.

**How to apply:** Keep the original order whenever the candidate's fully calculated duration is not lower. Time optimization may increase distance; do not label that increase as distance savings.
