/**
 * wtsApi.js
 * -----------------------------------------------------------------------
 * All network calls for the phase-label (custom naming) feature live
 * here, separate from WtsDashboard.jsx. WtsDashboard.jsx only imports
 * and calls these functions — it never calls fetch() directly for
 * this feature.
 *
 * Every function returns a plain JS value/throws on failure; none of
 * them touch React state — that stays in WtsDashboard.jsx.
 * -----------------------------------------------------------------------
 */

import IP_ADDRESS from '../services/ipconfig';

const BACKEND_URL = IP_ADDRESS;

/**
 * GET /api/phase-labels?serial_no=...
 * Returns a map of every phase code -> its display name for this
 * device, e.g. { R1: "Boiler Inlet", Y1: "Y1", ... }.
 * Phases that were never renamed come back as their own raw code.
 */
export async function fetchPhaseLabels(serialNo) {
  const res = await fetch(
    `${BACKEND_URL}/api/phase-labels?serial_no=${encodeURIComponent(serialNo)}`
  );
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || `Failed to fetch phase labels (status ${res.status})`);
  }
  return data; // { R1: "...", Y1: "...", ... }
}

/**
 * POST /api/phase-labels
 * Renames a single phase for one device.
 */
export async function updatePhaseLabel(serialNo, phaseCode, customLabel) {
  const res = await fetch(`${BACKEND_URL}/api/phase-labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serial_no: serialNo,
      phase_code: phaseCode,
      custom_label: customLabel,
    }),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || `Failed to update phase label (status ${res.status})`);
  }
  return data; // { success, serial_no, phase_code, custom_label }
}

/**
 * POST /api/phase-labels/bulk
 * Renames several phases for one device at once.
 * `labels` looks like { R1: "Boiler Inlet", Y1: "Boiler Outlet" }.
 */
export async function updatePhaseLabelsBulk(serialNo, labels) {
  const res = await fetch(`${BACKEND_URL}/api/phase-labels/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serial_no: serialNo,
      labels,
    }),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || `Failed to update phase labels (status ${res.status})`);
  }
  return data; // { success, serial_no, labels }
}

/**
 * DELETE /api/phase-labels?serial_no=...&phase_code=...
 * Clears a custom name so the phase falls back to its raw code
 * (e.g. "R1") again.
 */
export async function resetPhaseLabel(serialNo, phaseCode) {
  const res = await fetch(
    `${BACKEND_URL}/api/phase-labels?serial_no=${encodeURIComponent(
      serialNo
    )}&phase_code=${encodeURIComponent(phaseCode)}`,
    { method: 'DELETE' }
  );
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || `Failed to reset phase label (status ${res.status})`);
  }
  return data; // { success, serial_no, phase_code, custom_label }
}