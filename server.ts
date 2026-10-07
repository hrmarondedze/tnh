import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import * as dotenv from "dotenv";
import { db } from "./src/db/index.ts";
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
} from "./src/db/schema.ts";
import { eq, and, or, desc, inArray, ne } from "drizzle-orm";
import {
  requireAuth,
  requireAdmin,
  verifyOrgStaffPermission,
  AuthRequest,
} from "./src/middleware/auth.ts";
import { ensureSeedData, CURATED_CAREER_PATHWAYS } from "./src/db/seed.ts";
import {
  sanitizeText,
  logAudit,
  createNotification,
  computeMemberVerifiedMetrics,
  buildTransparentRecommendations,
} from "./src/db/repository.ts";

dotenv.config();

const app = express();
app.use(express.json({ limit: "6mb" }));

// Rate limiter for sensitive endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxRequests = 40, windowMs = 60_000) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();
    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > maxRequests) {
      return res.status(429).json({
        error: "Too many requests to this endpoint. Please wait a moment and try again.",
      });
    }
    next();
  };
}

let seedInitialized = false;
async function initOnce() {
  if (!seedInitialized) {
    seedInitialized = true;
    await ensureSeedData();
  }
}

// Middleware to ensure demo seed exists on first request
app.use("/api", async (_req, _res, next) => {
  try {
    await initOnce();
  } catch (err) {
    console.error("Seed init warning:", err);
  }
  next();
});

// ============================================================================
// 1. AUTH & ONBOARDING MODULE
// ============================================================================

app.get("/api/demo-accounts", async (_req, res) => {
  try {
    const demoUsers = await db
      .select({
        id: users.id,
        uid: users.uid,
        name: users.name,
        email: users.email,
        careerStage: users.careerStage,
        accountPurpose: users.accountPurpose,
        platformRole: users.platformRole,
        location: users.location,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.isDemo, true));

    res.json({ demoAccounts: demoUsers });
  } catch (error) {
    console.error("Failed fetching demo accounts:", error);
    res.status(500).json({ error: "Failed to load demo accounts" });
  }
});

app.get("/api/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;
    const userRows = await db.select().from(users).where(eq(users.id, userId));
    if (userRows.length === 0) {
      return res.status(404).json({ error: "User profile not found" });
    }
    const user = userRows[0];

    const memberships = await db
      .select({
        membership: organisationMemberships,
        organisation: organisations,
      })
      .from(organisationMemberships)
      .innerJoin(
        organisations,
        eq(organisationMemberships.organisationId, organisations.id)
      )
      .where(
        and(
          eq(organisationMemberships.userId, userId),
          eq(organisationMemberships.isActive, true)
        )
      );

    const metrics = await computeMemberVerifiedMetrics(userId);
    const recommendations = buildTransparentRecommendations(user);

    const unreadNotifs = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    const unreadMessages = await db
      .select()
      .from(messages)
      .where(and(eq(messages.receiverId, userId), eq(messages.isRead, false)));

    res.json({
      user,
      memberships,
      metrics,
      recommendations,
      unreadNotificationsCount: unreadNotifs.length,
      unreadMessagesCount: unreadMessages.length,
    });
  } catch (error) {
    console.error("Failed loading /api/me:", error);
    res.status(500).json({ error: "Failed to load current user session" });
  }
});

// Save adaptive onboarding progress or complete onboarding
// Note: Career stage changes never grant organisation or administrator permissions,
// and questionnaire answers never create verified skills or confirmed hours.
app.put("/api/onboarding", requireAuth, rateLimit(30, 60000), async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;
    const {
      step,
      completed,
      accountPurpose,
      careerStage,
      onboardingAnswers,
      preferredName,
      location,
      willingToRelocate,
      preferredLocations,
      tourismInterests,
      immediateCareerGoal,
      selectedPathwayId,
      opportunityTypes,
      availability,
      profileVisibility,
      employerDiscoverable,
      bio,
      organisationSetup,
    } = req.body;

    // Clean stale branch answers if careerStage changed
    const currentRows = await db.select().from(users).where(eq(users.id, userId));
    const current = currentRows[0];

    const nextStage = sanitizeText(careerStage || current.careerStage || "Currently studying", 100);
    let cleanedAnswers = onboardingAnswers || current.onboardingAnswers || {};

    if (careerStage && careerStage !== current.careerStage) {
      // Preserve only shared & active branch keys so stale branch answers are excluded
      cleanedAnswers = {
        purpose: cleanedAnswers.purpose || accountPurpose || "career",
        careerStage: nextStage,
        ...(onboardingAnswers || {}),
      };
    }

    const updated = await db
      .update(users)
      .set({
        onboardingStep: typeof step === "number" ? step : current.onboardingStep,
        onboardingCompleted:
          typeof completed === "boolean" ? completed : current.onboardingCompleted,
        accountPurpose: sanitizeText(accountPurpose || current.accountPurpose || "career", 50),
        careerStage: nextStage, // Strictly profile attribute, never changes platformRole!
        onboardingAnswers: cleanedAnswers,
        preferredName:
          preferredName !== undefined
            ? sanitizeText(preferredName, 80)
            : current.preferredName,
        location:
          location !== undefined ? sanitizeText(location, 120) : current.location,
        willingToRelocate:
          typeof willingToRelocate === "boolean"
            ? willingToRelocate
            : current.willingToRelocate,
        preferredLocations: Array.isArray(preferredLocations)
          ? preferredLocations.map((s) => sanitizeText(s, 80))
          : current.preferredLocations,
        tourismInterests: Array.isArray(tourismInterests)
          ? tourismInterests.map((s) => sanitizeText(s, 80))
          : current.tourismInterests,
        immediateCareerGoal:
          immediateCareerGoal !== undefined
            ? sanitizeText(immediateCareerGoal, 300)
            : current.immediateCareerGoal,
        selectedPathwayId:
          selectedPathwayId !== undefined
            ? sanitizeText(selectedPathwayId, 80)
            : current.selectedPathwayId,
        opportunityTypes: Array.isArray(opportunityTypes)
          ? opportunityTypes.map((s) => sanitizeText(s, 60))
          : current.opportunityTypes,
        availability:
          availability !== undefined
            ? sanitizeText(availability, 120)
            : current.availability,
        profileVisibility:
          profileVisibility !== undefined
            ? sanitizeText(profileVisibility, 40)
            : current.profileVisibility,
        employerDiscoverable:
          typeof employerDiscoverable === "boolean"
            ? employerDiscoverable
            : current.employerDiscoverable,
        bio: bio !== undefined ? sanitizeText(bio, 600) : current.bio,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    // If user is an Intern or apprentice and opted to record existing placement experience during onboarding,
    // record it strictly as 'Self-declared' with 0 confirmed hours.
    if (
      completed &&
      nextStage === "Intern or apprentice" &&
      cleanedAnswers.recordExistingPlacement &&
      cleanedAnswers.placementOrgName
    ) {
      await db.insert(passportRecords).values({
        userId,
        recordCategory: "Practical experience",
        title: sanitizeText(
          cleanedAnswers.placementRole || "Internship / Placement",
          140
        ),
        issuerOrOrganisationName: sanitizeText(cleanedAnswers.placementOrgName, 140),
        startDate: sanitizeText(cleanedAnswers.placementDates || "2026", 60),
        confirmedHours: 0, // Never automatically confirm hours from onboarding!
        skillsDemonstrated: Array.isArray(cleanedAnswers.practisingSkills)
          ? cleanedAnswers.practisingSkills.map((s: string) => sanitizeText(s, 80))
          : [],
        publicSummary:
          "Self-declared placement recorded during onboarding. Awaiting supervisor confirmation.",
        evidenceStatus: "Self-declared",
        verificationHistory: [
          {
            date: new Date().toISOString().slice(0, 10),
            actor: updated[0].name,
            action: "Recorded self-declared placement during onboarding questionnaire",
            status: "Self-declared",
          },
        ],
      });
    }

    // If organisation onboarding details were submitted, create organisation in 'pending' status
    let createdOrg = null;
    if (organisationSetup && organisationSetup.name) {
      const orgName = sanitizeText(organisationSetup.name, 140);
      const slug =
        orgName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") +
        "-" +
        Date.now().toString().slice(-4);

      const orgInserted = await db
        .insert(organisations)
        .values({
          name: orgName,
          slug,
          orgType: sanitizeText(organisationSetup.orgType || "Lodge / Camp", 80),
          location: sanitizeText(organisationSetup.location || "Zimbabwe", 120),
          contactEmail: sanitizeText(
            organisationSetup.contactEmail || updated[0].email,
            120
          ),
          contactPhone: sanitizeText(organisationSetup.contactPhone || "", 60),
          website: sanitizeText(organisationSetup.website || "", 200),
          description: sanitizeText(
            organisationSetup.description || "Tourism organisation in Zimbabwe",
            1000
          ),
          servicesOrProgrammes: Array.isArray(organisationSetup.servicesOrProgrammes)
            ? organisationSetup.servicesOrProgrammes.map((s: string) =>
                sanitizeText(s, 100)
              )
            : [],
          verificationStatus: "pending", // Always pending until administrator approval!
          verificationEvidenceNote: sanitizeText(
            organisationSetup.verificationEvidenceNote ||
              "Submitted during organisation onboarding",
            500
          ),
        })
        .returning();

      createdOrg = orgInserted[0];

      await db.insert(organisationMemberships).values({
        organisationId: createdOrg.id,
        userId,
        roleTitle: sanitizeText(
          organisationSetup.roleInOrg || "Authorised Representative",
          100
        ),
        permissionLevel: "owner",
        isActive: true,
      });

      await logAudit(
        userId,
        updated[0].name,
        "ORG_SUBMITTED_PENDING",
        "organisation",
        createdOrg.id,
        `Submitted organisation "${createdOrg.name}" for administrator verification.`
      );
    }

    const recommendations = buildTransparentRecommendations(updated[0]);
    res.json({ user: updated[0], createdOrg, recommendations });
  } catch (error) {
    console.error("Failed updating onboarding:", error);
    res.status(500).json({ error: "Failed to save onboarding questionnaire" });
  }
});

// ============================================================================
// 2. MEMBERS & PROFILES MODULE
// ============================================================================

