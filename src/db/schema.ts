import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users & Member Profiles (auth & members modules)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase UID or demo UID
  email: text("email").notNull(),
  name: text("name").notNull(),
  preferredName: text("preferred_name").default(""),
  avatarUrl: text("avatar_url").default(""),
  bio: text("bio").default(""),
  location: text("location").default("Harare, Zimbabwe"),
  willingToRelocate: boolean("willing_to_relocate").default(true),
  preferredLocations: jsonb("preferred_locations").$type<string[]>().default([]),
  accountPurpose: text("account_purpose").default("career"), // 'career' | 'business' | 'institution'
  careerStage: text("career_stage").default("Currently studying"), // editable profile attribute, NOT access control
  tourismInterests: jsonb("tourism_interests").$type<string[]>().default([]),
  immediateCareerGoal: text("immediate_career_goal").default(""),
  selectedPathwayId: text("selected_pathway_id").default("safari-guide"),
  opportunityTypes: jsonb("opportunity_types").$type<string[]>().default([]),
  availability: text("availability").default("Flexible / Weekends"),
  profileVisibility: text("profile_visibility").default("public"), // 'public' | 'connections_only' | 'private'
  employerDiscoverable: boolean("employer_discoverable").default(true),
  messagingPrivacy: text("messaging_privacy").default("connections_and_employers"), // 'anyone' | 'connections_and_employers' | 'connections_only'
  dataSaverMode: boolean("data_saver_mode").default(false),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingStep: integer("onboarding_step").default(1),
  onboardingAnswers: jsonb("onboarding_answers").$type<Record<string, any>>().default({}),
  platformRole: text("platform_role").default("member"), // 'member' | 'admin' (Server-enforced access role)
  isRestricted: boolean("is_restricted").default(false),
  isDemo: boolean("is_demo").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 2. Organisations & Memberships (organisations module)
