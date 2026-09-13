import { useEffect, useState } from "react";
import { evaluateServiceArea, type ServiceAreaStatus } from "@/lib/serviceArea";

const UNKNOWN: ServiceAreaStatus = {
  province: null,
  provinceName: null,
  bookable: true,
  comingSoon: false,
  message: null,
};

/**
 * Province-aware service-area status for the address currently entered in a
 * booking flow. Ontario (and any other province an admin has enabled) is
 * bookable; every other Canadian province returns a Coming Soon status.
 */
export const useServiceAreaStatus = (input: {
  postalCode?: string | null;
  province?: string | null;
  addresses?: (string | null | undefined)[];
}): ServiceAreaStatus => {
  const [status, setStatus] = useState<ServiceAreaStatus>(UNKNOWN);
  const key = JSON.stringify([input.postalCode, input.province, input.addresses]);

  useEffect(() => {
    let cancelled = false;
    evaluateServiceArea(input)
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {
        if (!cancelled) setStatus(UNKNOWN);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return status;
};