// Update own profile (Server-enforced: users can only edit their own profile)
app.put("/api/members/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const targetUserId = Number(req.params.id);
    if (req.authUser!.id !== targetUserId) {
      return res.status(403).json({
        error: "Forbidden: You cannot edit another member's profile.",
      });
    }

    const {
      name,
      preferredName,
      bio,
      location,
      careerStage,
      tourismInterests,
      immediateCareerGoal,
      selectedPathwayId,
      availability,
      willingToRelocate,
      profileVisibility,
      employerDiscoverable,
      messagingPrivacy,
      dataSaverMode,
    } = req.body;

    const currentRows = await db.select().from(users).where(eq(users.id, targetUserId));
    if (currentRows.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }
    const current = currentRows[0];

    const updated = await db
      .update(users)
      .set({
        name: name !== undefined ? sanitizeText(name, 100) : current.name,
        preferredName:
          preferredName !== undefined
            ? sanitizeText(preferredName, 80)
            : current.preferredName,
        bio: bio !== undefined ? sanitizeText(bio, 600) : current.bio,
        location:
          location !== undefined ? sanitizeText(location, 120) : current.location,
        careerStage:
          careerStage !== undefined
            ? sanitizeText(careerStage, 100)
            : current.careerStage,
        tourismInterests: Array.isArray(tourismInterests)
          ? tourismInterests.map((s) => sanitizeText(s, 80))
          : current.tourismInterests,
        immediateCareerGoal:
          immediateCareerGoal !== undefined
            ? sanitizeText(immediateCareerGoal, 300)
            : current.immediateCareerGoal,
        selectedPathwayId:
          selectedPathwayId !== undefined
            ? sanitizeText(selectedPathwayId, 80)
            : current.selectedPathwayId,
        availability:
          availability !== undefined
            ? sanitizeText(availability, 120)
            : current.availability,
        willingToRelocate:
          typeof willingToRelocate === "boolean"
            ? willingToRelocate
            : current.willingToRelocate,
        profileVisibility:
          profileVisibility !== undefined
            ? sanitizeText(profileVisibility, 40)
            : current.profileVisibility,
        employerDiscoverable:
          typeof employerDiscoverable === "boolean"
            ? employerDiscoverable
            : current.employerDiscoverable,
        messagingPrivacy:
          messagingPrivacy !== undefined
            ? sanitizeText(messagingPrivacy, 60)
            : current.messagingPrivacy,
        dataSaverMode:
          typeof dataSaverMode === "boolean" ? dataSaverMode : current.dataSaverMode,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUserId))
      .returning();

    res.json({
      user: updated[0],
      recommendations: buildTransparentRecommendations(updated[0]),
    });
  } catch (error) {
    console.error("Failed updating member profile:", error);
    res.status(500).json({ error: "Failed to update member profile" });
  }
});

app.get("/api/members", requireAuth, async (req: AuthRequest, res) => {
  try {
    const allMembers = await db
      .select({
        id: users.id,
        name: users.name,
        preferredName: users.preferredName,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        location: users.location,
        careerStage: users.careerStage,
        tourismInterests: users.tourismInterests,
        immediateCareerGoal: users.immediateCareerGoal,
        availability: users.availability,
        employerDiscoverable: users.employerDiscoverable,
        profileVisibility: users.profileVisibility,
        isDemo: users.isDemo,
      })
      .from(users)
      .where(ne(users.profileVisibility, "private"))
      .orderBy(desc(users.createdAt));

    const myRels = await db
      .select()
      .from(socialRelationships)
      .where(
        or(
          eq(socialRelationships.requesterId, req.authUser!.id),
          eq(socialRelationships.targetId, req.authUser!.id)
        )
      );

    res.json({ members: allMembers, relationships: myRels });
  } catch (error) {
    console.error("Failed fetching members:", error);
    res.status(500).json({ error: "Failed to load community directory" });
  }
});

app.get("/api/members/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const targetId = Number(req.params.id);
    const memberRows = await db.select().from(users).where(eq(users.id, targetId));
    if (memberRows.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }
    const member = memberRows[0];

    if (
      member.profileVisibility === "private" &&
      member.id !== req.authUser!.id &&
      req.authUser!.platformRole !== "admin"
    ) {
      return res.status(403).json({
        error: "This member has set their profile visibility to private.",
      });
    }

    const memberPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.authorId, targetId))
      .orderBy(desc(posts.createdAt));

    const memberPortfolio = await db
      .select()
      .from(portfolioItems)
      .where(eq(portfolioItems.userId, targetId))
      .orderBy(desc(portfolioItems.createdAt));

    const metrics = await computeMemberVerifiedMetrics(targetId);

    const memberships = await db
      .select({
        membership: organisationMemberships,
        organisation: organisations,
      })
      .from(organisationMemberships)
      .innerJoin(
        organisations,
        eq(organisationMemberships.organisationId, organisations.id)
      )
      .where(
        and(
          eq(organisationMemberships.userId, targetId),
          eq(organisationMemberships.isActive, true)
        )
      );

    const relationships = await db
      .select()
      .from(socialRelationships)
      .where(
        or(
          eq(socialRelationships.requesterId, targetId),
          eq(socialRelationships.targetId, targetId)
        )
      );

    res.json({
      member,
      posts: memberPosts,
      portfolio: memberPortfolio,
      passport: metrics.records,
      confirmedPracticalHours: metrics.confirmedPracticalHours,
      assessedSkills: metrics.assessedSkills,
      memberships,
      relationships,
      recommendations: buildTransparentRecommendations(member),
    });
  } catch (error) {
    console.error("Failed loading member profile:", error);
    res.status(500).json({ error: "Failed to load member details" });
  }
});

// Follow / Connect / Block actions
app.post("/api/relationships", requireAuth, async (req: AuthRequest, res) => {
  try {
    const requesterId = req.authUser!.id;
    const { targetId, relType, action } = req.body; // relType: 'follow' | 'connection' | 'block', action: 'create' | 'accept' | 'remove'

    if (requesterId === Number(targetId)) {
      return res.status(400).json({ error: "Cannot create relationship with yourself" });
    }

    if (action === "remove") {
      await db
        .delete(socialRelationships)
        .where(
          and(
            or(
              and(
                eq(socialRelationships.requesterId, requesterId),
                eq(socialRelationships.targetId, Number(targetId))
              ),
              and(
                eq(socialRelationships.requesterId, Number(targetId)),
                eq(socialRelationships.targetId, requesterId)
              )
            ),
            eq(socialRelationships.relType, relType)
          )
        );
      return res.json({ status: "removed" });
    }

    if (action === "accept") {
      const updated = await db
        .update(socialRelationships)
        .set({ status: "accepted" })
        .where(
          and(
            eq(socialRelationships.requesterId, Number(targetId)),
            eq(socialRelationships.targetId, requesterId),
            eq(socialRelationships.relType, "connection")
          )
        )
        .returning();

      await createNotification(
        Number(targetId),
        "connection",
        `Connection Accepted by ${req.authUser!.name}`,
        `You are now connected with ${req.authUser!.name} and can message each other directly.`,
        "profile"
      );

      return res.json({ relationship: updated[0] });
    }

    // Check existing
    const existing = await db
      .select()
      .from(socialRelationships)
      .where(
        and(
          eq(socialRelationships.requesterId, requesterId),
          eq(socialRelationships.targetId, Number(targetId)),
          eq(socialRelationships.relType, relType)
        )
      );

    if (existing.length > 0) {
      return res.json({ relationship: existing[0] });
    }

    const status = relType === "connection" ? "pending" : "accepted";
    const inserted = await db
      .insert(socialRelationships)
      .values({
        requesterId,
        targetId: Number(targetId),
        relType: sanitizeText(relType, 30),
        status,
      })
      .returning();

    if (relType === "connection") {
      await createNotification(
        Number(targetId),
        "connection",
        `New Connection Request from ${req.authUser!.name}`,
        `${req.authUser!.name} invited you to connect on TourBridge.`,
        "profile"
      );
    }

    res.json({ relationship: inserted[0] });
  } catch (error) {
    console.error("Relationship action error:", error);
    res.status(500).json({ error: "Failed to update relationship" });
  }
});

// ============================================================================
// 3. ORGANISATIONS MODULE
// ============================================================================

app.get("/api/organisations", requireAuth, async (_req: AuthRequest, res) => {
  try {
    const orgs = await db
      .select()
      .from(organisations)
      .orderBy(desc(organisations.createdAt));

    const memberships = await db
      .select({
        membership: organisationMemberships,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(organisationMemberships)
      .innerJoin(users, eq(organisationMemberships.userId, users.id))
      .where(eq(organisationMemberships.isActive, true));

    res.json({ organisations: orgs, memberships });
  } catch (error) {
    console.error("Failed loading organisations:", error);
    res.status(500).json({ error: "Failed to load organisations" });
  }
});

// Create new organisation (Always starts as 'pending' until administrator approval)
app.post("/api/organisations", requireAuth, rateLimit(15, 60000), async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;
    const {
      name,
      orgType,
      location,
      contactEmail,
      contactPhone,
      website,
      description,
      servicesOrProgrammes,
      roleTitle,
      verificationEvidenceNote,
      privateDocContent,
      privateDocFileName,
    } = req.body;

    if (!name || !orgType || !location) {
      return res
        .status(400)
        .json({ error: "Organisation name, type, and location are required." });
    }

    let privateDocId: number | null = null;
    if (privateDocContent) {
      const docInserted = await db
        .insert(privateDocuments)
        .values({
          ownerUserId: userId,
          fileName: sanitizeText(privateDocFileName || "org_verification_evidence.txt", 120),
          mimeType: "text/plain",
          fileSizeBytes: String(privateDocContent).length,
          dataUriOrContent: sanitizeText(privateDocContent, 5000),
          documentPurpose: "org_verification",
        })
        .returning();
      privateDocId = docInserted[0].id;
    }

    const cleanName = sanitizeText(name, 140);
    const slug =
      cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Date.now().toString().slice(-4);

    const insertedOrg = await db
      .insert(organisations)
      .values({
        name: cleanName,
        slug,
        orgType: sanitizeText(orgType, 80),
        location: sanitizeText(location, 120),
        contactEmail: sanitizeText(contactEmail || req.authUser!.email, 120),
        contactPhone: sanitizeText(contactPhone || "", 60),
        website: sanitizeText(website || "", 200),
        description: sanitizeText(description || "", 1200),
        servicesOrProgrammes: Array.isArray(servicesOrProgrammes)
          ? servicesOrProgrammes.map((s) => sanitizeText(s, 100))
          : [],
        verificationStatus: "pending", // Enforced pending status
        verificationEvidenceNote: sanitizeText(verificationEvidenceNote || "", 500),
        verificationPrivateDocId: privateDocId,
      })
      .returning();

    const org = insertedOrg[0];

    await db.insert(organisationMemberships).values({
      organisationId: org.id,
      userId,
      roleTitle: sanitizeText(roleTitle || "Authorised Representative", 100),
      permissionLevel: "owner",
      isActive: true,
    });

    await logAudit(
      userId,
      req.authUser!.name,
      "ORG_CREATED_PENDING",
      "organisation",
      org.id,
      `Created organisation "${org.name}" in pending verification status.`
    );

    res.status(201).json({ organisation: org });
  } catch (error) {
    console.error("Failed creating organisation:", error);
    res.status(500).json({ error: "Failed to register organisation" });
  }
});

