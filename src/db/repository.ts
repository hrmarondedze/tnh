import { db } from "./index.ts";
import {
  users,
  organisations,
  organisationMemberships,
  posts,
  postInteractions,
  postComments,
  socialRelationships,
  portfolioItems,
  passportRecords,
  privateDocuments,
  opportunities,
  applications,
  placements,
  messages,
  notifications,
  reports,
  auditEvents,
} from "./schema.ts";
import { eq, and, or, desc, inArray } from "drizzle-orm";
import { CURATED_CAREER_PATHWAYS } from "./seed.ts";

export function sanitizeText(input: unknown, maxLen = 2000): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLen);
}

export async function logAudit(
  actorUserId: number | null,
  actorName: string,
  actionType: string,
  entityType: string,
  entityId: number,
  summary: string
) {
  try {
    await db.insert(auditEvents).values({
      actorUserId,
      actorName,
      actionType,
      entityType,
      entityId,
      summary,
    });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}

export async function createNotification(
  userId: number,
  category: string,
  title: string,
  body: string,
  linkTab = "home"
) {
  try {
    await db.insert(notifications).values({
      userId,
      category,
      title,
      body,
      linkTab,
      isRead: false,
    });
  } catch (error) {
    console.error("Notification creation failed:", error);
  }
}

// Compute member's confirmed practical hours and assessed skills strictly from verified Passport records
// (Never from likes, followers, or self-declared answers)
export async function computeMemberVerifiedMetrics(userId: number) {
  try {
    const records = await db
      .select()
      .from(passportRecords)
      .where(eq(passportRecords.userId, userId))
      .orderBy(desc(passportRecords.createdAt));

    let confirmedPracticalHours = 0;
    const assessedSkillsSet = new Set<string>();
    const selfDeclaredSkillsSet = new Set<string>();

    for (const rec of records) {
      const isVerified =
        rec.evidenceStatus === "Confirmed by an authorised organisation representative" ||
        rec.evidenceStatus === "Institution-issued credential";

      if (isVerified) {
        if (rec.confirmedHours > 0) {
          confirmedPracticalHours += rec.confirmedHours;
        }
        // Keep attendance and competence separate:
        // Only records of category 'Skill assessment' or 'Institution-issued credential' establish assessed skills
        if (
          rec.recordCategory === "Skill assessment" ||
          rec.evidenceStatus === "Institution-issued credential"
        ) {
          (rec.skillsDemonstrated || []).forEach((s) => assessedSkillsSet.add(s));
        }
      } else if (
        rec.evidenceStatus === "Self-declared" ||
        rec.evidenceStatus === "Submitted for review"
      ) {
        (rec.skillsDemonstrated || []).forEach((s) => selfDeclaredSkillsSet.add(s));
      }
    }

    return {
      records,
      confirmedPracticalHours,
      assessedSkills: Array.from(assessedSkillsSet),
      selfDeclaredSkills: Array.from(selfDeclaredSkillsSet),
    };
  } catch (error) {
    console.error("Failed computing verified metrics:", error);
    throw new Error("Could not load Talent Passport records.", { cause: error });
  }
}

// Rule-based, transparent personalised recommendations (no AI API required)
export function buildTransparentRecommendations(user: typeof users.$inferSelect) {
  const stage = user.careerStage || "Currently studying";
  let checklistTitle = "Your Personalised First-Action Checklist";
  let checklistQuote = "Explore placements, add a project and choose a career pathway.";
  let steps: Array<{ id: string; label: string; tab: string; reason: string }> = [];

  if (stage === "Exploring tourism careers") {
    checklistQuote =
      "Discover Zimbabwean tourism sectors, follow industry mentors and choose a learning pathway.";
    steps = [
      {
        id: "step-pathway",
        label: "Compare curated Zimbabwean tourism career pathways",
        tab: "profile",
        reason: "Rule: Exploring stage benefits from understanding entry-level skills before training.",
      },
      {
        id: "step-explore",
        label: "Follow 2 verified guides or hospitality mentors in the community",
        tab: "explore",
        reason: "Rule:Matched to your selected tourism interests.",
      },
      {
        id: "step-opps",
        label: "Browse entry-level internships and Skill2Shift assignments",
        tab: "opportunities",
        reason: "Rule: Shows practical exposure opportunities requiring no prior employer certificate.",
      },
    ];
  } else if (stage === "Currently studying") {
    checklistQuote = "Explore placements, add a project and choose a career pathway.";
    steps = [
      {
        id: "step-portfolio",
        label: "Add a coursework or practical simulation project to your Portfolio",
        tab: "profile",
        reason: "Rule: Helps employers evaluate your practical learning before attachment.",
      },
      {
        id: "step-passport-edu",
        label: "Record your current degree/diploma in your Talent Passport",
        tab: "profile",
        reason: "Rule: Allows your training institution registrar to confirm enrolment.",
      },
      {
        id: "step-skill2shift",
        label: "Apply for a weekend Skill2Shift or industrial attachment",
        tab: "opportunities",
        reason: `Rule: Filtered for ${user.availability || "student availability"} in ${user.location || "Zimbabwe"}.`,
      },
    ];
  } else if (stage === "Intern or apprentice") {
    checklistQuote = "Add your current placement and start recording your experience.";
    steps = [
      {
        id: "step-log-placement",
        label: "Record your current placement details in Talent Passport (Self-declared until confirmed)",
        tab: "profile",
        reason: "Rule: Keeps placement records self-declared until an authorised supervisor confirms hours.",
      },
      {
        id: "step-share-learning",
        label: "Publish a Learning Update post tagging skills you are practising",
        tab: "create",
        reason: "Rule: Builds visible evidence of field learning.",
      },
      {
        id: "step-pathway-gap",
        label: "Review remaining skills to have assessed before your placement ends",
        tab: "profile",
        reason: "Rule: Separates attendance hours from demonstrated skill assessments.",
      },
    ];
  } else if (stage === "Recently graduated") {
    checklistQuote =
      "Turn your qualification and attachment projects into verified career evidence.";
    steps = [
      {
        id: "step-verify-cred",
        label: "Submit your graduation qualification for institutional verification",
        tab: "profile",
        reason: "Rule: Converts self-declared study into an Institution-issued credential.",
      },
      {
        id: "step-apply-grad",
        label: "Apply to open graduate roles and paid Skill2Shift assignments",
        tab: "opportunities",
        reason: "Rule: Prioritises immediate graduate transition opportunities.",
      },
    ];
  } else if (stage === "Self-employed or running a tourism business") {
    checklistQuote =
      "Showcase your tourism services, build industry connections or set up an approved organisation.";
    steps = [
      {
        id: "step-showcase",
        label: "Publish a Work Showcase post highlighting your services and region",
        tab: "create",
        reason: "Rule: Increases visibility among partner operators and lodges.",
      },
      {
        id: "step-org-setup",
        label: "Register your business page if you wish to recruit or host placements",
        tab: "opportunities",
        reason: "Rule: Publishing opportunities requires an administrator-approved organisation.",
      },
    ];
  } else if (stage === "Returning to work or changing careers") {
    checklistQuote =
      "Map your transferable skills to tourism pathways and gain fresh practical exposure.";
    steps = [
      {
        id: "step-transferable",
        label: "Add transferable work examples to your Portfolio",
        tab: "profile",
        reason: "Rule: Highlights relevant capabilities without requiring explanations for career breaks.",
      },
      {
        id: "step-short-shift",
        label: "Explore short Skill2Shift assignments for rapid practical confirmation",
        tab: "opportunities",
        reason: "Rule: Short assignments provide verified local hospitality references.",
      },
    ];
  } else {
    // Working professional
    checklistQuote = "Showcase your expertise and explore your next career move.";
    steps = [
      {
        id: "step-verify-exp",
        label: "Record your current or recent tourism experience in Talent Passport",
        tab: "profile",
        reason: "Rule: Establishes verified practical hours and specialist competencies.",
      },
      {
        id: "step-share-work",
        label: "Share a Work Showcase or Industry Update with the community",
        tab: "create",
        reason: "Rule: Connects you with peers, mentees and senior hospitality employers.",
      },
      {
        id: "step-senior-opps",
        label: "Explore specialist roles or mentor apprentices in your sector",
        tab: "opportunities",
        reason: "Rule: Matched to your experience range and career goals.",
      },
    ];
  }

  return {
    checklistTitle,
    checklistQuote,
    steps,
    curatedPathways: CURATED_CAREER_PATHWAYS,
  };
}
