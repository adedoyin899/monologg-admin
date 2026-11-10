import type { KycProvider } from "./kyc.interface.js";

// Real KycProvider — Smile Identity implementation.
// TODO Phase 7: implement Smile Identity API calls.
//   - startCheck: POST https://testapi.smileidentity.com/v1/id_verification
//   - getStatus:  GET the job result using the job_id
// X3: This is identity verification ONLY. Never write to Creator.styleTags from here.

export const realKycProvider: KycProvider = {
  async startCheck(_creatorId, _data) {
    throw new Error("[kyc.real] Smile Identity integration not yet implemented — Phase 7.");
  },

  async getStatus(_ref) {
    throw new Error("[kyc.real] Smile Identity status check not yet implemented — Phase 7.");
  },
};