// Edit organisation details (Server-enforced: only authorised organisation staff can edit)
app.put("/api/organisations/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const orgId = Number(req.params.id);
    const check = await verifyOrgStaffPermission(req.authUser!.id, orgId);
    if (!check.allowed || !check.org) {
      return res.status(403).json({
        error: "Forbidden: Only authorised staff of this organisation can edit its details.",
      });
    }

    const { description, location, contactEmail, contactPhone, website, servicesOrProgrammes } =
      req.body;

    const updated = await db
      .update(organisations)
      .set({
        description:
          description !== undefined
            ? sanitizeText(description, 1200)
            : check.org.description,
        location:
          location !== undefined ? sanitizeText(location, 120) : check.org.location,
        contactEmail:
          contactEmail !== undefined
            ? sanitizeText(contactEmail, 120)
            : check.org.contactEmail,
        contactPhone:
          contactPhone !== undefined
            ? sanitizeText(contactPhone, 60)
            : check.org.contactPhone,
        website: website !== undefined ? sanitizeText(website, 200) : check.org.website,
        servicesOrProgrammes: Array.isArray(servicesOrProgrammes)
          ? servicesOrProgrammes.map((s) => sanitizeText(s, 100))
          : check.org.servicesOrProgrammes,
      })
      .where(eq(organisations.id, orgId))
      .returning();

    res.json({ organisation: updated[0] });
  } catch (error) {
    console.error("Failed updating organisation:", error);
    res.status(500).json({ error: "Failed to update organisation" });
  }
});

// Add staff member to organisation (Server-enforced: only active org staff can add co-staff)
app.post("/api/organisations/:id/staff", requireAuth, async (req: AuthRequest, res) => {
  try {
    const orgId = Number(req.params.id);
    const check = await verifyOrgStaffPermission(req.authUser!.id, orgId);
    if (!check.allowed) {
      return res.status(403).json({
        error: "Forbidden: Only authorised organisation staff can manage team memberships.",
      });
    }

    const { targetUserId, roleTitle, permissionLevel } = req.body;
    const inserted = await db
      .insert(organisationMemberships)
      .values({
        organisationId: orgId,
        userId: Number(targetUserId),
        roleTitle: sanitizeText(roleTitle || "Supervisor", 100),
        permissionLevel: sanitizeText(permissionLevel || "staff", 40),
        isActive: true,
      })
      .returning();

    res.status(201).json({ membership: inserted[0] });
  } catch (error) {
    console.error("Failed adding org staff:", error);
    res.status(500).json({ error: "Failed to add organisation staff member" });
  }
});

// ============================================================================
// 4. SOCIAL FEED & PUBLISHING MODULE
// ============================================================================

app.get("/api/posts", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;
    const view = (req.query.view as string) || "community"; // 'community' | 'following'
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    // Exclude blocked users
    const blocks = await db
      .select()
      .from(socialRelationships)
      .where(
        and(
          or(
            eq(socialRelationships.requesterId, userId),
            eq(socialRelationships.targetId, userId)
          ),
          eq(socialRelationships.relType, "block")
        )
      );

    const blockedUserIds = new Set<number>();
    blocks.forEach((b) => {
      if (b.requesterId === userId) blockedUserIds.add(b.targetId);
      if (b.targetId === userId) blockedUserIds.add(b.requesterId);
    });

    let followedIds: number[] = [];
    if (view === "following") {
      const follows = await db
        .select()
        .from(socialRelationships)
        .where(
          and(
            eq(socialRelationships.requesterId, userId),
            or(
              eq(socialRelationships.relType, "follow"),
              and(
                eq(socialRelationships.relType, "connection"),
                eq(socialRelationships.status, "accepted")
              )
            )
          )
        );
      followedIds = follows.map((f) => f.targetId);
      followedIds.push(userId); // Include own posts in following feed
    }

    const rawPosts = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          name: users.name,
          preferredName: users.preferredName,
          avatarUrl: users.avatarUrl,
          careerStage: users.careerStage,
          location: users.location,
          isDemo: users.isDemo,
        },
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt));

    const filtered = rawPosts.filter((item) => {
      if (blockedUserIds.has(item.author.id)) return false;
      if (view === "following" && !followedIds.includes(item.author.id)) return false;
      return true;
    });

    const paginated = filtered.slice(offset, offset + limit);
    const postIds = paginated.map((p) => p.post.id);

    let commentsList: Array<{
      comment: typeof postComments.$inferSelect;
      author: { id: number; name: string; avatarUrl: string | null };
    }> = [];
    let myInteractions: Array<typeof postInteractions.$inferSelect> = [];

    if (postIds.length > 0) {
      commentsList = await db
        .select({
          comment: postComments,
          author: {
            id: users.id,
            name: users.name,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(postComments)
        .innerJoin(users, eq(postComments.authorId, users.id))
        .where(inArray(postComments.postId, postIds))
        .orderBy(desc(postComments.createdAt));

      myInteractions = await db
        .select()
        .from(postInteractions)
        .where(
          and(
            inArray(postInteractions.postId, postIds),
            eq(postInteractions.userId, userId)
          )
        );
    }

    const enriched = paginated.map((item) => {
      const pComments = commentsList.filter((c) => c.comment.postId === item.post.id);
      const liked = myInteractions.some(
        (i) => i.postId === item.post.id && i.interactionType === "like"
      );
      const saved = myInteractions.some(
        (i) => i.postId === item.post.id && i.interactionType === "save"
      );
      return {
        ...item.post,
        author: item.author,
        comments: pComments,
        likedByMe: liked,
        savedByMe: saved,
      };
    });

    res.json({
      posts: enriched,
      page,
      total: filtered.length,
      hasMore: offset + limit < filtered.length,
    });
  } catch (error) {
    console.error("Failed loading feed:", error);
    res.status(500).json({ error: "Failed to load community feed" });
  }
});

// Create post (Note: A post claiming a skill NEVER verifies that skill in Talent Passport)
app.post("/api/posts", requireAuth, rateLimit(20, 60000), async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;
    const {
      postType,
      caption,
      mediaUrl,
      mediaType,
      skillTags,
      locationTag,
      linkedPortfolioId,
      linkedPassportId,
      linkedOpportunityId,
      organisationId,
    } = req.body;

    if (!caption || !postType) {
      return res.status(400).json({ error: "Post type and caption are required." });
    }

    if (organisationId) {
      const check = await verifyOrgStaffPermission(userId, Number(organisationId));
      if (!check.allowed) {
        return res.status(403).json({
          error: "Forbidden: You are not an authorised representative of that organisation.",
        });
      }
    }

    const inserted = await db
      .insert(posts)
      .values({
        authorId: userId,
        organisationId: organisationId ? Number(organisationId) : null,
        postType: sanitizeText(postType, 60),
        caption: sanitizeText(caption, 1500),
        mediaUrl: sanitizeText(mediaUrl || "", 500000), // Allow data URL or asset path
        mediaType: sanitizeText(mediaType || "image", 20),
        skillTags: Array.isArray(skillTags)
          ? skillTags.map((t) => sanitizeText(t, 80))
          : [],
        locationTag: sanitizeText(locationTag || "", 100),
        linkedPortfolioId: linkedPortfolioId ? Number(linkedPortfolioId) : null,
        linkedPassportId: linkedPassportId ? Number(linkedPassportId) : null,
        linkedOpportunityId: linkedOpportunityId ? Number(linkedOpportunityId) : null,
      })
      .returning();

    res.status(201).json({ post: inserted[0] });
  } catch (error) {
    console.error("Failed creating post:", error);
    res.status(500).json({ error: "Failed to publish post" });
  }
});

// Edit post (Author only)
app.put("/api/posts/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const postId = Number(req.params.id);
    const existing = await db.select().from(posts).where(eq(posts.id, postId));
    if (existing.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (existing[0].authorId !== req.authUser!.id) {
      return res.status(403).json({ error: "Forbidden: Only the author can edit this post." });
    }

    const { caption, postType, skillTags, locationTag } = req.body;
    const updated = await db
      .update(posts)
      .set({
        caption: caption !== undefined ? sanitizeText(caption, 1500) : existing[0].caption,
        postType: postType !== undefined ? sanitizeText(postType, 60) : existing[0].postType,
        skillTags: Array.isArray(skillTags)
          ? skillTags.map((t) => sanitizeText(t, 80))
          : existing[0].skillTags,
        locationTag:
          locationTag !== undefined
            ? sanitizeText(locationTag, 100)
            : existing[0].locationTag,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId))
      .returning();

    res.json({ post: updated[0] });
  } catch (error) {
    console.error("Failed editing post:", error);
    res.status(500).json({ error: "Failed to update post" });
  }
});

