/**
 * useLivePricing – Fetches pricing rules live from Supabase.
 * Sources of truth:
 *   • service_tasks  → task base_cost, included_minutes, service_category, apply_hst
 *   • pricing_configs → grace_minutes, billing_block_minutes, overtime_rate_percent,
 *                       minimum_booking_fee, hospital/doctor fees
 *
 * calculateBookingPrice() implements the admin rule:
 *   base_minutes = 60 (standard) or 90 (hospital-discharge)
 *   If selected_minutes <= base_minutes + grace_minutes → total = base_cost (1 hr)
 *   Else → total = base_cost + ceil(overage / block) * (block/60) * base_cost * (rate%/100)
 *   HST applied per-task flag.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveTask {
  id: string;
  name: string;
  baseCost: number;
  includedMinutes: number;
  isHospitalDoctor: boolean;
  serviceCategory: string;
  requiresDischargeUpload: boolean;
  applyHST: boolean;
}

export interface LivePricingConfig {
  minimumBookingFee: number;
  gracePeriodMinutes: number;     // from overtime_block_minutes in DB actually named differently — see below
  billingBlockMinutes: number;
  overtimeRatePercent: number;    // 50 = 50% of base hourly rate
  standardBaseMinutes: number;    // 60 for standard
  hospitalBaseMinutes: number;    // 90 for hospital-discharge
  hospitalDischargeFee: number;
  doctorVisitFee: number;
}

export interface BookingPriceResult {
  baseMinutes: number;            // which base was used (60 or 90)
  selectedMinutes: number;        // total included_minutes for selected tasks
  baseCost: number;               // weighted average baseCost of selected tasks
  baseCharge: number;             // baseCost * 1 (base hour)
  overtimeBlocks: number;
  overtimeCharge: number;
  hstAmount: number;
  subtotal: number;               // baseCharge + overtimeCharge (before HST)
  total: number;                  // subtotal + hstAmount
  isMinimumFeeApplied: boolean;
  surgeAmount: number;
  grandTotal: number;             // total + surge
}

const GRACE_PERIOD_MINUTES = 14; // Admin says 14 min grace — from UI, not in pricing_configs currently

export const useLivePricing = () => {
  const [tasks, setTasks] = useState<LiveTask[]>([]);
  const [config, setConfig] = useState<LivePricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPricing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch in parallel
      const [tasksRes, configRes] = await Promise.all([
        supabase
          .from("service_tasks")
          .select("id, task_name, base_cost, included_minutes, is_hospital_doctor, service_category, requires_discharge_upload, apply_hst")
          .eq("is_active", true)
          .order("task_name"),
        supabase
          .from("pricing_configs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (configRes.error) throw configRes.error;

      const liveTasks: LiveTask[] = (tasksRes.data || []).map((row) => ({
        id: row.id,
        name: row.task_name,
        baseCost: Number(row.base_cost),
        includedMinutes: Number(row.included_minutes),
        isHospitalDoctor: row.is_hospital_doctor,
        serviceCategory: row.service_category,
        requiresDischargeUpload: row.requires_discharge_upload,
        applyHST: row.apply_hst,
      }));

      const dbCfg = configRes.data;
      const liveConfig: LivePricingConfig = {
        minimumBookingFee: dbCfg ? Number(dbCfg.minimum_booking_fee) : 25,
        gracePeriodMinutes: GRACE_PERIOD_MINUTES, // 14 min grace — admin UI setting not yet in pricing_configs
        billingBlockMinutes: dbCfg ? Number(dbCfg.overtime_block_minutes) : 15,
        overtimeRatePercent: 50,  // admin UI shows 50% — not yet a DB column; use constant
        standardBaseMinutes: 60,
        hospitalBaseMinutes: 90,
        hospitalDischargeFee: dbCfg ? Number(dbCfg.hospital_discharge_fee) : 75,
        doctorVisitFee: dbCfg ? Number(dbCfg.doctor_visit_fee) : 55,
      };

      console.log("[useLivePricing] Fetched tasks:", liveTasks);
      console.log("[useLivePricing] Fetched config:", liveConfig);

      setTasks(liveTasks);
      setConfig(liveConfig);
    } catch (err) {
      console.error("[useLivePricing] Error fetching pricing:", err);
      setError(err instanceof Error ? err.message : "Failed to load pricing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  /**
   * Calculate booking price from selected task IDs + optional surge multiplier.
   */
  const calculateBookingPrice = useCallback(
    (selectedTaskIds: string[], surgeMultiplier = 1): BookingPriceResult | null => {
      if (!config || selectedTaskIds.length === 0) return null;

      const selectedTasks = selectedTaskIds
        .map((id) => tasks.find((t) => t.id === id))
        .filter(Boolean) as LiveTask[];

      if (selectedTasks.length === 0) return null;

      // Determine service category
      const hasHospitalDischarge = selectedTasks.some((t) => t.serviceCategory === "hospital-discharge");
      const hasDoctorAppointment = selectedTasks.some((t) => t.serviceCategory === "doctor-appointment" || t.isHospitalDoctor);

      // Base minutes per category
      const baseMinutes = hasHospitalDischarge
        ? config.hospitalBaseMinutes
        : config.standardBaseMinutes;

      // Sum included_minutes of selected tasks
      const selectedMinutes = selectedTasks.reduce((sum, t) => sum + t.includedMinutes, 0);

      // Weighted average base cost (= hourly rate)
      const avgBaseCost =
        selectedTasks.reduce((sum, t) => sum + t.baseCost, 0) / selectedTasks.length;

      // Override for hospital/doctor services
      let baseCost = avgBaseCost;
      if (hasHospitalDischarge) {
        baseCost = Math.max(avgBaseCost, config.hospitalDischargeFee);
      } else if (hasDoctorAppointment) {
        baseCost = Math.max(avgBaseCost, config.doctorVisitFee);
      }

      // Base charge = 1 hour minimum
      const baseCharge = baseCost; // 1 hour

      // Determine billable minutes
      const effectiveSelectedMinutes = Math.max(selectedMinutes, baseMinutes);
      const graceThreshold = baseMinutes + config.gracePeriodMinutes;

      let overtimeBlocks = 0;
      let overtimeCharge = 0;

      if (effectiveSelectedMinutes > graceThreshold) {
        const overageMinutes = effectiveSelectedMinutes - baseMinutes;
        overtimeBlocks = Math.ceil(overageMinutes / config.billingBlockMinutes);
        const ratePerBlock =
          (baseCost * (config.overtimeRatePercent / 100)) *
          (config.billingBlockMinutes / 60);
        overtimeCharge = overtimeBlocks * ratePerBlock;
      }

      // HST: apply only if ALL selected tasks are taxable (conservative)
      // Actually: apply HST if ANY task is taxable (correct interpretation)
      const anyHST = selectedTasks.some((t) => t.applyHST);
      const subtotal = baseCharge + overtimeCharge;
      const hstAmount = anyHST ? subtotal * 0.13 : 0;
      let total = subtotal + hstAmount;

      // Minimum booking fee
      const isMinimumFeeApplied = total < config.minimumBookingFee;
      if (isMinimumFeeApplied) {
        total = config.minimumBookingFee;
      }

      const surgeAmount = subtotal * (surgeMultiplier - 1);
      const grandTotal = total + surgeAmount;

      console.log("[useLivePricing] calculateBookingPrice:", {
        selectedTaskIds,
        selectedMinutes,
        baseMinutes,
        graceThreshold,
        effectiveSelectedMinutes,
        baseCost,
        baseCharge,
        overtimeBlocks,
        overtimeCharge,
        anyHST,
        hstAmount,
        subtotal,
        total,
        surgeAmount,
        grandTotal,
      });

      return {
        baseMinutes,
        selectedMinutes: effectiveSelectedMinutes,
        baseCost,
        baseCharge,
        overtimeBlocks,
        overtimeCharge,
        hstAmount,
        subtotal,
        total,
        isMinimumFeeApplied,
        surgeAmount,
        grandTotal,
      };
    },
    [tasks, config]
  );

  return { tasks, config, loading, error, calculateBookingPrice, refetch: fetchPricing };
};
