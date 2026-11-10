import { z } from "zod";

// features.md Phase 14 (FA-2) — project applications, two-sided.

export const ApplicationStatusSchema = z.enum(["APPLIED", "SHORTLISTED", "SELECTED", "REJECTED", "WITHDRAWN"]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

/** GET /projects — a talent's browse/search view of one open brief, with
 * their own application (if any) inlined so the list and the "have I
 * applied" state never desync into two separate fetches. */
export const ProjectSchema = z.object({
  id: z.string(),
  projectName: z.string(),
  projectType: z.string(),
  nicheReq: z.array(z.string()),
  budget: z.string(),
  budgetAmount: z.number().int(),
  budgetCurrency: z.string(),
  clientName: z.string(),
  applicantCap: z.number().int().nullable(),
  applicationsOpen: z.boolean(),
  applicantCount: z.number().int(),
  postedAt: z.string(),
  myApplication: z
    .object({ id: z.string(), status: ApplicationStatusSchema, pitch: z.string().nullable() })
    .nullable(),
  location: z.string().optional(),
  clientRating: z.number().optional(),
  clientReviews: z.number().optional(),
  description: z.string().optional(),
  timeline: z.string().optional(),
  deliverables: z.array(z.string()).optional(),
  scriptSample: z.string().optional(),
  additionalNotes: z.string().optional(),
  escrowProtected: z.boolean().optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

/** GET /creators/me/applications — PWA-16 status list. */
export const MyApplicationSchema = z.object({
  id: z.string(),
  status: ApplicationStatusSchema,
  pitch: z.string().nullable(),
  createdAt: z.string(),
  brief: z.object({
    id: z.string(),
    projectName: z.string(),
    projectType: z.string(),
    budget: z.string(),
    clientName: z.string(),
  }),
});
export type MyApplication = z.infer<typeof MyApplicationSchema>;

/** GET /briefs/:id/applicants — PWA-17, the client's applicant-management view. */
export const ApplicantSchema = z.object({
  applicationId: z.string(),
  status: ApplicationStatusSchema,
  pitch: z.string().nullable(),
  appliedAt: z.string(),
  creator: z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    location: z.string(),
    avatar: z.string(),
    verified: z.boolean(),
    tags: z.array(z.string()),
    price: z.string(),
  }),
});
export type Applicant = z.infer<typeof ApplicantSchema>;