// Delete post (Author or Platform Admin)
app.delete("/api/posts/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const postId = Number(req.params.id);
    const existing = await db.select().from(posts).where(eq(posts.id, postId));
    if (existing.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (
      existing[0].authorId !== req.authUser!.id &&
      req.authUser!.platformRole !== "admin"
    ) {
      return res
        .status(403)
        .json({ error: "Forbidden: Only the post author or an admin can delete this post." });
    }

    await db.delete(posts).where(eq(posts.id, postId));
    res.json({ deleted: true });
  } catch (error) {
    console.error("Failed deleting post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// Like / Save post (Never affects skill verification or Talent Passport)
app.post("/api/posts/:id/interact", requireAuth, async (req: AuthRequest, res) => {
  try {
    const postId = Number(req.params.id);
    const userId = req.authUser!.id;
    const { interactionType } = req.body; // 'like' | 'save'

    const postRows = await db.select().from(posts).where(eq(posts.id, postId));
    if (postRows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    const post = postRows[0];

    const existing = await db
      .select()
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.postId, postId),
          eq(postInteractions.userId, userId),
          eq(postInteractions.interactionType, interactionType)
        )
      );

    if (existing.length > 0) {
      await db.delete(postInteractions).where(eq(postInteractions.id, existing[0].id));
      const nextCount =
        interactionType === "like"
          ? Math.max(0, post.likesCount - 1)
          : Math.max(0, post.savesCount - 1);
      await db
        .update(posts)
        .set(
          interactionType === "like"
            ? { likesCount: nextCount }
            : { savesCount: nextCount }
        )
        .where(eq(posts.id, postId));
      return res.json({ active: false, count: nextCount });
    } else {
      await db.insert(postInteractions).values({
        postId,
        userId,
        interactionType: sanitizeText(interactionType, 20),
      });
      const nextCount =
        interactionType === "like" ? post.likesCount + 1 : post.savesCount + 1;
      await db
        .update(posts)
        .set(
          interactionType === "like"
            ? { likesCount: nextCount }
            : { savesCount: nextCount }
        )
        .where(eq(posts.id, postId));
      return res.json({ active: true, count: nextCount });
    }
  } catch (error) {
    console.error("Failed post interaction:", error);
    res.status(500).json({ error: "Failed to toggle interaction" });
  }
});

// Comment on post
app.post("/api/posts/:id/comments", requireAuth, async (req: AuthRequest, res) => {
  try {
    const postId = Number(req.params.id);
    const userId = req.authUser!.id;
    const content = sanitizeText(req.body.content, 600);
    if (!content) {
      return res.status(400).json({ error: "Comment content cannot be empty" });
    }

    const postRows = await db.select().from(posts).where(eq(posts.id, postId));
    if (postRows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    const inserted = await db
      .insert(postComments)
      .values({
        postId,
        authorId: userId,
        content,
      })
      .returning();

    await db
      .update(posts)
      .set({ commentsCount: postRows[0].commentsCount + 1 })
      .where(eq(posts.id, postId));

    if (postRows[0].authorId !== userId) {
      await createNotification(
        postRows[0].authorId,
        "comment",
        `New comment from ${req.authUser!.name}`,
        `"${content.slice(0, 80)}"`,
        "home"
      );
    }

    res.status(201).json({
      comment: inserted[0],
      author: {
        id: userId,
        name: req.authUser!.name,
        avatarUrl: "",
      },
    });
  } catch (error) {
    console.error("Failed adding comment:", error);
    res.status(500).json({ error: "Failed to post comment" });
  }
});

// ============================================================================
// 5. PORTFOLIO & TALENT PASSPORT MODULE (WITH PRIVATE EVIDENCE VAULT)
// ============================================================================

app.post("/api/portfolio", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;
    const { title, description, mediaUrl, mediaType, skillTags, roleContext, projectDate } =
      req.body;

    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required." });
    }

    const inserted = await db
      .insert(portfolioItems)
      .values({
        userId,
        title: sanitizeText(title, 140),
        description: sanitizeText(description, 1000),
        mediaUrl: sanitizeText(mediaUrl || "", 500000),
        mediaType: sanitizeText(mediaType || "image", 30),
        skillTags: Array.isArray(skillTags)
          ? skillTags.map((t) => sanitizeText(t, 80))
          : [],
        roleContext: sanitizeText(roleContext || "", 120),
        projectDate: sanitizeText(projectDate || "", 60),
      })
      .returning();

    res.status(201).json({ portfolioItem: inserted[0] });
  } catch (error) {
    console.error("Failed adding portfolio item:", error);
    res.status(500).json({ error: "Failed to save portfolio item" });
  }
});

// Add Talent Passport record (Members can only create 'Self-declared' or 'Submitted for review' records;
// members can NEVER verify their own experience)
app.post("/api/passport", requireAuth, rateLimit(25, 60000), async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;
    const {
      recordCategory,
      title,
      issuerOrOrganisationName,
      organisationId,
      startDate,
      endDate,
      skillsDemonstrated,
      publicSummary,
      evidenceReference,
      submitForReview,
      privateDocFileName,
      privateDocContent,
    } = req.body;

    if (!recordCategory || !title || !issuerOrOrganisationName) {
      return res.status(400).json({
        error: "Category, title, and organisation/issuer name are required.",
      });
    }

    let privateDocId: number | null = null;
    if (privateDocContent) {
      const fileSizeBytes = String(privateDocContent).length;
      if (fileSizeBytes > 2_000_000) {
        return res.status(400).json({ error: "Private evidence upload exceeds 2MB limit." });
      }
      const docInserted = await db
        .insert(privateDocuments)
        .values({
          ownerUserId: userId,
          organisationId: organisationId ? Number(organisationId) : null,
          fileName: sanitizeText(privateDocFileName || "evidence_document.txt", 140),
          mimeType: "text/plain",
          fileSizeBytes,
          dataUriOrContent: sanitizeText(privateDocContent, 500000),
          documentPurpose: "passport_evidence",
        })
        .returning();
      privateDocId = docInserted[0].id;
    }

    // Enforce: Member cannot set status to Confirmed or Institution-issued!
    const initialStatus =
      submitForReview && organisationId ? "Submitted for review" : "Self-declared";

    const inserted = await db
      .insert(passportRecords)
      .values({
        userId,
        recordCategory: sanitizeText(recordCategory, 60),
        title: sanitizeText(title, 150),
        issuerOrOrganisationName: sanitizeText(issuerOrOrganisationName, 150),
        organisationId: organisationId ? Number(organisationId) : null,
        startDate: sanitizeText(startDate || "", 40),
        endDate: sanitizeText(endDate || "", 40),
        confirmedHours: 0, // Always 0 until verified by an authorised representative!
        skillsDemonstrated: Array.isArray(skillsDemonstrated)
          ? skillsDemonstrated.map((s) => sanitizeText(s, 80))
          : [],
        publicSummary: sanitizeText(publicSummary || "", 800),
        evidenceReference: sanitizeText(evidenceReference || "", 120),
        privateEvidenceDocId: privateDocId,
        evidenceStatus: initialStatus,
        verificationHistory: [
          {
            date: new Date().toISOString().slice(0, 10),
            actor: req.authUser!.name,
            action:
              initialStatus === "Submitted for review"
                ? "Created record and submitted for organisation review"
                : "Added self-declared Talent Passport record",
            status: initialStatus,
          },
        ],
      })
      .returning();

    res.status(201).json({ record: inserted[0] });
  } catch (error) {
    console.error("Failed creating passport record:", error);
    res.status(500).json({ error: "Failed to save Talent Passport record" });
  }
});

// Verify / Confirm / Dispute / Revoke a Talent Passport record
// Server-enforced rules:
// 1. A member can NEVER verify their own experience (userId === verifierUserId is strictly 403).
// 2. Only an authorised staff representative of the linked approved organisation (or Platform Admin) can confirm/issue/revoke.
// 3. The record owner can dispute an inaccurate record.
app.post("/api/passport/:id/verify", requireAuth, async (req: AuthRequest, res) => {
  try {
    const recordId = Number(req.params.id);
    const actorId = req.authUser!.id;
    const { action, confirmedHours, skillsDemonstrated, note } = req.body;
    // action: 'confirm' | 'issue_credential' | 'dispute' | 'revoke' | 'submit_for_review'

    const rows = await db
      .select()
      .from(passportRecords)
      .where(eq(passportRecords.id, recordId));
    if (rows.length === 0) {
      return res.status(404).json({ error: "Passport record not found" });
    }
    const record = rows[0];
    const history = Array.isArray(record.verificationHistory)
      ? [...record.verificationHistory]
      : [];

    if (action === "submit_for_review") {
      if (record.userId !== actorId) {
        return res.status(403).json({ error: "Only the record owner can submit it for review." });
      }
      history.push({
        date: new Date().toISOString().slice(0, 10),
        actor: req.authUser!.name,
        action: "Submitted record for organisation verification",
        status: "Submitted for review",
        note: sanitizeText(note || "", 300),
      });
      const updated = await db
        .update(passportRecords)
        .set({
          evidenceStatus: "Submitted for review",
          verificationHistory: history,
          updatedAt: new Date(),
        })
        .where(eq(passportRecords.id, recordId))
        .returning();
      return res.json({ record: updated[0] });
    }

    if (action === "dispute") {
      // Record owner or org staff can flag a dispute
      if (record.userId !== actorId && req.authUser!.platformRole !== "admin") {
        if (record.organisationId) {
          const check = await verifyOrgStaffPermission(actorId, record.organisationId);
          if (!check.allowed) {
            return res.status(403).json({ error: "Unauthorized to dispute this record." });
          }
        } else {
          return res.status(403).json({ error: "Unauthorized to dispute this record." });
        }
      }
      const cleanReason = sanitizeText(note || "Inaccurate hours or assessment details", 500);
      history.push({
        date: new Date().toISOString().slice(0, 10),
        actor: req.authUser!.name,
        action: "Raised verification dispute",
        status: "Disputed",
        note: cleanReason,
      });

      const updated = await db
        .update(passportRecords)
        .set({
          evidenceStatus: "Disputed",
          disputeReason: cleanReason,
          verificationHistory: history,
          updatedAt: new Date(),
        })
        .where(eq(passportRecords.id, recordId))
        .returning();

      await db.insert(reports).values({
        reporterUserId: actorId,
        targetType: "credential",
        targetId: record.id,
        reason: "Talent Passport Verification Dispute",
        details: cleanReason,
        status: "open",
      });

      await logAudit(
        actorId,
        req.authUser!.name,
        "PASSPORT_DISPUTED",
        "passport_record",
        record.id,
        `Disputed Passport record "${record.title}": ${cleanReason}`
      );

      return res.json({ record: updated[0] });
    }

    // For 'confirm', 'issue_credential', or 'revoke':
    // CRITICAL RULE: Members CANNOT verify their own experience!
    if (record.userId === actorId) {
      return res.status(403).json({
        error:
          "Forbidden: Members are strictly prohibited from verifying their own Talent Passport records.",
      });
    }

    let verifierLabel = `${req.authUser!.name} (Platform Admin)`;
    if (req.authUser!.platformRole !== "admin") {
      if (!record.organisationId) {
        return res.status(403).json({
          error:
            "Forbidden: Record must be linked to an approved organisation for representative verification.",
        });
      }
      const check = await verifyOrgStaffPermission(actorId, record.organisationId);
      if (!check.allowed || !check.org || !check.membership) {
        return res.status(403).json({
          error:
            "Forbidden: Only an authorised representative of the issuing organisation can verify this record.",
        });
      }
      if (check.org.verificationStatus !== "approved") {
        return res.status(403).json({
          error:
            "Forbidden: Pending or unapproved organisations cannot verify Talent Passport records.",
        });
      }
      verifierLabel = `${req.authUser!.name} — ${check.membership.roleTitle} (${check.org.name})`;
    }

    let nextStatus = "Confirmed by an authorised organisation representative";
    if (action === "issue_credential") {
      nextStatus = "Institution-issued credential";
    } else if (action === "revoke") {
      nextStatus = "Revoked";
    }

    const nextHours =
      action === "revoke"
        ? 0
        : typeof confirmedHours === "number"
        ? Math.max(0, confirmedHours)
        : record.confirmedHours;

    history.push({
      date: new Date().toISOString().slice(0, 10),
      actor: verifierLabel,
      action:
        action === "revoke"
          ? "Revoked verification"
          : `Verified record (${nextStatus})`,
      status: nextStatus,
      note: sanitizeText(note || "", 400),
    });

    const updated = await db
      .update(passportRecords)
      .set({
        evidenceStatus: nextStatus,
        confirmedHours: nextHours,
        skillsDemonstrated: Array.isArray(skillsDemonstrated)
          ? skillsDemonstrated.map((s) => sanitizeText(s, 80))
          : record.skillsDemonstrated,
        verifierUserId: actorId,
        verifierNameAndRole: verifierLabel,
        verifiedAt: new Date(),
        verificationHistory: history,
        updatedAt: new Date(),
      })
      .where(eq(passportRecords.id, recordId))
      .returning();

    await createNotification(
      record.userId,
      "verification",
      `Talent Passport Record ${action === "revoke" ? "Revoked" : "Verified"}`,
      `${verifierLabel} updated "${record.title}" to status: ${nextStatus}.`,
      "profile"
    );

    await logAudit(
      actorId,
      verifierLabel,
      action === "revoke" ? "PASSPORT_REVOKED" : "PASSPORT_VERIFIED",
      "passport_record",
      record.id,
      `Updated Passport record #${record.id} ("${record.title}") to ${nextStatus}.`
    );

    res.json({ record: updated[0] });
  } catch (error) {
    console.error("Failed verifying passport record:", error);
    res.status(500).json({ error: "Failed to process verification action" });
  }
});

