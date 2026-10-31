import { photoosRequest } from "../api/photoos-api";
import {
  getStorageItem,
  setStorageItem,
} from "../../storage/platform-storage";

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

const STORAGE_KEY_LEGAL_ACCEPTED = "@photoos_client_legal_accepted";

const DEFAULT_AGREEMENTS_EN: LegalAgreement[] = [
  {
    id: "legal_tos_v2",
    agreement_type: "terms_of_service",
    version: "2.1",
    language: "en",
    title: "Terms of Service",
    content: "By using PhotoOS, you agree to access, browse, and download event photography respectfully in accordance with platform policies.",
  },
  {
    id: "legal_pp_v2",
    agreement_type: "privacy_policy",
    version: "2.1",
    language: "en",
    title: "Privacy & Biometric AI Consent",
    content: "PhotoOS adheres strictly to DPDP Act regulations. Your facial biometric descriptors are computed locally or transiently and used solely for matching photos in your authorized event galleries.",
  },
  {
    id: "legal_pa_v2",
    agreement_type: "platform_agreement",
    version: "2.1",
    language: "en",
    title: "Platform Client Agreement",
    content: "Ensures secure private access to event galleries, high-resolution downloads, and seamless communication with participating photo studios.",
  },
];

export async function getLegalAgreements(
  language: "en" | "mr" = "en",
): Promise<LegalAgreementsResponse> {
  try {
    const res = await photoosRequest<LegalAgreementsResponse>(
      "legal-compliance",
      {
        method: "POST",
        body: JSON.stringify({
          action: "agreements",
          language,
        }),
      },
    );
    if (res?.agreements && res.agreements.length > 0) {
      return res;
    }
  } catch (err) {
    console.log("[LegalCompliance] Using default offline agreements:", err);
  }

  return {
    success: true,
    agreements: DEFAULT_AGREEMENTS_EN,
  };
}

export async function getLegalComplianceStatus(
  studioId: string,
): Promise<LegalComplianceStatusResponse> {
  if (!studioId.trim()) {
    throw new Error("Studio ID is required");
  }

  try {
    return await photoosRequest<LegalComplianceStatusResponse>(
      "legal-compliance",
      {
        method: "POST",
        body: JSON.stringify({
          action: "status",
          studioId,
        }),
      },
    );
  } catch {
    return {
      success: true,
      compliant: true,
      compliance: {
        compliant: true,
      },
    };
  }
}

export async function acceptLegalAgreements(
  studioId: string,
): Promise<LegalAcceptResponse> {
  if (!studioId.trim()) {
    throw new Error("Studio ID is required");
  }

  try {
    return await photoosRequest<LegalAcceptResponse>(
      "legal-compliance",
      {
        method: "POST",
        body: JSON.stringify({
          action: "accept",
          studioId,
        }),
      },
    );
  } catch {
    return {
      success: true,
      accepted: true,
      compliance: {
        compliant: true,
      },
    };
  }
}

export async function getClientLegalComplianceStatus(): Promise<LegalComplianceStatusResponse> {
  try {
    const locallyAccepted = await getStorageItem(STORAGE_KEY_LEGAL_ACCEPTED);
    if (locallyAccepted === "true") {
      return {
        success: true,
        compliant: true,
        compliance: {
          compliant: true,
        },
      };
    }

    const res = await photoosRequest<LegalComplianceStatusResponse>(
      "legal-compliance",
      {
        method: "POST",
        body: JSON.stringify({
          action: "client_status",
        }),
      },
    );

    if (res?.compliant) {
      await setStorageItem(STORAGE_KEY_LEGAL_ACCEPTED, "true");
    }

    return res;
  } catch {
    // If offline or no auth token, check local storage
    const locallyAccepted = await getStorageItem(STORAGE_KEY_LEGAL_ACCEPTED);
    const isCompliant = locallyAccepted === "true";

    return {
      success: true,
      compliant: isCompliant,
      compliance: {
        compliant: isCompliant,
      },
    };
  }
}

export async function acceptClientLegalAgreements(): Promise<LegalAcceptResponse> {
  // Always mark accepted locally first
  await setStorageItem(STORAGE_KEY_LEGAL_ACCEPTED, "true");

  try {
    await photoosRequest<LegalAcceptResponse>(
      "legal-compliance",
      {
        method: "POST",
        body: JSON.stringify({
          action: "client_accept",
        }),
      },
    );
  } catch (err) {
    console.log("[LegalCompliance] Saved acceptance locally (backend offline):", err);
  }

  return {
    success: true,
    accepted: true,
    compliance: {
      compliant: true,
    },
  };
}

