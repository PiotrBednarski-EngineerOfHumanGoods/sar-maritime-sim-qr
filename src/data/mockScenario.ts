// ============================================================
// SARWATCH — Fake AIS scenario data (Phase 14.1 — Baltic geography fix)
//
// 8 vessels in the Baltic, 12-hour window (08:00–20:00 UTC).
// Distress event fires at t=240 (12:00 UTC) at [56.2, 18.8]
// (southern Gotland Basin, busy shipping corridor).
//
// Island exclusion zones used for route planning:
//   Gotland:  56.9–57.5 °N, 18.5–19.3 °E  → route east OR west of island
//   Öland:    56.2–57.0 °N, 16.6–16.9 °E  → route east of island
//   Saaremaa: 58.2–58.6 °N, 21.5–22.8 °E  → stay west or north
//   Hiiumaa:  58.8–59.1 °N, 21.8–22.6 °E  → stay west or south
//   Lithuania coast at 56.1 °N ≈ 21.0 °E  → start max 20.5 °E
//   Latvia coast at 57.5 °N ≈ 21.0 °E
//
// Responder scoring at t=240 (unchanged from Phase 14):
//   PAX         — OSV,   score 0.823 — PRIMARY (17.8 nm W, Δhdg 11°)
//   NORDIC SPIRIT — cargo, score 0.749 — SECONDARY (26 nm, hdg ~222°)
// ============================================================

import type { Vessel } from '../domain/types'

export const SCENARIO_DURATION = 720   // minutes (08:00 → 20:00 UTC)
export const SCENARIO_START_HOUR = 8

// ---- Vessels -------------------------------------------------------