// Authorised Private Evidence Document Retrieval
// Server-enforced: Private evidence is inaccessible to unauthorised users!
app.get("/api/private-documents/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const docId = Number(req.params.id);
    const actorId = req.authUser!.id;

    const docs = await db
      .select()
      .from(privateDocuments)
      .where(eq(privateDocuments.id, docId));
    if (docs.length === 0) {
      return res.status(404).json({ error: "Private document not found" });
    }
    const doc = docs[0];

    let isAuthorized = false;
    if (doc.ownerUserId === actorId || req.authUser!.platformRole === "admin") {
      isAuthorized = true;
    } else if (doc.organisationId) {
      const check = await verifyOrgStaffPermission(actorId, doc.organisationId);
      if (check.allowed) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        error:
          "Forbidden: Private evidence documents are strictly restricted to the document owner, authorised verifying organisation staff, and platform administrators.",
      });
    }

    res.json({ document: doc });
  } catch (error) {
    console.error("Failed retrieving private document:", error);
    res.status(500).json({ error: "Failed to access private document" });
  }
});

// ============================================================================
// 6. OPPORTUNITIES, APPLICATIONS & PLACEMENTS MODULE
// ============================================================================

app.get("/api/opportunities", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { location, type, skill, compensation, q } = req.query;

    const rows = await db
      .select({
        opportunity: opportunities,
        organisation: organisations,
      })
      .from(opportunities)
      .innerJoin(organisations, eq(opportunities.organisationId, organisations.id))
      .orderBy(desc(opportunities.createdAt));

    const filtered = rows.filter(({ opportunity, organisation }) => {
      // Only show opportunities from approved organisations in public discovery
      if (organisation.verificationStatus !== "approved") return false;
      if (
        location &&
        location !== "all" &&
        !opportunity.location.toLowerCase().includes(String(location).toLowerCase())
      ) {
        return false;
      }
      if (type && type !== "all" && opportunity.opportunityType !== type) {
        return false;
      }
      if (
        compensation &&
        compensation !== "all" &&
        opportunity.compensationType !== compensation
      ) {
        return false;
      }
      if (
        skill &&
        skill !== "all" &&
        !(opportunity.requiredSkills || []).some((s) =>
          s.toLowerCase().includes(String(skill).toLowerCase())
        )
      ) {
        return false;
      }
      if (q) {
        const query = String(q).toLowerCase();
        const matchTitle = opportunity.title.toLowerCase().includes(query);
        const matchOrg = organisation.name.toLowerCase().includes(query);
        const matchDesc = opportunity.description.toLowerCase().includes(query);
        if (!matchTitle && !matchOrg && !matchDesc) return false;
      }
      return true;
    });

    res.json({
      opportunities: filtered.map((r) => ({
        ...r.opportunity,
        organisation: r.organisation,
      })),
    });
  } catch (error) {
    console.error("Failed loading opportunities:", error);
    res.status(500).json({ error: "Failed to load opportunities" });
  }
});

// Publish Opportunity
// Server-enforced: Pending organisations CANNOT publish opportunities!
app.post("/api/opportunities", requireAuth, rateLimit(20, 60000), async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;
    const {
      organisationId,
      title,
      opportunityType,
      location,
      description,
      tasks,
      requiredSkills,
      eligibility,
      startDate,
      endDate,
      expectedHours,
      compensationType,
      compensationAmount,
      transportProvided,
      mealsProvided,
      accommodationProvided,
      applicationDeadline,
      supervisorNameAndRole,
      assessmentExpectations,
    } = req.body;

    if (!organisationId || !title || !opportunityType || !location || !compensationType) {
      return res.status(400).json({
        error: "Organisation, title, opportunity type, location, and compensation are required.",
      });
    }

    const check = await verifyOrgStaffPermission(userId, Number(organisationId));
    if (!check.allowed || !check.org) {
      return res.status(403).json({
        error: "Forbidden: You must be an authorised representative of this organisation.",
      });
    }

    if (check.org.verificationStatus !== "approved") {
      return res.status(403).json({
        error:
          "Forbidden: Pending or unapproved organisations cannot publish opportunities until approved by a Platform Administrator.",
      });
    }

    const inserted = await db
      .insert(opportunities)
      .values({
        organisationId: Number(organisationId),
        createdByUserId: userId,
        title: sanitizeText(title, 160),
        opportunityType: sanitizeText(opportunityType, 50), // 'Job' | 'Internship' | 'Apprenticeship' | 'Skill2Shift'
        location: sanitizeText(location, 120),
        description: sanitizeText(description, 2000),
        tasks: Array.isArray(tasks) ? tasks.map((t) => sanitizeText(t, 200)) : [],
        requiredSkills: Array.isArray(requiredSkills)
          ? requiredSkills.map((s) => sanitizeText(s, 80))
          : [],
        eligibility: sanitizeText(eligibility || "Open to eligible tourism members", 300),
        startDate: sanitizeText(startDate || "", 50),
        endDate: sanitizeText(endDate || "", 50),
        expectedHours: Math.max(0, Number(expectedHours) || 0),
        compensationType: sanitizeText(compensationType, 80),
        compensationAmount: sanitizeText(compensationAmount || "", 120),
        transportProvided: Boolean(transportProvided),
        mealsProvided: Boolean(mealsProvided),
        accommodationProvided: Boolean(accommodationProvided),
        applicationDeadline: sanitizeText(applicationDeadline || "2026-12-01", 50),
        supervisorNameAndRole: sanitizeText(
          supervisorNameAndRole || req.authUser!.name,
          140
        ),
        assessmentExpectations: sanitizeText(assessmentExpectations || "", 500),
        status: "open",
      })
      .returning();

    await logAudit(
      userId,
      req.authUser!.name,
      "OPPORTUNITY_PUBLISHED",
      "opportunity",
      inserted[0].id,
      `Published ${inserted[0].opportunityType}: "${inserted[0].title}" for ${check.org.name}.`
    );

    res.status(201).json({ opportunity: inserted[0] });
  } catch (error) {
    console.error("Failed publishing opportunity:", error);
    res.status(500).json({ error: "Failed to publish opportunity" });
  }
});

// Close or Reopen Opportunity (Employer staff only)
app.put("/api/opportunities/:id/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const oppId = Number(req.params.id);
    const oppRows = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, oppId));
    if (oppRows.length === 0) {
      return res.status(404).json({ error: "Opportunity not found" });
    }
    const opp = oppRows[0];

    const check = await verifyOrgStaffPermission(req.authUser!.id, opp.organisationId);
    if (!check.allowed) {
      return res.status(403).json({
        error: "Forbidden: Only authorised employer staff can close or reopen this listing.",
      });
    }

    const nextStatus = req.body.status === "closed" ? "closed" : "open";
    const updated = await db
      .update(opportunities)
      .set({ status: nextStatus })
      .where(eq(opportunities.id, oppId))
      .returning();

    res.json({ opportunity: updated[0] });
  } catch (error) {
    console.error("Failed updating opportunity status:", error);
    res.status(500).json({ error: "Failed to update opportunity status" });
  }
});

// Apply to Opportunity
// Server-enforced:
// 1. Closed opportunities reject new applications.
// 2. Duplicate applications from the same member are prevented.
// 3. Video portfolios are NEVER required to apply.
app.post(
  "/api/opportunities/:id/apply",
  requireAuth,
  rateLimit(20, 60000),
  async (req: AuthRequest, res) => {
    try {
      const oppId = Number(req.params.id);
      const applicantId = req.authUser!.id;
      const { supportingMessage, attachedPassportIds } = req.body;

      const oppRows = await db
        .select()
        .from(opportunities)
        .where(eq(opportunities.id, oppId));
      if (oppRows.length === 0) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      const opp = oppRows[0];

      if (opp.status !== "open") {
        return res.status(400).json({
          error: "This opportunity listing is closed and no longer accepts applications.",
        });
      }

      const existing = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.opportunityId, oppId),
            eq(applications.applicantUserId, applicantId)
          )
        );

      if (existing.length > 0) {
        return res.status(400).json({
          error: "You have already submitted an application for this opportunity.",
        });
      }

      const cleanMsg = sanitizeText(
        supportingMessage ||
          "Applying with my TourBridge profile and Talent Passport records.",
        1500
      );

      const inserted = await db
        .insert(applications)
        .values({
          opportunityId: oppId,
          applicantUserId: applicantId,
          supportingMessage: cleanMsg,
          attachedPassportIds: Array.isArray(attachedPassportIds)
            ? attachedPassportIds.map(Number)
            : [],
          status: "Submitted",
        })
        .returning();

      await createNotification(
        opp.createdByUserId,
        "application",
        `New Application: ${opp.title}`,
        `${req.authUser!.name} applied for "${opp.title}".`,
        "opportunities"
      );

      res.status(201).json({ application: inserted[0] });
    } catch (error) {
      console.error("Failed applying to opportunity:", error);
      res.status(500).json({ error: "Failed to submit application" });
    }
  }
);

