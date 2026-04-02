// Third-Party Payer Configuration
// Centralized config for VAC, insurance, and other third-party payer types

export type ThirdPartyPayerType =
  | "private-pay"
  | "blue-cross"
  | "sun-life"
  | "canada-life"
  | "veterans-affairs"
  | "other-third-party";

export const PAYER_TYPE_OPTIONS: { value: ThirdPartyPayerType; label: string }[] = [
  { value: "private-pay", label: "Private Pay" },
  { value: "blue-cross", label: "Blue Cross" },
  { value: "sun-life", label: "Sun Life" },
  { value: "canada-life", label: "Canada Life" },
  { value: "veterans-affairs", label: "Veterans Affairs Canada (VIP)" },
  { value: "other-third-party", label: "Other Third-Party Payer" },
];

export const isThirdPartyPayer = (payer: ThirdPartyPayerType): boolean =>
  payer !== "private-pay";

export const isInsurancePayer = (payer: ThirdPartyPayerType): boolean =>
  ["blue-cross", "sun-life", "canada-life", "other-third-party"].includes(payer);

export const isVACPayer = (payer: ThirdPartyPayerType): boolean =>
  payer === "veterans-affairs";

/** Blue Cross and VAC share the same Veterans Independence Program claim workflow */
export const isVIPClaimPayer = (payer: string | undefined | null): boolean =>
  !!payer && ["blue-cross", "veterans-affairs"].includes(payer);

export const VIP_CLAIM_DEFAULTS = {
  providerNumber: "100146",
  benefitCode: "345503",
} as const;

// VAC static values
export const VAC_STATIC = {
  payerName: "Veterans Affairs Canada",
  payerType: "government",
  programOfChoice: "15",
  providerNumber: "100146",
} as const;

// VAC service types with default benefit codes
export const VAC_SERVICE_TYPES: { value: string; label: string; benefitCode: string }[] = [
  { value: "personal-care", label: "Personal Care", benefitCode: "345503" },
  { value: "social-transportation", label: "Social Transportation", benefitCode: "345506" },
  { value: "health-support", label: "Health & Support", benefitCode: "345501" },
  { value: "intermediate-care", label: "Intermediate Care", benefitCode: "345512" },
];

export const getVACBenefitCode = (serviceType: string): string => {
  const svc = VAC_SERVICE_TYPES.find(s => s.value === serviceType);
  return svc?.benefitCode || "";
};

export const getInsurancePrettyName = (payer: ThirdPartyPayerType): string => {
  const opt = PAYER_TYPE_OPTIONS.find(o => o.value === payer);
  return opt?.label || payer;
};