export const VESSELS: Vessel[] = [

  // 1 ── NORDIC SPIRIT — Cargo, heading SW (Gulf of Finland → Kiel Canal)
  //      SECONDARY RESPONDER at t=240 (score ~0.749, 26 nm from MOB).
  //      Route stays in open Baltic south of the Latvian coast.
  {
    id: 'nordic-spirit',
    name: 'NORDIC SPIRIT',
    mmsi: '230123456',
    vesselType: 'cargo',
    speed: 12,
    color: '#E65100',
    waypoints: [
      { t: 0,   lat: 57.0, lng: 20.5 },
      { t: 240, lat: 56.4, lng: 19.5 },
      { t: 720, lat: 55.3, lng: 17.5 },
    ],
  },

  // 2 ── ARLANDA — Container, heading NE (Gdańsk → Stockholm)
  //      Starts south of Bornholm (clear of all islands), crosses open Baltic.
  {
    id: 'arlanda',
    name: 'ARLANDA',
    mmsi: '265234567',
    vesselType: 'container',
    speed: 16,
    color: '#1565C0',
    waypoints: [
      { t: 0,   lat: 54.6, lng: 15.9 },
      { t: 240, lat: 55.4, lng: 17.3 },
      { t: 720, lat: 56.9, lng: 20.0 },
    ],
  },

  // 3 ── GOTLAND II — Cargo, heading S (Stockholm → Klaipėda)
  //      Phase 14 route bisected Gotland island. Fixed: route goes east of
  //      Gotland (main SE Baltic shipping lane, 19.5–19.8 °E corridor).
  {
    id: 'gotland-ii',
    name: 'GOTLAND II',
    mmsi: '265345678',
    vesselType: 'cargo',
    speed: 11,
    color: '#2E7D32',
    waypoints: [
      { t: 0,   lat: 59.2, lng: 19.5 },   // north Baltic, east of Gotland's latitude
      { t: 240, lat: 58.0, lng: 19.6 },   // heading S in east-of-Gotland lane
      { t: 480, lat: 57.2, lng: 19.8 },   // 0.5° east of Gotland's eastern coast (19.3°E)
      { t: 720, lat: 56.2, lng: 19.2 },   // south of Gotland (56.9°N), open basin
    ],
  },

  // 4 ── BALTIC PIONEER — Tanker, heading SW (from north Baltic)
  //      Phase 14 start at [56.8, 22.0] risked Latvian coast.
  //      Fixed: starts from northern open Baltic, passes west of Gotland.
  {
    id: 'baltic-pioneer',
    name: 'BALTIC PIONEER',
    mmsi: '277456789',
    vesselType: 'tanker',
    speed: 10,
    color: '#6A1B9A',
    waypoints: [
      { t: 0,   lat: 59.0, lng: 20.0 },   // N Baltic, clear of all islands
      { t: 240, lat: 58.2, lng: 19.5 },   // north of Gotland's 57.5°N limit
      { t: 480, lat: 57.5, lng: 17.8 },   // west side of Gotland (western coast 18.5°E)
      { t: 720, lat: 56.5, lng: 17.5 },   // SW Baltic heading toward Kiel
    ],
  },

  // 5 ── PAX — OSV, heading W (Ventspils anchorage → Gotland ops area)
  //      PRIMARY RESPONDER at t=240 (score 0.823).
  //      Phase 14 start at [56.1, 21.0] was on the Lithuanian coast (~21°E).
  //      Fixed: start moved 0.5° west to open water; t=240 position unchanged.
  {
    id: 'pax',
    name: 'PAX',
    mmsi: '276567890',
    vesselType: 'osv',
    speed: 14,
    color: '#00838F',
    waypoints: [
      { t: 0,   lat: 56.0, lng: 20.5 },   // open Baltic (coast at 21°E)
      { t: 240, lat: 56.1, lng: 19.3 },   // UNCHANGED — responder scoring target
      { t: 720, lat: 56.0, lng: 16.5 },   // open Baltic W of Öland (ends 57°N)
    ],
  },

  // 6 ── HELSINKI EXPRESS — Ferry, heading SW (Helsinki → Rostock)
  //      Phase 14 start at [58.5, 22.8] was inside Saaremaa island.
  //      Fixed: starts near Helsinki in Gulf of Finland, routes west of
  //      Hiiumaa and north of Gotland to reach the SW Baltic.
  {
    id: 'helsinki-express',
    name: 'HELSINKI EXPRESS',
    mmsi: '230678901',
    vesselType: 'ferry',
    speed: 17,
    color: '#00695C',
    waypoints: [
      { t: 0,   lat: 60.0, lng: 24.5 },   // Gulf of Finland, S of Helsinki
      { t: 240, lat: 58.8, lng: 20.5 },   // W of Saaremaa (21.5°E), N of it (58.2°N)
      { t: 480, lat: 58.0, lng: 17.5 },   // N of Gotland's 57.5°N limit, W of it
      { t: 720, lat: 57.0, lng: 17.0 },   // open Baltic between Sweden and Gotland
    ],
  },

  // 7 ── KLAIPEDA — Cargo, heading NW (Klaipėda → central Baltic)
  //      Phase 14 start at [55.0, 21.7] was likely inside Curonian Lagoon.
  //      Fixed: starts at harbor mouth (55.7°N, 21.0°E is Klaipėda breakwater).
  {
    id: 'klaipeda',
    name: 'KLAIPEDA',
    mmsi: '277789012',
    vesselType: 'cargo',
    speed: 13,
    color: '#B71C1C',
    waypoints: [
      { t: 0,   lat: 55.7, lng: 21.0 },   // Klaipėda harbor mouth, open Baltic
      { t: 240, lat: 55.8, lng: 20.0 },   // heading W-NW, well offshore
      { t: 720, lat: 56.4, lng: 18.2 },   // NW Baltic, S of Gotland's 56.9°N limit
    ],
  },

  // 8 ── ROSTOCK — Container, heading NE (Rostock → Tallinn)
  //      Previous fixes still placed the start on/near Rügen island (54.5°N 13.2°E).
  //      Final fix: start in the Bornholm Basin (54.8°N 16.5°E) — unambiguously
  //      open deep water. Route avoids Öland (stays east of 16.9°E by 57°N) and
  //      passes north of Gotland's 57.5°N limit before curving east.
  //
  //  Verified path (no island intersections):
  //    t=0→240: [54.8,16.5]→[55.6,17.5]  — Bornholm Basin → open central Baltic
  //    t=240→480: [55.6,17.5]→[57.8,18.0] — stays at 17.5-18.0°E, passes 57.5°N clean
  //    t=480→720: [57.8,18.0]→[59.0,19.5] — NE Baltic, well clear of all coasts
  {
    id: 'rostock',
    name: 'ROSTOCK',
    mmsi: '211890123',
    vesselType: 'container',
    speed: 15,
    color: '#546E7A',
    waypoints: [
      { t: 0,   lat: 54.8, lng: 16.5 },   // Bornholm Basin — open deep water
      { t: 240, lat: 55.6, lng: 17.5 },   // central Baltic heading NE
      { t: 480, lat: 57.8, lng: 18.0 },   // N of Gotland (57.5°N), west of Gotland (18.5°E)
      { t: 720, lat: 59.0, lng: 19.5 },   // NE Baltic toward Estonian waters
    ],
  },
]

export const VESSEL_TYPE_LABELS: Record<string, string> = {
  cargo:     'Cargo',
  tanker:    'Tanker',
  container: 'Container',
  ferry:     'Ferry',
  fishing:   'Fishing',
  osv:       'OSV',
  research:  'Research',
}