// List Applications & Placements relevant to the user or their managed organisations
app.get("/api/applications", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;

    const myOrgs = await db
      .select()
      .from(organisationMemberships)
      .where(
        and(
          eq(organisationMemberships.userId, userId),
          eq(organisationMemberships.isActive, true)
        )
      );
    const managedOrgIds = myOrgs.map((m) => m.organisationId);

    const allApps = await db
      .select({
        application: applications,
        opportunity: opportunities,
        organisation: organisations,
        applicant: {
          id: users.id,
          name: users.name,
          email: users.email,
          careerStage: users.careerStage,
          location: users.location,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(applications)
      .innerJoin(opportunities, eq(applications.opportunityId, opportunities.id))
      .innerJoin(organisations, eq(opportunities.organisationId, organisations.id))
      .innerJoin(users, eq(applications.applicantUserId, users.id))
      .orderBy(desc(applications.createdAt));

    const visibleApps = allApps.filter(
      (row) =>
        row.application.applicantUserId === userId ||
        managedOrgIds.includes(row.opportunity.organisationId) ||
        req.authUser!.platformRole === "admin"
    );

    const allPlacements = await db
      .select({
        placement: placements,
        opportunity: opportunities,
        organisation: organisations,
        member: {
          id: users.id,
          name: users.name,
          careerStage: users.careerStage,
          location: users.location,
        },
      })
      .from(placements)
      .innerJoin(opportunities, eq(placements.opportunityId, opportunities.id))
      .innerJoin(organisations, eq(placements.organisationId, organisations.id))
      .innerJoin(users, eq(placements.memberUserId, users.id))
      .orderBy(desc(placements.updatedAt));

    const visiblePlacements = allPlacements.filter(
      (row) =>
        row.placement.memberUserId === userId ||
        managedOrgIds.includes(row.placement.organisationId) ||
        req.authUser!.platformRole === "admin"
    );

    res.json({
      applications: visibleApps,
      placements: visiblePlacements,
    });
  } catch (error) {
    console.error("Failed fetching applications and placements:", error);
    res.status(500).json({ error: "Failed to load applications and placements" });
  }
});

// Transition Application State
// Allowed states: Submitted -> Shortlisted -> Accepted or Rejected
// Members can withdraw before an assignment starts.
// Ordinary Job applications MUST NOT automatically generate placement records!
app.put("/api/applications/:id/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const appId = Number(req.params.id);
    const actorId = req.authUser!.id;
    const { nextStatus, employerNotes } = req.body;
    // 'Shortlisted' | 'Accepted' | 'Rejected' | 'Withdrawn'

    const appRows = await db
      .select({
        application: applications,
        opportunity: opportunities,
      })
      .from(applications)
      .innerJoin(opportunities, eq(applications.opportunityId, opportunities.id))
      .where(eq(applications.id, appId));

    if (appRows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    const { application, opportunity } = appRows[0];

    if (nextStatus === "Withdrawn") {
      if (application.applicantUserId !== actorId) {
        return res
          .status(403)
          .json({ error: "Forbidden: Only the applicant can withdraw their application." });
      }
      // Check if placement already started
      const existingPlacement = await db
        .select()
        .from(placements)
        .where(eq(placements.applicationId, appId));
      if (
        existingPlacement.length > 0 &&
        existingPlacement[0].workflowState !== "Terms confirmed"
      ) {
        return res.status(400).json({
          error: "Cannot withdraw application after practical assignment has already started.",
        });
      }
      const updated = await db
        .update(applications)
        .set({ status: "Withdrawn", updatedAt: new Date() })
        .where(eq(applications.id, appId))
        .returning();
      return res.json({ application: updated[0] });
    }

    // Employer transitions: Shortlisted, Accepted, Rejected
    const check = await verifyOrgStaffPermission(actorId, opportunity.organisationId);
    if (!check.allowed || !check.org) {
      return res.status(403).json({
        error: "Forbidden: Only authorised staff of the employer organisation can review applications.",
      });
    }

    const allowedEmployerStates = ["Shortlisted", "Accepted", "Rejected"];
    if (!allowedEmployerStates.includes(nextStatus)) {
      return res.status(400).json({ error: `Invalid application state transition: ${nextStatus}` });
    }

    const updatedApp = await db
      .update(applications)
      .set({
        status: nextStatus,
        employerNotes:
          employerNotes !== undefined
            ? sanitizeText(employerNotes, 500)
            : application.employerNotes,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, appId))
      .returning();

    let createdPlacement = null;
    // Create placement workflow ONLY for practical placements (Internship, Apprenticeship, Skill2Shift)
    // Ordinary 'Job' applications MUST NOT automatically generate placement records!
    if (
      nextStatus === "Accepted" &&
      ["Internship", "Apprenticeship", "Skill2Shift"].includes(
        opportunity.opportunityType
      )
    ) {
      const existingPl = await db
        .select()
        .from(placements)
        .where(eq(placements.applicationId, appId));

      if (existingPl.length === 0) {
        const plInserted = await db
          .insert(placements)
          .values({
            applicationId: appId,
            opportunityId: opportunity.id,
            organisationId: opportunity.organisationId,
            memberUserId: application.applicantUserId,
            workflowState: "Terms confirmed",
            claimedHours: opportunity.expectedHours,
            supervisorUserId: actorId,
            hoursEnteredToPassport: false,
            auditLog: [
              {
                date: new Date().toISOString().slice(0, 10),
                actor: `${req.authUser!.name} (${check.org.name})`,
                state: "Terms confirmed",
                detail: `Accepted ${opportunity.opportunityType} application and initialised placement workflow (${opportunity.expectedHours} expected hours).`,
              },
            ],
          })
          .returning();
        createdPlacement = plInserted[0];
      }
    }

    await createNotification(
      application.applicantUserId,
      "application",
      `Application ${nextStatus}: ${opportunity.title}`,
      `${check.org.name} updated your application for "${opportunity.title}" to ${nextStatus}.`,
      "opportunities"
    );

    res.json({ application: updatedApp[0], placement: createdPlacement });
  } catch (error) {
    console.error("Failed updating application status:", error);
    res.status(500).json({ error: "Failed to update application status" });
  }
});