export const organisations = pgTable("organisations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  orgType: text("org_type").notNull(), // 'Lodge / Camp' | 'Hotel / Resort' | 'Tour Operator' | 'Travel Agency' | 'Training Institution' | 'Conservation Partner'
  location: text("location").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").default(""),
  website: text("website").default(""),
  description: text("description").notNull(),
  servicesOrProgrammes: jsonb("services_or_programmes").$type<string[]>().default([]),
  logoUrl: text("logo_url").default(""),
  bannerUrl: text("banner_url").default(""),
  verificationStatus: text("verification_status").default("pending").notNull(), // 'pending' | 'approved' | 'rejected' | 'suspended'
  verificationEvidenceNote: text("verification_evidence_note").default(""), // Private note/document ref
  verificationPrivateDocId: integer("verification_private_doc_id"),
  verifiedByAdminId: integer("verified_by_admin_id"),
  verifiedAt: timestamp("verified_at"),
  isDemo: boolean("is_demo").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const organisationMemberships = pgTable("organisation_memberships", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id")
    .references(() => organisations.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  roleTitle: text("role_title").notNull(), // e.g., 'General Manager', 'Lodge Supervisor', 'Academic Registrar'
  permissionLevel: text("permission_level").default("staff").notNull(), // 'owner' | 'staff' | 'supervisor'
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 3. Social Feed & Relationships (social module)
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  organisationId: integer("organisation_id").references(() => organisations.id, {
    onDelete: "set null",
  }),
  postType: text("post_type").notNull(), // 'Work showcase' | 'Learning update' | 'Achievement' | 'Industry update'
  caption: text("caption").notNull(),
  mediaUrl: text("media_url").default(""),
  mediaType: text("media_type").default("image"), // 'image' | 'video' | 'none'
  thumbnailUrl: text("thumbnail_url").default(""),
  skillTags: jsonb("skill_tags").$type<string[]>().default([]),
  locationTag: text("location_tag").default(""),
  linkedPortfolioId: integer("linked_portfolio_id"),
  linkedPassportId: integer("linked_passport_id"),
  linkedOpportunityId: integer("linked_opportunity_id"),
  likesCount: integer("likes_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  savesCount: integer("saves_count").default(0).notNull(),
  isDemo: boolean("is_demo").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const postInteractions = pgTable("post_interactions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .references(() => posts.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  interactionType: text("interaction_type").notNull(), // 'like' | 'save'
  createdAt: timestamp("created_at").defaultNow(),
});

export const postComments = pgTable("post_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .references(() => posts.id, { onDelete: "cascade" })
    .notNull(),
  authorId: integer("author_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const socialRelationships = pgTable("social_relationships", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  targetId: integer("target_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  relType: text("rel_type").notNull(), // 'follow' | 'connection' | 'block'
  status: text("status").default("accepted").notNull(), // 'pending' | 'accepted' | 'rejected'
  createdAt: timestamp("created_at").defaultNow(),
});

// 4. Portfolio Items (portfolio module)
export const portfolioItems = pgTable("portfolio_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  mediaUrl: text("media_url").default(""),
  mediaType: text("media_type").default("image"), // 'image' | 'video' | 'document'
  skillTags: jsonb("skill_tags").$type<string[]>().default([]),
  roleContext: text("role_context").default(""),
  projectDate: text("project_date").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

// 5. Talent Passport & Verification (passport module)
export const passportRecords = pgTable("passport_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  recordCategory: text("record_category").notNull(), // 'Education' | 'Certificate' | 'Achievement' | 'Practical experience' | 'Skill assessment'
  title: text("title").notNull(),
  issuerOrOrganisationName: text("issuer_or_organisation_name").notNull(),
  organisationId: integer("organisation_id").references(() => organisations.id, {
    onDelete: "set null",
  }),
  startDate: text("start_date").default(""),
  endDate: text("end_date").default(""),
  confirmedHours: integer("confirmed_hours").default(0).notNull(), // Only > 0 when confirmed/finalised
  skillsDemonstrated: jsonb("skills_demonstrated").$type<string[]>().default([]),
  publicSummary: text("public_summary").notNull(),
  evidenceReference: text("evidence_reference").default(""),
  privateEvidenceDocId: integer("private_evidence_doc_id"),
  evidenceStatus: text("evidence_status").default("Self-declared").notNull(),
  // Allowed statuses:
  // 'Self-declared' | 'Submitted for review' | 'Confirmed by an authorised organisation representative' | 'Institution-issued credential' | 'Disputed' | 'Revoked'
  verifierUserId: integer("verifier_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  verifierNameAndRole: text("verifier_name_and_role").default(""),
  verifiedAt: timestamp("verified_at"),
  disputeReason: text("dispute_reason").default(""),
  sourcePlacementId: integer("source_placement_id"), // Prevents double-counting placement hours
  verificationHistory: jsonb("verification_history")
    .$type<Array<{ date: string; actor: string; action: string; status: string; note?: string }>>()
    .default([]),
  isDemo: boolean("is_demo").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 6. Private Uploads / Evidence Vault (privacy & object storage adapter)
export const privateDocuments = pgTable("private_documents", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("owner_user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  organisationId: integer("organisation_id").references(() => organisations.id, {
    onDelete: "set null",
  }),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  dataUriOrContent: text("data_uri_or_content").notNull(), // Protected on server; never exposed via public URL
  documentPurpose: text("document_purpose").notNull(), // 'passport_evidence' | 'org_verification' | 'application_attachment'
  createdAt: timestamp("created_at").defaultNow(),
});

// 7. Opportunities, Applications & Placements (opportunities, applications, placements modules)
export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id")
    .references(() => organisations.id, { onDelete: "cascade" })
    .notNull(),
  createdByUserId: integer("created_by_user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  opportunityType: text("opportunity_type").notNull(), // 'Job' | 'Internship' | 'Apprenticeship' | 'Skill2Shift'
  location: text("location").notNull(),
  description: text("description").notNull(),
  tasks: jsonb("tasks").$type<string[]>().default([]),
  requiredSkills: jsonb("required_skills").$type<string[]>().default([]),
  eligibility: text("eligibility").notNull(),
  startDate: text("start_date").default(""),
  endDate: text("end_date").default(""),
  expectedHours: integer("expected_hours").default(0).notNull(),
  compensationType: text("compensation_type").notNull(), // 'Paid salary/wage' | 'Stipend / Allowance' | 'Unpaid learning placement'
  compensationAmount: text("compensation_amount").default(""),
  transportProvided: boolean("transport_provided").default(false).notNull(),
  mealsProvided: boolean("meals_provided").default(false).notNull(),
  accommodationProvided: boolean("accommodation_provided").default(false).notNull(),
  applicationDeadline: text("application_deadline").notNull(),
  supervisorNameAndRole: text("supervisor_name_and_role").default(""),
  assessmentExpectations: text("assessment_expectations").default(""),
  status: text("status").default("open").notNull(), // 'open' | 'closed'
  isDemo: boolean("is_demo").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id")
    .references(() => opportunities.id, { onDelete: "cascade" })
    .notNull(),
  applicantUserId: integer("applicant_user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  supportingMessage: text("supporting_message").notNull(),
  attachedPassportIds: jsonb("attached_passport_ids").$type<number[]>().default([]),
  status: text("status").default("Submitted").notNull(), // 'Submitted' | 'Shortlisted' | 'Accepted' | 'Rejected' | 'Withdrawn'
  employerNotes: text("employer_notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const placements = pgTable("placements", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  opportunityId: integer("opportunity_id")
    .references(() => opportunities.id, { onDelete: "cascade" })
    .notNull(),
  organisationId: integer("organisation_id")
    .references(() => organisations.id, { onDelete: "cascade" })
    .notNull(),
  memberUserId: integer("member_user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  workflowState: text("workflow_state").default("Terms confirmed").notNull(),
  // States: 'Terms confirmed' | 'In progress' | 'Completion submitted' | 'Supervisor reviewed' | 'Disputed' | 'Finalised'
  memberCompletionSummary: text("member_completion_summary").default(""),
  claimedHours: integer("claimed_hours").default(0).notNull(),
  supervisorUserId: integer("supervisor_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  supervisorConfirmedHours: integer("supervisor_confirmed_hours").default(0).notNull(),
  supervisorAssessedSkills: jsonb("supervisor_assessed_skills")
    .$type<Array<{ skill: string; proficiency: string; note: string }>>()
    .default([]),
  supervisorReviewNote: text("supervisor_review_note").default(""),
  disputeNote: text("dispute_note").default(""),
  hoursEnteredToPassport: boolean("hours_entered_to_passport").default(false).notNull(),
  auditLog: jsonb("audit_log")
    .$type<Array<{ date: string; actor: string; state: string; detail: string }>>()
    .default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 8. Messaging & Notifications (messaging, notifications modules)
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  receiverId: integer("receiver_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  applicationContextId: integer("application_context_id"),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  category: text("category").notNull(), // 'connection' | 'application' | 'placement' | 'verification' | 'comment' | 'message'
  title: text("title").notNull(),
  body: text("body").notNull(),
  linkTab: text("link_tab").default("home"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 9. Moderation & Audit Logs (moderation module)
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterUserId: integer("reporter_user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  targetType: text("target_type").notNull(), // 'post' | 'user' | 'credential' | 'placement_dispute' | 'organisation'
  targetId: integer("target_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details").default(""),
  status: text("status").default("open").notNull(), // 'open' | 'resolved' | 'dismissed'
  adminResolutionNote: text("admin_resolution_note").default(""),
  resolvedByAdminId: integer("resolved_by_admin_id"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const auditEvents = pgTable("audit_events", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id"),
  actorName: text("actor_name").notNull(),
  actionType: text("action_type").notNull(), // e.g., 'ORG_APPROVED', 'PLACEMENT_FINALISED', 'PASSPORT_REVOKED', 'DISPUTE_RESOLVED'
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
