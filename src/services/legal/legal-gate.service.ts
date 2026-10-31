import {
  getLegalComplianceStatus,
} from "./legal-compliance.service";

export async function needsLegalAcceptance(
  studioId: string,
): Promise<boolean> {
  const response =
    await getLegalComplianceStatus(studioId);

  if (!response.success) {
    throw new Error(
      "Unable to check legal compliance",
    );
  }

  return !response.compliant;
}