// Practical Placement Completion Workflow
// Strictly follows:
// Terms confirmed -> In progress -> Completion submitted -> Supervisor reviewed -> Member accepted (Finalised) or Disputed -> Finalised
// Confirmed hours enter the Talent Passport EXACTLY ONCE after finalisation.
// Assessed skills are recorded as a SEPARATE 'Skill assessment' Passport record (completing a placement never auto-verifies all skills without assessment).
app.post("/api/placements/:id/transition", requireAuth, async (req: AuthRequest, res) => {
  try {
    const placementId = Number(req.params.id);
    const actorId = req.authUser!.id;
    const {
      action, // 'start_in_progress' | 'submit_completion' | 'supervisor_review' | 'member_accept_finalise' | 'member_dispute' | 'admin_resolve_finalise'
      memberCompletionSummary,
      claimedHours,
      supervisorConfirmedHours,
      supervisorAssessedSkills,
      supervisorReviewNote,
      disputeNote,
    } = req.body;

    const plRows = await db
      .select({
        placement: placements,
        opportunity: opportunities,
        organisation: organisations,
      })
      .from(placements)
      .innerJoin(opportunities, eq(placements.opportunityId, opportunities.id))
      .innerJoin(organisations, eq(placements.organisationId, organisations.id))
      .where(eq(placements.id, placementId));

    if (plRows.length === 0) {
      return res.status(404).json({ error: "Placement not found" });
    }
    const { placement, opportunity, organisation } = plRows[0];
    const audit = Array.isArray(placement.auditLog) ? [...placement.auditLog] : [];
    const today = new Date().toISOString().slice(0, 10);

    // 1. Terms confirmed -> In progress (Member or Supervisor)
    if (action === "start_in_progress") {
      if (placement.workflowState !== "Terms confirmed") {
        return res.status(400).json({
          error: `Cannot start placement from state "${placement.workflowState}".`,
        });
      }
      audit.push({
        date: today,
        actor: req.authUser!.name,
        state: "In progress",
        detail: "Placement terms confirmed and practical assignment started.",
      });
      const updated = await db
        .update(placements)
        .set({ workflowState: "In progress", auditLog: audit, updatedAt: new Date() })
        .where(eq(placements.id, placementId))
        .returning();
      return res.json({ placement: updated[0] });
    }

    // 2. In progress -> Completion submitted (Member only)
    if (action === "submit_completion") {
      if (placement.memberUserId !== actorId) {
        return res.status(403).json({
          error: "Forbidden: Only the assigned member can submit placement completion.",
        });
      }
      if (
        placement.workflowState !== "In progress" &&
        placement.workflowState !== "Terms confirmed"
      ) {
        return res.status(400).json({
          error: `Cannot submit completion from state "${placement.workflowState}".`,
        });
      }
      const hours = Math.max(1, Number(claimedHours) || opportunity.expectedHours || 8);
      const summary = sanitizeText(
        memberCompletionSummary ||
          `Completed practical tasks for ${opportunity.title}.`,
        1200
      );
      audit.push({
        date: today,
        actor: req.authUser!.name,
        state: "Completion submitted",
        detail: `Member submitted completion summary claiming ${hours} practical hours.`,
      });
      const updated = await db
        .update(placements)
        .set({
          workflowState: "Completion submitted",
          memberCompletionSummary: summary,
          claimedHours: hours,
          auditLog: audit,
          updatedAt: new Date(),
        })
        .where(eq(placements.id, placementId))
        .returning();

      if (placement.supervisorUserId) {
        await createNotification(
          placement.supervisorUserId,
          "placement",
          `Completion Submitted: ${opportunity.title}`,
          `${req.authUser!.name} submitted ${hours} hours for supervisor review.`,
          "opportunities"
        );
      }

      return res.json({ placement: updated[0] });
    }

    // 3. Completion submitted -> Supervisor reviewed (Authorised org staff only; member CANNOT review own placement)
    if (action === "supervisor_review") {
      if (placement.memberUserId === actorId) {
        return res.status(403).json({
          error: "Forbidden: Members cannot supervise or verify their own placement.",
        });
      }
      const check = await verifyOrgStaffPermission(actorId, placement.organisationId);
      if (!check.allowed || !check.membership) {
        return res.status(403).json({
          error:
            "Forbidden: Only an authorised supervisor of the host organisation can review this placement.",
        });
      }
      if (placement.workflowState !== "Completion submitted") {
        return res.status(400).json({
          error: `Placement must be in "Completion submitted" state before supervisor review (current: "${placement.workflowState}").`,
        });
      }

      const confHours = Math.max(
        0,
        Number(supervisorConfirmedHours) ?? placement.claimedHours
      );
      const assessed = Array.isArray(supervisorAssessedSkills)
        ? supervisorAssessedSkills.map((item: any) => ({
            skill: sanitizeText(item.skill, 80),
            proficiency: sanitizeText(item.proficiency || "Demonstrated in practice", 60),
            note: sanitizeText(item.note || "Observed during supervised shift", 200),
          }))
        : [];
      const revNote = sanitizeText(
        supervisorReviewNote ||
          "Attendance hours and demonstrated skills reviewed by supervisor.",
        800
      );

      audit.push({
        date: today,
        actor: `${req.authUser!.name} — ${check.membership.roleTitle}`,
        state: "Supervisor reviewed",
        detail: `Supervisor confirmed ${confHours} attendance hours and explicitly assessed ${assessed.length} skill(s).`,
      });

      const updated = await db
        .update(placements)
        .set({
          workflowState: "Supervisor reviewed",
          supervisorUserId: actorId,
          supervisorConfirmedHours: confHours,
          supervisorAssessedSkills: assessed,
          supervisorReviewNote: revNote,
          auditLog: audit,
          updatedAt: new Date(),
        })
        .where(eq(placements.id, placementId))
        .returning();

      await createNotification(
        placement.memberUserId,
        "placement",
        `Supervisor Reviewed Your Placement: ${opportunity.title}`,
        `${req.authUser!.name} reviewed your placement (${confHours} confirmed hours, ${assessed.length} assessed skills). Accept to finalise into your Talent Passport or raise a dispute.`,
        "opportunities"
      );

      return res.json({ placement: updated[0] });
    }

    // 4. Supervisor reviewed -> Disputed (Member only)
    if (action === "member_dispute") {
      if (placement.memberUserId !== actorId) {
        return res.status(403).json({
          error: "Forbidden: Only the placement member can dispute the supervisor review.",
        });
      }
      if (placement.workflowState !== "Supervisor reviewed") {
        return res.status(400).json({
          error: "Can only dispute a placement after supervisor review and before finalisation.",
        });
      }
      const dNote = sanitizeText(
        disputeNote || "Disputing confirmed hours or skill assessment.",
        600
      );
      audit.push({
        date: today,
        actor: req.authUser!.name,
        state: "Disputed",
        detail: `Member raised a dispute: ${dNote}`,
      });

      const updated = await db
        .update(placements)
        .set({
          workflowState: "Disputed",
          disputeNote: dNote,
          auditLog: audit,
          updatedAt: new Date(),
        })
        .where(eq(placements.id, placementId))
        .returning();

      await db.insert(reports).values({
        reporterUserId: actorId,
        targetType: "placement_dispute",
        targetId: placement.id,
        reason: `Placement Review Dispute: ${opportunity.title}`,
        details: dNote,
        status: "open",
      });

      return res.json({ placement: updated[0] });
    }

    // 5. Supervisor reviewed (or Disputed resolved by Admin) -> Finalised
    // CRITICAL INVARIANT: Finalised placements CANNOT double-count hours!
    if (action === "member_accept_finalise" || action === "admin_resolve_finalise") {
      if (
        placement.workflowState === "Finalised" ||
        placement.hoursEnteredToPassport
      ) {
        return res.status(400).json({
          error:
            "This placement is already finalised and its confirmed hours have already been recorded once in the Talent Passport.",
        });
      }

      if (action === "member_accept_finalise") {
        if (placement.memberUserId !== actorId) {
          return res.status(403).json({
            error: "Forbidden: Only the member can accept the supervisor review to finalise.",
          });
        }
        if (placement.workflowState !== "Supervisor reviewed") {
          return res.status(400).json({
            error: "Placement must be in 'Supervisor reviewed' state before member acceptance.",
          });
        }
      } else {
        if (req.authUser!.platformRole !== "admin") {
          return res.status(403).json({
            error: "Forbidden: Only a Platform Administrator can resolve a disputed placement.",
          });
        }
      }

      // Check database to guarantee no Passport record already references sourcePlacementId
      const existingPassportForPlacement = await db
        .select()
        .from(passportRecords)
        .where(eq(passportRecords.sourcePlacementId, placement.id));

      if (existingPassportForPlacement.length > 0) {
        return res.status(400).json({
          error: "Confirmed hours for this placement already exist in the Talent Passport.",
        });
      }

      const finalHours =
        typeof supervisorConfirmedHours === "number"
          ? supervisorConfirmedHours
          : placement.supervisorConfirmedHours;

      audit.push({
        date: today,
        actor: req.authUser!.name,
        state: "Finalised",
        detail: `Placement finalised. ${finalHours} confirmed attendance hours entered into Talent Passport once, with separate skill assessment record.`,
      });

      const updatedPlacement = await db
        .update(placements)
        .set({
          workflowState: "Finalised",
          supervisorConfirmedHours: finalHours,
          hoursEnteredToPassport: true,
          auditLog: audit,
          updatedAt: new Date(),
        })
        .where(eq(placements.id, placementId))
        .returning();

      const verifierLabel = opportunity.supervisorNameAndRole
        ? `${opportunity.supervisorNameAndRole} (${organisation.name})`
        : `${organisation.name} Representative`;

      // Record 1: Practical experience record (Attendance / Confirmed Hours ONLY)
      const expRecord = await db
        .insert(passportRecords)
        .values({
          userId: placement.memberUserId,
          recordCategory: "Practical experience",
          title: `${opportunity.opportunityType}: ${opportunity.title}`,
          issuerOrOrganisationName: organisation.name,
          organisationId: organisation.id,
          startDate: opportunity.startDate || today,
          endDate: opportunity.endDate || today,
          confirmedHours: finalHours,
          skillsDemonstrated: [], // Kept separate from competence assessment!
          publicSummary: `${
            organisation.isDemo ? "Fictional Demo Verification: " : ""
          }Completed ${finalHours} confirmed practical hours. Supervisor note: ${
            placement.supervisorReviewNote || "Satisfactory attendance."
          }`,
          evidenceReference: `PLACEMENT-FINAL-${placement.id}`,
          evidenceStatus: "Confirmed by an authorised organisation representative",
          verifierUserId: placement.supervisorUserId,
          verifierNameAndRole: verifierLabel,
          verifiedAt: new Date(),
          sourcePlacementId: placement.id,
          isDemo: Boolean(organisation.isDemo),
          verificationHistory: [
            {
              date: today,
              actor: verifierLabel,
              action: `Finalised placement attendance (${finalHours} confirmed hours)`,
              status: "Confirmed by an authorised organisation representative",
            },
          ],
        })
        .returning();

      // Record 2: Separate Skill Assessment record ONLY for skills explicitly assessed by the supervisor
      let skillRecord = null;
      const assessedList = placement.supervisorAssessedSkills || [];
      if (assessedList.length > 0) {
        const skillNames = assessedList.map((a) => a.skill);
        const detailsText = assessedList
          .map((a) => `${a.skill} (${a.proficiency}: ${a.note})`)
          .join("; ");

        const insertedSkillRec = await db
          .insert(passportRecords)
          .values({
            userId: placement.memberUserId,
            recordCategory: "Skill assessment",
            title: `Assessed Skills: ${opportunity.title}`,
            issuerOrOrganisationName: organisation.name,
            organisationId: organisation.id,
            startDate: today,
            endDate: today,
            confirmedHours: 0, // Competence record does not duplicate attendance hours
            skillsDemonstrated: skillNames,
            publicSummary: `${
              organisation.isDemo ? "Fictional Demo Verification: " : ""
            }Supervisor competency assessment: ${detailsText}`,
            evidenceReference: `ASSESS-FINAL-${placement.id}`,
            evidenceStatus: "Confirmed by an authorised organisation representative",
            verifierUserId: placement.supervisorUserId,
            verifierNameAndRole: verifierLabel,
            verifiedAt: new Date(),
            isDemo: Boolean(organisation.isDemo),
            verificationHistory: [
              {
                date: today,
                actor: verifierLabel,
                action: `Recorded separate competency assessment for ${skillNames.length} demonstrated skill(s)`,
                status: "Confirmed by an authorised organisation representative",
              },
            ],
          })
          .returning();
        skillRecord = insertedSkillRec[0];
      }

      await createNotification(
        placement.memberUserId,
        "verification",
        `Placement Finalised & Added to Talent Passport`,
        `${finalHours} confirmed hours and ${assessedList.length} assessed skill(s) from "${opportunity.title}" are now in your Talent Passport.`,
        "profile"
      );

      await logAudit(
        actorId,
        req.authUser!.name,
        "PLACEMENT_FINALISED",
        "placement",
        placement.id,
        `Finalised placement #${placement.id} (${finalHours} hrs) and generated Talent Passport record #${expRecord[0].id}.`
      );

      return res.json({
        placement: updatedPlacement[0],
        experienceRecord: expRecord[0],
        skillAssessmentRecord: skillRecord,
      });
    }

    return res.status(400).json({ error: "Unsupported placement transition action." });
  } catch (error) {
    console.error("Placement transition error:", error);
    res.status(500).json({ error: "Failed to transition placement state" });
  }
});

// ============================================================================
// 7. MESSAGING & NOTIFICATIONS MODULE
// ============================================================================

