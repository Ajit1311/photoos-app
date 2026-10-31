import { photoosRequest } from "../api/photoos-api";

export type LegalAgreementType =
  | "terms_of_service"
  | "privacy_policy"
  | "platform_agreement";

export interface LegalAgreement {
  id: string;
  agreement_type: LegalAgreementType;
  version: string;
  language: string;
  title?: string;
  content?: string;
  effective_at?: string;
}

export interface LegalAgreementsResponse {
  success: boolean;
  agreements: LegalAgreement[];
}

export interface LegalComplianceStatus {
  compliant: boolean;
  requires_reacceptance?: boolean;
  agreements?: Array<{
    agreement_type: LegalAgreementType;
    accepted: boolean;
    version?: string;
  }>;
}

export interface LegalComplianceStatusResponse {
  success: boolean;
  compliant: boolean;
  requires_reacceptance?: boolean;
  compliance?: LegalComplianceStatus;
}

export interface LegalAcceptResponse {
  success: boolean;
  accepted: boolean;
  compliance?: LegalComplianceStatus;
}

export async function getLegalAgreements(
  language: "en" | "mr" = "en",
): Promise<LegalAgreementsResponse> {
  return photoosRequest<LegalAgreementsResponse>(
    "legal-compliance",
    {
      method: "POST",
      body: JSON.stringify({
        action: "agreements",
        language,
      }),
    },
  );
}

export async function getLegalComplianceStatus(
  studioId: string,
): Promise<LegalComplianceStatusResponse> {
  if (!studioId.trim()) {
    throw new Error("Studio ID is required");
  }

  return photoosRequest<LegalComplianceStatusResponse>(
    "legal-compliance",
    {
      method: "POST",
      body: JSON.stringify({
        action: "status",
        studioId,
      }),
    },
  );
}

export async function acceptLegalAgreements(
  studioId: string,
): Promise<LegalAcceptResponse> {
  if (!studioId.trim()) {
    throw new Error("Studio ID is required");
  }

  return photoosRequest<LegalAcceptResponse>(
    "legal-compliance",
    {
      method: "POST",
      body: JSON.stringify({
        action: "accept",
        studioId,
      }),
    },
  );
}

export async function getClientLegalComplianceStatus(): Promise<LegalComplianceStatusResponse> {
  return photoosRequest<LegalComplianceStatusResponse>(
    "legal-compliance",
    {
      method: "POST",
      body: JSON.stringify({
        action: "client_status",
      }),
    },
  );
}

export async function acceptClientLegalAgreements(): Promise<LegalAcceptResponse> {
  return photoosRequest<LegalAcceptResponse>(
    "legal-compliance",
    {
      method: "POST",
      body: JSON.stringify({
        action: "client_accept",
      }),
    },
  );
}

