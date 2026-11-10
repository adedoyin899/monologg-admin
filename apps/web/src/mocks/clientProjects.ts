import type { ClientProject } from "@monologg/types";

export interface ProjectDetailedInfo {
  description: string;
  timeline: string;
  location: string;
  nicheReq: string[];
  deliverables: string[];
  scriptSample: string;
  additionalNotes: string;
  assets: { name: string; size: string; type: string }[];
  draftStep?: number;
}

export const DEFAULT_PROJECT_DETAILS: Record<string, ProjectDetailedInfo> = {
  "P-001": {
    description:
      "Seeking a commanding, resonant voiceover artist for Nike's Q1 regional multimedia campaign. The project involves recording two 30-second commercial spots celebrating Nigerian grassroots athletics across digital, broadcast, and social channels.",
    timeline: "Auditions close Oct 24 · Studio Recording: Nov 4–6 · Final Deliverables: Nov 12",
    location: "Lagos, NG (Hybrid/Remote)",
    nicheReq: ["VO_ARTIST"],
    deliverables: [
      "2x 30s broadcast WAV master audio files (24-bit / 48kHz)",
      "1x 15s social media cutdown variation",
      "Raw uncompressed vocal stems with room-tone tracks",
      "Full digital & broadcast commercial usage rights for 1 year",
    ],
    scriptSample:
      "Sides / Script Excerpt:\n'They told you impossible is a standard. We tell you it's a starting line. When the whistle blows in Surulere, the world listens. Nike: Just Do It.'",
    additionalNotes:
      "Audition must be recorded with a professional condenser microphone. No reverberant acoustics or background hiss. Authoritative, inspiring, and grounded Nigerian/West African cadence desired.",
    assets: [
      { name: "Nike_Q1_Campaign_Creative_Brief.pdf", size: "2.4 MB", type: "PDF Document" },
      { name: "Brand_Audio_Identity_Guidelines.pdf", size: "1.2 MB", type: "Style Guide" },
      { name: "Reference_Tone_Scratch_Track.wav", size: "14.8 MB", type: "Audio Reference" },
    ],
    draftStep: 4,
  },
  "P-002": {
    description:
      "Seeking an engaging, polished keynote compere / master of ceremonies for a high-profile 2-day technological innovation summit holding at the International Conference Centre, Abuja.",
    timeline: "Event Dates: Nov 18–19 · Rehearsal / Briefing: Nov 17",
    location: "Abuja, NG (On-site)",
    nicheReq: ["COMPERE", "SPEAKER_PASTOR"],
    deliverables: [
      "Live stage moderation for 12 panel sessions across 2 days",
      "Speaker introductions and audience engagement activities",
      "Strict adherence to event run-of-show schedule",
    ],
    scriptSample:
      "Opening Keynote Excerpt:\n'Distinguished guests, founders, and innovators from across the continent: welcome to the Nexus 2026 Summit. Today we don't just discuss the future—we build it.'",
    additionalNotes:
      "Sharp stage presence, fluent English diction (bilingual French is an added advantage), and executive corporate composure required.",
    assets: [
      { name: "Nexus_Summit_Run_of_Show.pdf", size: "3.1 MB", type: "Schedule & Brief" },
      { name: "Speaker_Bios_and_Protocols.pdf", size: "1.8 MB", type: "Reference" },
    ],
  },
  "P-003": {
    description:
      "Production of an audio commercial spot introducing an instant multi-currency diaspora remittance wallet for West Africa. Looking for a warm, trustworthy narrator.",
    timeline: "Draft Brief · Audition window opens immediately upon publishing",
    location: "Remote (Online)",
    nicheReq: ["VO_ARTIST"],
    deliverables: [
      "1x 45s radio broadcast commercial (master WAV)",
      "2x 15s digital bumper cuts for social advertising",
      "Full radio & broadcast buyout rights for 12 months",
    ],
    scriptSample:
      "Sides / Script Excerpt:\n'Sending money back home should feel like love, not a headache. Fast. Zero hidden fees. Direct to any bank in seconds.'",
    additionalNotes:
      "Warm, conversational, modern Nigerian vocal cadence. Broadcast acoustics required.",
    assets: [
      { name: "Fintech_Radio_Ad_Copy.pdf", size: "950 KB", type: "Script Document" },
    ],
    draftStep: 3,
  },
  "P-004": {
    description:
      "Casting for lead dramatic and supporting ensemble roles in an upcoming feature film produced by General Casting Co. Actors must be capable of intense emotional range.",
    timeline: "Auditions closed · Callbacks: Feb 2–5 · Principal Photography: March 2025",
    location: "Lagos, NG (On-set)",
    nicheReq: ["ACTOR"],
    deliverables: [
      "Full table reads and rehearsal attendance in Lagos",
      "12 shoot days on-set in Lagos",
      "Post-production ADR vocal dubbing if required",
    ],
    scriptSample:
      "Sides / Script Excerpt:\n'You think this town forgot what happened? I didn't forget. Every shadow on Marina road remembers your name, Femi. Look at me and say it was worth it.'",
    additionalNotes:
      "Prior Nollywood or stage drama experience preferred. Monologue sides will be provided to shortlisted applicants.",
    assets: [
      { name: "Scene_3_Monologue_Sides.pdf", size: "1.4 MB", type: "Sides" },
      { name: "Character_Breakdown_Marina_Road.pdf", size: "2.8 MB", type: "Character Guide" },
    ],
  },
};

export function getProjectDetails(project: ClientProject): ProjectDetailedInfo {
  if (DEFAULT_PROJECT_DETAILS[project.id]) {
    return DEFAULT_PROJECT_DETAILS[project.id]!;
  }
  return {
    description: project.description || `Looking for professional ${project.niche || "performing arts"} performers for ${project.name}. Requires high quality deliverables and prompt communication.`,
    timeline: project.timeline || "Audition window opens upon publishing · Flexible schedule",
    location: project.location || (project.projectFormat === "onsite" ? (project.venueLocation || "Lagos, NG (On-site)") : "Remote (Online)"),
    nicheReq: project.selectedNiches || (project.niche ? [project.niche.toUpperCase().replace(/\s+/g, "_")] : ["VO_ARTIST"]),
    deliverables: [
      "Principal rehearsal and recorded takes",
      "Digital delivery of master files",
      "Standard platform usage rights",
    ],
    scriptSample: project.scriptSample || "Sides / Script Excerpt:\n'Audition sample script excerpt to be provided upon applicant selection.'",
    additionalNotes: project.additionalNotes || "Professional quality recording environment required.",
    assets: project.assets || [],
    draftStep: project.draftStep,
  };
}

export const CLIENT_PROJECTS: ClientProject[] = [
  { id: "P-001", name: "Nike Q1 Campaign", niche: "Voice-Over", budget: "₦200,000", status: "active", applicants: 8, applicantCap: 10, applicationsOpen: true, posted: "Dec 14", draftStep: 4 },
  { id: "P-002", name: "Tech Summit Compere", niche: "Compere", budget: "₦120,000", status: "in_review", applicants: 3, applicantCap: null, applicationsOpen: true, posted: "Dec 10" },
  { id: "P-003", name: "Fintech Radio Ads", niche: "Voice-Over", budget: "₦80,000", status: "draft", applicants: 0, applicantCap: null, applicationsOpen: true, posted: "Dec 8", draftStep: 3 },
  { id: "P-004", name: "Film Auditions Jan 2025", niche: "Actor", budget: "₦500,000", status: "active", applicants: 21, applicantCap: 20, applicationsOpen: false, posted: "Dec 5" },
];