app.get("/api/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;

    const allMsgs = await db
      .select()
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));

    const partnerIds = new Set<number>();
    allMsgs.forEach((m) => {
      if (m.senderId !== userId) partnerIds.add(m.senderId);
      if (m.receiverId !== userId) partnerIds.add(m.receiverId);
    });

    // Also include accepted connections so the user can start a conversation easily
    const rels = await db
      .select()
      .from(socialRelationships)
      .where(
        and(
          or(
            eq(socialRelationships.requesterId, userId),
            eq(socialRelationships.targetId, userId)
          ),
          eq(socialRelationships.relType, "connection"),
          eq(socialRelationships.status, "accepted")
        )
      );
    rels.forEach((r) => {
      partnerIds.add(r.requesterId === userId ? r.targetId : r.requesterId);
    });

    const partners =
      partnerIds.size > 0
        ? await db
            .select({
              id: users.id,
              name: users.name,
              careerStage: users.careerStage,
              avatarUrl: users.avatarUrl,
              location: users.location,
            })
            .from(users)
            .where(inArray(users.id, Array.from(partnerIds)))
        : [];

    res.json({ messages: allMsgs, partners });
  } catch (error) {
    console.error("Failed loading messages:", error);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

// Send Message
// Server-enforced: Allowed between accepted connections OR between applicants and relevant employer staff,
// respecting blocks and receiver messaging privacy.
app.post("/api/messages", requireAuth, rateLimit(35, 60000), async (req: AuthRequest, res) => {
  try {
    const senderId = req.authUser!.id;
    const receiverId = Number(req.body.receiverId);
    const content = sanitizeText(req.body.content, 1200);

    if (!receiverId || !content) {
      return res.status(400).json({ error: "Recipient and message content are required." });
    }

    // Check block
    const blockRows = await db
      .select()
      .from(socialRelationships)
      .where(
        and(
          or(
            and(
              eq(socialRelationships.requesterId, senderId),
              eq(socialRelationships.targetId, receiverId)
            ),
            and(
              eq(socialRelationships.requesterId, receiverId),
              eq(socialRelationships.targetId, senderId)
            )
          ),
          eq(socialRelationships.relType, "block")
        )
      );

    if (blockRows.length > 0) {
      return res.status(403).json({
        error: "Messaging unavailable due to account block settings.",
      });
    }

    // Check accepted connection OR shared application/employer relationship
    const connRows = await db
      .select()
      .from(socialRelationships)
      .where(
        and(
          or(
            and(
              eq(socialRelationships.requesterId, senderId),
              eq(socialRelationships.targetId, receiverId)
            ),
            and(
              eq(socialRelationships.requesterId, receiverId),
              eq(socialRelationships.targetId, senderId)
            )
          ),
          eq(socialRelationships.relType, "connection"),
          eq(socialRelationships.status, "accepted")
        )
      );

    let allowedToMessage = connRows.length > 0;

    if (!allowedToMessage) {
      // Check if one applied to an opportunity managed by the other's organisation
      const senderOrgs = await db
        .select()
        .from(organisationMemberships)
        .where(eq(organisationMemberships.userId, senderId));
      const receiverOrgs = await db
        .select()
        .from(organisationMemberships)
        .where(eq(organisationMemberships.userId, receiverId));

      const allApps = await db
        .select({
          app: applications,
          opp: opportunities,
        })
        .from(applications)
        .innerJoin(opportunities, eq(applications.opportunityId, opportunities.id))
        .where(
          or(
            eq(applications.applicantUserId, senderId),
            eq(applications.applicantUserId, receiverId)
          )
        );

      const sOrgIds = senderOrgs.map((o) => o.organisationId);
      const rOrgIds = receiverOrgs.map((o) => o.organisationId);

      for (const item of allApps) {
        if (
          item.app.applicantUserId === senderId &&
          rOrgIds.includes(item.opp.organisationId)
        ) {
          allowedToMessage = true;
        }
        if (
          item.app.applicantUserId === receiverId &&
          sOrgIds.includes(item.opp.organisationId)
        ) {
          allowedToMessage = true;
        }
      }
    }

    // Also check receiver's messagingPrivacy if 'anyone'
    if (!allowedToMessage) {
      const targetUser = await db.select().from(users).where(eq(users.id, receiverId));
      if (targetUser.length > 0 && targetUser[0].messagingPrivacy === "anyone") {
        allowedToMessage = true;
      }
    }

    if (!allowedToMessage) {
      return res.status(403).json({
        error:
          "Messaging is restricted to accepted professional connections or active opportunity applicants and employer representatives.",
      });
    }

    const inserted = await db
      .insert(messages)
      .values({
        senderId,
        receiverId,
        content,
        isRead: false,
      })
      .returning();

    await createNotification(
      receiverId,
      "message",
      `New Message from ${req.authUser!.name}`,
      content.slice(0, 90),
      "messages"
    );

    res.status(201).json({ message: inserted[0] });
  } catch (error) {
    console.error("Failed sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

app.get("/api/notifications", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;
    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    res.json({ notifications: list });
  } catch (error) {
    console.error("Failed loading notifications:", error);
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

app.post("/api/notifications/read-all", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
    await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.receiverId, userId));
    res.json({ ok: true });
  } catch (error) {
    console.error("Failed marking notifications read:", error);
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

// ============================================================================
// 8. REPORTING, MODERATION & PLATFORM ADMINISTRATION WORKSPACE
// ============================================================================

app.post("/api/reports", requireAuth, rateLimit(15, 60000), async (req: AuthRequest, res) => {
  try {
    const reporterId = req.authUser!.id;
    const { targetType, targetId, reason, details } = req.body;
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: "Target and reason are required to submit a report." });
    }

    const inserted = await db
      .insert(reports)
      .values({
        reporterUserId: reporterId,
        targetType: sanitizeText(targetType, 40),
        targetId: Number(targetId),
        reason: sanitizeText(reason, 200),
        details: sanitizeText(details || "", 800),
        status: "open",
      })
      .returning();

    res.status(201).json({ report: inserted[0] });
  } catch (error) {
    console.error("Failed submitting report:", error);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

// Admin Overview (Protected by requireAdmin)
app.get("/api/admin/overview", requireAuth, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const allOrgs = await db
      .select()
      .from(organisations)
      .orderBy(desc(organisations.createdAt));

    const allReports = await db
      .select({
        report: reports,
        reporter: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(reports)
      .innerJoin(users, eq(reports.reporterUserId, users.id))
      .orderBy(desc(reports.createdAt));

    const disputedPlacements = await db
      .select({
        placement: placements,
        opportunity: opportunities,
        organisation: organisations,
        member: {
          id: users.id,
          name: users.name,
        },
      })
      .from(placements)
      .innerJoin(opportunities, eq(placements.opportunityId, opportunities.id))
      .innerJoin(organisations, eq(placements.organisationId, organisations.id))
      .innerJoin(users, eq(placements.memberUserId, users.id))
      .where(eq(placements.workflowState, "Disputed"));

    const allPassports = await db
      .select({
        record: passportRecords,
        member: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(passportRecords)
      .innerJoin(users, eq(passportRecords.userId, users.id))
      .orderBy(desc(passportRecords.updatedAt));

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        careerStage: users.careerStage,
        platformRole: users.platformRole,
        isRestricted: users.isRestricted,
        isDemo: users.isDemo,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    const audits = await db
      .select()
      .from(auditEvents)
      .orderBy(desc(auditEvents.createdAt));

    res.json({
      organisations: allOrgs,
      reports: allReports,
      disputedPlacements,
      passportRecords: allPassports,
      users: allUsers,
      auditEvents: audits,
    });
  } catch (error) {
    console.error("Failed loading admin overview:", error);
    res.status(500).json({ error: "Failed to load administrator workspace" });
  }
});

// Admin: Approve / Reject / Suspend Organisation
app.post(
  "/api/admin/organisations/:id/decision",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const orgId = Number(req.params.id);
      const { status, note } = req.body; // 'approved' | 'rejected' | 'suspended' | 'pending'

      const updated = await db
        .update(organisations)
        .set({
          verificationStatus: sanitizeText(status, 30),
          verifiedByAdminId: req.authUser!.id,
          verifiedAt: new Date(),
          verificationEvidenceNote: note
            ? sanitizeText(note, 500)
            : undefined,
        })
        .where(eq(organisations.id, orgId))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: "Organisation not found" });
      }

      await logAudit(
        req.authUser!.id,
        req.authUser!.name,
        `ORG_${status.toUpperCase()}`,
        "organisation",
        orgId,
        `Administrator set organisation "${updated[0].name}" status to ${status}.`
      );

      res.json({ organisation: updated[0] });
    } catch (error) {
      console.error("Failed updating org status:", error);
      res.status(500).json({ error: "Failed to update organisation approval" });
    }
  }
);

// Admin: Resolve Report
app.post(
  "/api/admin/reports/:id/resolve",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const reportId = Number(req.params.id);
      const { status, adminResolutionNote } = req.body; // 'resolved' | 'dismissed'

      const updated = await db
        .update(reports)
        .set({
          status: sanitizeText(status || "resolved", 30),
          adminResolutionNote: sanitizeText(adminResolutionNote || "Reviewed by admin", 500),
          resolvedByAdminId: req.authUser!.id,
          resolvedAt: new Date(),
        })
        .where(eq(reports.id, reportId))
        .returning();

      await logAudit(
        req.authUser!.id,
        req.authUser!.name,
        "REPORT_RESOLVED",
        "report",
        reportId,
        `Resolved report #${reportId} (${status}): ${adminResolutionNote || ""}`
      );

      res.json({ report: updated[0] });
    } catch (error) {
      console.error("Failed resolving report:", error);
      res.status(500).json({ error: "Failed to resolve report" });
    }
  }
);

// Admin: Restrict / Unrestrict User Account
app.post(
  "/api/admin/users/:id/restrict",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const targetUserId = Number(req.params.id);
      const { isRestricted } = req.body;

      if (targetUserId === req.authUser!.id) {
        return res.status(400).json({ error: "Cannot restrict your own admin account." });
      }

      const updated = await db
        .update(users)
        .set({ isRestricted: Boolean(isRestricted), updatedAt: new Date() })
        .where(eq(users.id, targetUserId))
        .returning();

      await logAudit(
        req.authUser!.id,
        req.authUser!.name,
        isRestricted ? "USER_RESTRICTED" : "USER_UNRESTRICTED",
        "user",
        targetUserId,
        `${isRestricted ? "Restricted" : "Restored"} account access for ${updated[0].name}.`
      );

      res.json({ user: updated[0] });
    } catch (error) {
      console.error("Failed updating user restriction:", error);
      res.status(500).json({ error: "Failed to update account restriction" });
    }
  }
);

// Curated Career Pathways endpoint
app.get("/api/career-pathways", requireAuth, async (_req: AuthRequest, res) => {
  res.json({ pathways: CURATED_CAREER_PATHWAYS });
});

// ============================================================================
// VITE DEV SERVER OR STATIC PRODUCTION SERVING
// ============================================================================

async function startServer() {
  const PORT = 3000;
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TourBridge server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
