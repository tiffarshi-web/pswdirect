/**
 * Worker province scoping.
 *
 * Two distinct concepts, deliberately kept apart:
 *
 *  1. REVIEW VISIBILITY (broad) — which province's admin review / applicant /
 *     oversight lists a worker shows up in. A worker appears when their own
 *     profile province matches OR they hold any authorization record (even a
 *     pending one) for that province. Being visible says nothing about being
 *     assignable.
 *
 *  2. JOB ELIGIBILITY (strict) — whether a worker may be offered or assigned a
 *     job in a province. This requires an approved, active profile AND a
 *     verified, job-eligible, unexpired authorization for that exact province
 *     and provider type. A matching profile province NEVER grants eligibility
 *     on its own. The database enforces the same rule on every assignment.
 */
import { supabase } from "@/integrations/supabase/client";

export interface WorkerAuthorizationRow {
  psw_profile_id: string;
  province: string;
  provider_type: string;
  verification_status: string;
  job_eligible: boolean;
  expires_at: string | null;
  registration_number?: string | null;
  restrictions?: string | null;
  verified_at?: string | null;
}

export interface WorkerAuthorizationIndex {
  /** Every province each worker has any authorization record for. */
  provincesByWorker: Map<string, Set<string>>;
  /** Worker ids that are verified + job-eligible per province. */
  eligibleByProvince: Map<string, Set<string>>;
  /** All authorization rows keyed by worker id. */
  rowsByWorker: Map<string, WorkerAuthorizationRow[]>;
}

const emptyIndex = (): WorkerAuthorizationIndex => ({
  provincesByWorker: new Map(),
  eligibleByProvince: new Map(),
  rowsByWorker: new Map(),
});

const isActiveRow = (row: WorkerAuthorizationRow, now = new Date()): boolean => {
  if (row.verification_status !== "verified") return false;
  if (!row.job_eligible) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() < now.getTime()) return false;
  return true;
};

/** Loads every provincial authorization and indexes it for the admin screens. */
export const fetchWorkerAuthorizations = async (): Promise<WorkerAuthorizationIndex> => {
  const index = emptyIndex();
  const { data, error } = await supabase
    .from("provider_provincial_authorizations")
    .select(
      "psw_profile_id, province, provider_type, verification_status, job_eligible, expires_at, registration_number, restrictions, verified_at",
    );
  if (error || !data) return index;

  for (const raw of data as unknown as WorkerAuthorizationRow[]) {
    const workerId = raw.psw_profile_id;
    const province = (raw.province || "").toUpperCase();
    if (!workerId || !province) continue;

    if (!index.provincesByWorker.has(workerId)) index.provincesByWorker.set(workerId, new Set());
    index.provincesByWorker.get(workerId)!.add(province);

    if (!index.rowsByWorker.has(workerId)) index.rowsByWorker.set(workerId, []);
    index.rowsByWorker.get(workerId)!.push(raw);

    if (isActiveRow(raw)) {
      if (!index.eligibleByProvince.has(province)) index.eligibleByProvince.set(province, new Set());
      index.eligibleByProvince.get(province)!.add(workerId);
    }
  }
  return index;
};

/**
 * REVIEW VISIBILITY. True when this worker belongs in the selected province's
 * admin lists — either their profile province matches, or they hold any
 * authorization record (pending included) for that province.
 */
export const workerVisibleInProvince = (
  worker: { id?: string | null; province?: string | null },
  selectedProvince: string | null,
  index?: WorkerAuthorizationIndex | null,
): boolean => {
  if (!selectedProvince) return true; // "All provinces"
  const target = selectedProvince.toUpperCase();
  const own = (worker.province || "").trim().toUpperCase();
  if (own && own === target) return true;
  if (!worker.id || !index) return false;
  return index.provincesByWorker.get(worker.id)?.has(target) ?? false;
};

/**
 * JOB ELIGIBILITY. True only when the worker holds a verified, job-eligible,
 * unexpired authorization for this exact province. Profile province alone is
 * never sufficient.
 */
export const workerEligibleInProvince = (
  workerId: string | null | undefined,
  province: string | null | undefined,
  index?: WorkerAuthorizationIndex | null,
): boolean => {
  if (!workerId || !province || !index) return false;
  return index.eligibleByProvince.get(province.toUpperCase())?.has(workerId) ?? false;
};

/** The authorization rows a worker holds, newest province first. */
export const workerAuthorizationsFor = (
  workerId: string | null | undefined,
  index?: WorkerAuthorizationIndex | null,
): WorkerAuthorizationRow[] => {
  if (!workerId || !index) return [];
  return [...(index.rowsByWorker.get(workerId) ?? [])].sort((a, b) =>
    a.province.localeCompare(b.province),
  );
};

/** Human label for one authorization's review state. */
export const authorizationStatusLabel = (row: WorkerAuthorizationRow): string => {
  if (isActiveRow(row)) return "Verified";
  if (row.verification_status === "verified" && !row.job_eligible) return "Verified (not job-eligible)";
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return "Expired";
  switch (row.verification_status) {
    case "pending":
      return "Awaiting verification";
    case "rejected":
      return "Rejected";
    case "restricted":
      return "Restricted";
    case "expired":
      return "Expired";
    default:
      return row.verification_status;
  }
};

export const isAuthorizationRowActive = isActiveRow;

export interface EligibleWorkerOption {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  pswNumber: string | null;
  city: string;
  email: string | null;
  providerType: string;
}

/**
 * JOB ELIGIBILITY list for a province. Only approved, active workers holding a
 * verified, job-eligible, unexpired authorization for that province are
 * returned — this mirrors the database assignment guard exactly.
 */
export const fetchEligibleWorkersForProvince = async (
  province: string,
  opts?: { providerType?: string | null; includeTest?: boolean },
): Promise<EligibleWorkerOption[]> => {
  const target = (province || "ON").toUpperCase();
  const today = new Date().toISOString().slice(0, 10);

  let q = supabase
    .from("provider_provincial_authorizations")
    .select(
      "psw_profile_id, provider_type, expires_at, psw_profiles!inner(id, psw_number, first_name, last_name, home_city, email, vetting_status, lifecycle_status, is_test)",
    )
    .eq("province", target)
    .eq("verification_status", "verified")
    .eq("job_eligible", true);
  if (opts?.providerType) q = q.eq("provider_type", opts.providerType.toUpperCase());

  const { data, error } = await q;
  if (error || !data) return [];

  const out: EligibleWorkerOption[] = [];
  for (const raw of data as unknown as Array<Record<string, any>>) {
    if (raw.expires_at && raw.expires_at < today) continue;
    const p = raw.psw_profiles;
    if (!p) continue;
    if (p.vetting_status !== "approved") continue;
    if ((p.lifecycle_status ?? "active") !== "active") continue;
    if (!opts?.includeTest && p.is_test) continue;
    if (out.some((o) => o.id === p.id)) continue;
    out.push({
      id: p.id,
      firstName: p.first_name ?? "",
      lastName: p.last_name ?? "",
      name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
      pswNumber: p.psw_number ?? null,
      city: p.home_city || "Unknown",
      email: p.email ?? null,
      providerType: raw.provider_type,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
};
