import React, { useState, useEffect } from "react";
import { CURATED_CAREER_PATHWAYS } from "../constants/pathways.ts";

interface ProfileAndPassportViewProps {
  currentUser: any;
  viewedUserId: number;
  myMemberships: any[];
  allOrganisations: any[];
  opportunities: any[];
  placements?: any[];
  viewMode?: "passport" | "edit";
  dataSaverMode: boolean;
  apiFetch: (url: string, options?: RequestInit) => Promise<any>;
  onRefreshSession: () => Promise<void>;
  onOpenOnboardingEdit: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenMessagingWithUser: (userId: number) => void;
  onOpenOrgModal: (orgId: number) => void;
}

const G: Record<string, [string, string]> = {
  teal: ["#0b5d66", "#1b8a8f"],
  coral: ["#e8734a", "#f2a65a"],
  navy: ["#1f3a5f", "#3d6a9e"],
  sand: ["#c9a27a", "#e7c9a0"],
  forest: ["#2f6b4f", "#74a57f"],
  plum: ["#6a3d6e", "#b06a8f"],
  dusk: ["#37306b", "#e07a5f"],
};
const PALETTE_KEYS = ["teal", "coral", "forest", "dusk", "navy", "plum", "sand"];
const grad = (k: string, a = 135) => {
  const pair = G[k] || G.teal;
  return `linear-gradient(${a}deg, ${pair[0]}, ${pair[1]})`;
};
const pickColorKey = (idOrName: string | number) => {
  const n =
    typeof idOrName === "number"
      ? idOrName
      : String(idOrName)
          .split("")
          .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return PALETTE_KEYS[n % PALETTE_KEYS.length];
};
const getInitials = (name?: string) => {
  if (!name) return "TH";
  const parts = name.replace(/\(.*\)/g, "").trim().split(/\s+/);
  return (
    (parts[0]?.[0] || "") + (parts[1]?.[0] || parts[0]?.[1] || "")
  ).toUpperCase();
};

const PRESET_PORTFOLIO_MEDIA = [
  {
    label: "Nyanga Front Office",
    url: "/src/assets/images/nyanga_front_office_1791386453942.jpg",
    k: "navy",
  },
  {
    label: "Zambezi Canopy Eco-Lodge",
    url: "/src/assets/images/vicfalls_lodge_safari_1791386419455.jpg",
    k: "teal",
  },
  {
    label: "Hwange Walking Safari",
    url: "/src/assets/images/hwange_safari_guiding_1791386430930.jpg",
    k: "forest",
  },
  {
    label: "Culinary Fine Plating",
    url: "/src/assets/images/harare_culinary_plating_1791386442823.jpg",
    k: "coral",
  },
];

const CloseSvg = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

const PinSvg = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
);

const VerifiedBadgeSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#0b5d66">
    <path d="m12 2 2.4 1.9 3-.2 1 2.9 2.6 1.6-.8 3 .8 3-2.6 1.6-1 2.9-3-.2L12 22l-2.4-1.9-3 .2-1-2.9L3 15.8l.8-3-.8-3 2.6-1.6 1-2.9 3 .2L12 2Z" />
    <path
      d="m8.6 12.2 2.4 2.4 4.4-4.8"
      stroke="#fff"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ProfileAndPassportView: React.FC<ProfileAndPassportViewProps> = ({
  currentUser,
  viewedUserId,
  myMemberships,
  allOrganisations,
  placements = [],
  viewMode = "passport",
  apiFetch,
  onRefreshSession,
  onOpenOnboardingEdit,
  onNavigateTab,
  onOpenMessagingWithUser,
  onOpenOrgModal,
}) => {
  const [profileData, setProfileData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "passport" | "portfolio" | "journey" | "settings"
  >(viewMode === "edit" ? "settings" : "passport");

  useEffect(() => {
    setActiveTab(viewMode === "edit" ? "settings" : "passport");
  }, [viewMode]);
  const [passportCatFilter, setPassportCatFilter] = useState<string>("all");
  const [portfolioViewMode, setPortfolioViewMode] = useState<"cards" | "grid">(
    "cards"
  );
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Slide-up sheets (.cp)
  const [showAddPassport, setShowAddPassport] = useState(false);
  const [showAddOrgModal, setShowAddOrgModal] = useState(false);
  const [viewingPrivateDoc, setViewingPrivateDoc] = useState<any | null>(null);
  const [editingRecordSheet, setEditingRecordSheet] = useState<{
    type: "passport" | "placement";
    record: any;
    mode: "submit_for_review" | "self_declare";
    claimedHours: number;
    organisationId: string;
    issuerOrOrganisationName: string;
    skillsText: string;
    publicSummary: string;
    privateNote: string;
  } | null>(null);

  // Forms
  const [passportForm, setPassportForm] = useState({
    recordCategory: "Certificate",
    title: "",
    issuerOrOrganisationName: "",
    organisationId: "",
    startDate: "2026-09",
    endDate: "2026-10",
    skillsText: "Wilderness First Aid, Guest Safety & Bush Briefing",
    publicSummary: "",
    evidenceReference: "",
    submitForReview: true,
    privateDocFileName: "certificate_evidence.txt",
    privateDocContent: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    preferredName: "",
    bio: "",
    location: "",
    careerStage: "",
    immediateCareerGoal: "",
    selectedPathwayId: "",
    availability: "",
    profileVisibility: "public",
    employerDiscoverable: true,
    messagingPrivacy: "connections_and_employers",
    dataSaverMode: false,
  });

  const [newOrgForm, setNewOrgForm] = useState({
    name: "",
    orgType: "Lodge / Camp",
    location: "Victoria Falls, Matabeleland North",
    contactEmail: currentUser?.email || "",
    contactPhone: "+263 ",
    website: "",
    description: "",
    servicesText: "Guided Safaris, Hospitality Placements",
    roleTitle: "Operations Manager",
    verificationEvidenceNote: "",
    privateDocContent: "",
  });

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/members/${viewedUserId}`);
      setProfileData(data);
      if (data.member) {
        setEditForm({
          name: data.member.name || "",
          preferredName: data.member.preferredName || "",
          bio: data.member.bio || "",
          location: data.member.location || "",
          careerStage: data.member.careerStage || "Currently studying",
          immediateCareerGoal: data.member.immediateCareerGoal || "",
          selectedPathwayId: data.member.selectedPathwayId || "front-office",
          availability: data.member.availability || "",
          profileVisibility: data.member.profileVisibility || "public",
          employerDiscoverable: Boolean(data.member.employerDiscoverable),
          messagingPrivacy:
            data.member.messagingPrivacy || "connections_and_employers",
          dataSaverMode: Boolean(data.member.dataSaverMode),
        });
      }
    } catch (err: any) {
      setFeedback({ type: "err", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [viewedUserId]);

  if (loading) {
    return (
      <div className="loader">
        <div className="spin" />
      </div>
    );
  }

  if (!profileData || !profileData.member) {
    return (
      <div className="sEmpty">
        <b>Profile unavailable</b>
        Unable to load member profile or visibility is restricted.
      </div>
    );
  }

  const {
    member,
    portfolio = [],
    passport = [],
    confirmedPracticalHours = 0,
    assessedSkills = [],
    memberships = [],
    relationships = [],
    recommendations,
  } = profileData;

  const isOwnProfile = currentUser?.id === member.id;
  const k = pickColorKey(member.name || "TM");

  const isFollowing = relationships.some(
    (r: any) =>
      r.requesterId === currentUser?.id &&
      r.targetId === member.id &&
      r.relType === "follow"
  );
  const connectionRecord = relationships.find(
    (r: any) =>
      ((r.requesterId === currentUser?.id && r.targetId === member.id) ||
        (r.requesterId === member.id && r.targetId === currentUser?.id)) &&
      r.relType === "connection"
  );

  const handleToggleRelationship = async (relType: string, action: string) => {
    try {
      await apiFetch("/api/relationships", {
        method: "POST",
        body: JSON.stringify({
          targetId: member.id,
          relType,
          action,
        }),
      });
      await loadProfile();
    } catch (err: any) {
      setFeedback({ type: "err", text: err.message });
    }
  };

  const handleAddPassportRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/passport", {
        method: "POST",
        body: JSON.stringify({
          recordCategory: passportForm.recordCategory,
          title: passportForm.title,
          issuerOrOrganisationName: passportForm.issuerOrOrganisationName,
          organisationId: passportForm.organisationId
            ? Number(passportForm.organisationId)
            : null,
          startDate: passportForm.startDate,
          endDate: passportForm.endDate,
          skillsDemonstrated: passportForm.skillsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          publicSummary: passportForm.publicSummary,
          evidenceReference: passportForm.evidenceReference,
          submitForReview: passportForm.submitForReview,
          privateDocFileName: passportForm.privateDocFileName,
          privateDocContent: passportForm.privateDocContent,
        }),
      });
      setShowAddPassport(false);
      setPassportForm({
        ...passportForm,
        title: "",
        publicSummary: "",
        privateDocContent: "",
      });
      setFeedback({
        type: "ok",
        text: "Record added to Talent Passport (Self-declared until verified)",
      });
      await loadProfile();
      await onRefreshSession();
    } catch (err: any) {
      setFeedback({ type: "err", text: err.message });
    }
  };

  const handleVerifyRecord = async (
    recordId: number,
    action: string,
    confirmedHours?: number,
    note?: string
  ) => {
    setFeedback(null);
    try {
      await apiFetch(`/api/passport/${recordId}/verify`, {
        method: "POST",
        body: JSON.stringify({ action, confirmedHours, note }),
      });
      setFeedback({
        type: "ok",
        text: `Passport record updated (${action}).`,
      });
      await loadProfile();
      await onRefreshSession();
    } catch (err: any) {
      setFeedback({ type: "err", text: err.message });
    }
  };

  const handleViewPrivateEvidence = async (docId: number) => {
    setFeedback(null);
    try {
      const data = await apiFetch(`/api/private-documents/${docId}`);
      setViewingPrivateDoc(data.document);
    } catch (err: any) {
      setFeedback({ type: "err", text: err.message });
    }
  };

  const handleSaveProfileEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/members/${member.id}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      setFeedback({ type: "ok", text: "Profile & privacy preferences saved" });
      await loadProfile();
      await onRefreshSession();
    } catch (err: any) {
      setFeedback({ type: "err", text: err.message });
    }
  };

  const handleRegisterNewOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/organisations", {
        method: "POST",
        body: JSON.stringify({
          ...newOrgForm,
          servicesOrProgrammes: newOrgForm.servicesText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      setShowAddOrgModal(false);
      setFeedback({
        type: "ok",
        text: "Organisation submitted in Pending status for admin review",
      });
      await loadProfile();
      await onRefreshSession();
    } catch (err: any) {
      setFeedback({ type: "err", text: err.message });
    }
  };

  const activePathway =
    CURATED_CAREER_PATHWAYS.find((p) => p.id === member.selectedPathwayId) ||
    CURATED_CAREER_PATHWAYS[0];

  const verifiedRecordsCount = passport.filter(
    (r: any) =>
      r.evidenceStatus ===
        "Confirmed by an authorised organisation representative" ||
      r.evidenceStatus === "Institution-issued credential"
  ).length;
  const passportPct =
    passport.length > 0
      ? Math.round((verifiedRecordsCount / passport.length) * 100)
      : 0;
  const ringR = 28;
  const ringC = 2 * Math.PI * ringR;
  const ringOff = ringC * (1 - passportPct / 100);

  const filteredPassportRecords = passport.filter((rec: any) => {
    const isVerified =
      rec.evidenceStatus ===
        "Confirmed by an authorised organisation representative" ||
      rec.evidenceStatus === "Institution-issued credential";
    const isSelfDeclared = rec.evidenceStatus === "Self-declared";

    // Only Verified skills/certificates or Self-declared skills/certificates are recorded in the user's Passport
    // (Submitted for review records only enter the Passport once verified)
    if (!isVerified && !isSelfDeclared) {
      return false;
    }

    if (passportCatFilter === "all") return true;
    return rec.recordCategory === passportCatFilter;
  });

  return (
    <div className="pb-12">
      {/* Feedback banner in exact T&H palette */}
      {feedback && (
        <div
          className="mx-4 mt-3 p-3 rounded-2xl text-xs font-semibold flex items-center justify-between"
          style={{
            background: feedback.type === "ok" ? "#e6f2f3" : "#fdece5",
            color: feedback.type === "ok" ? "#0b5d66" : "#b84a22",
          }}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* T&H Deep Teal Summary Hero Card (.rmSum) — shown in Talent Passport mode */}
      {viewMode !== "edit" && (
        <div className="px-4 pt-4">
          <div className="rmSum">
            <div className="rmTop">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="avatar !w-12 !h-12 !rounded-2xl border-2 border-white/30"
                  style={{
                    background: member.avatarUrl
                      ? `url(${member.avatarUrl}) center/cover`
                      : grad(k),
                  }}
                >
                  {!member.avatarUrl && getInitials(member.name)}
                </div>
                <div className="min-w-0">
                  <small className="block truncate">
                    {member.careerStage} · {member.location}
                  </small>
                  <h2 className="truncate">{member.name}</h2>
                </div>
              </div>
              <div className="rmRing">
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r={ringR}
                    fill="none"
                    stroke="rgba(255,255,255,.25)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r={ringR}
                    fill="none"
                    stroke="#fff"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={ringC}
                    strokeDashoffset={ringOff}
                  />
                </svg>
                <b>{confirmedPracticalHours}h</b>
              </div>
            </div>

            <div className="rmBar">
              <i style={{ width: `${Math.max(12, passportPct)}%` }} />
            </div>

            <div className="rmMeta">
              <span>{confirmedPracticalHours} hrs confirmed attendance</span>
              <span>
                {verifiedRecordsCount}/{passport.length} verified records ·{" "}
                {assessedSkills.length} skills
              </span>
            </div>

            <div className="rmNext">
              <b>Assessed Competence: </b>
              {assessedSkills.length > 0
                ? assessedSkills.join(" · ")
                : "Complete a supervised placement to earn verified skill assessments."}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons Row (.pBtns) — + Add Certificate / Credential & Optional + Org Role */}
      {viewMode !== "edit" && (
        <div className="pBtns">
          {isOwnProfile ? (
            <>
              <button
                type="button"
                className="pBtn primary"
                onClick={() => {
                  setPassportForm({
                    ...passportForm,
                    recordCategory: "Certificate",
                    submitForReview: false,
                  });
                  setShowAddPassport(true);
                }}
              >
                + Add Certificate / Skill
              </button>
              <button
                type="button"
                className="pBtn"
                onClick={() => setShowAddOrgModal(true)}
              >
                + Org Role (Optional)
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`pBtn ${isFollowing ? "" : "primary"}`}
                onClick={() =>
                  handleToggleRelationship(
                    "follow",
                    isFollowing ? "remove" : "create"
                  )
                }
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
              {!connectionRecord ? (
                <button
                  type="button"
                  className="pBtn primary"
                  onClick={() =>
                    handleToggleRelationship("connection", "create")
                  }
                >
                  Connect
                </button>
              ) : connectionRecord.status === "pending" &&
                connectionRecord.targetId === currentUser?.id ? (
                <button
                  type="button"
                  className="pBtn primary"
                  onClick={() =>
                    handleToggleRelationship("connection", "accept")
                  }
                >
                  Accept Connect
                </button>
              ) : (
                <button type="button" className="pBtn">
                  {connectionRecord.status}
                </button>
              )}
              <button
                type="button"
                className="pBtn"
                onClick={() => onOpenMessagingWithUser(member.id)}
              >
                Message
              </button>
            </>
          )}
        </div>
      )}

      {/* =====================================================================
          TALENT PASSPORT RECORDS (No Passport/Portfolio/Pathway segmented tab bar)
      ===================================================================== */}
      {viewMode !== "edit" && (
        <>
          <div className="px-4 pt-1 border-b border-[#e8eaee]">
            <div className="sChips">
              {[
                { id: "all", label: `All (${passport.length})` },
                { id: "Practical experience", label: "Practical experience" },
                { id: "Certificate", label: "Certificates" },
                { id: "Education", label: "Education" },
                { id: "Achievement", label: "Achievements" },
              ].map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setPassportCatFilter(ch.id)}
                  className={`sChip ${passportCatFilter === ch.id ? "on" : ""}`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sSec">
            {/* Unified Placement Records inside Talent Passport */}
            {placements.filter(
              (p: any) =>
                p.placement.memberUserId === member.id ||
                myMemberships.some(
                  (m: any) => m.organisation.id === p.placement.organisationId
                )
            ).length > 0 && (
              <>
                <div className="sSecHead">
                  <h3>Practical Placements &amp; Skill Submissions</h3>
                  <span>Corresponds with Tours Roadmap</span>
                </div>
                {placements
                  .filter(
                    (p: any) =>
                      p.placement.memberUserId === member.id ||
                      myMemberships.some(
                        (m: any) =>
                          m.organisation.id === p.placement.organisationId
                      )
                  )
                  .map(({ placement, opportunity, organisation }: any) => {
                    const isMember =
                      placement.memberUserId === currentUser?.id;
                    const isSupervisor = myMemberships.some(
                      (m: any) =>
                        m.organisation.id === placement.organisationId
                    );
                    const defaultSkillList =
                      Array.isArray(opportunity.requiredSkills) &&
                      opportunity.requiredSkills.length > 0
                        ? opportunity.requiredSkills.join(", ")
                        : activePathway.coreSkills.slice(0, 2).join(", ");

                    return (
                      <div key={`pl-${placement.id}`} className="opp">
                        <div className="top">
                          <span className="otype vol">
                            Placement · {opportunity.opportunityType}
                          </span>
                          <span className="pill">
                            {placement.workflowState}
                          </span>
                        </div>
                        <h4>{opportunity.title}</h4>
                        <p>
                          {organisation.name.replace(
                            /\s*\(Fictional Demo\)/i,
                            ""
                          )}{" "}
                          · {placement.claimedHours}h claimed ·{" "}
                          {placement.supervisorConfirmedHours}h confirmed
                        </p>
                        {placement.memberCompletionSummary && (
                          <p className="mt-1.5 !text-[#0f1720]">
                            {placement.memberCompletionSummary}
                          </p>
                        )}
                        <div className="bot">
                          <div className="facts">
                            {(opportunity.requiredSkills || []).map(
                              (sk: string) => (
                                <span key={sk}>{sk}</span>
                              )
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isMember &&
                              placement.workflowState !== "Finalised" && (
                                <>
                                  <button
                                    type="button"
                                    className="fol"
                                    onClick={() =>
                                      setEditingRecordSheet({
                                        type: "placement",
                                        record: {
                                          placement,
                                          opportunity,
                                          organisation,
                                        },
                                        mode: "submit_for_review",
                                        claimedHours:
                                          placement.claimedHours ||
                                          opportunity.expectedHours ||
                                          40,
                                        organisationId: String(
                                          organisation.id || ""
                                        ),
                                        issuerOrOrganisationName:
                                          organisation.name.replace(
                                            /\s*\(Fictional Demo\)/i,
                                            ""
                                          ),
                                        skillsText: defaultSkillList,
                                        publicSummary:
                                          placement.memberCompletionSummary ||
                                          `Completed practical shifts for ${opportunity.title}, demonstrating ${defaultSkillList}.`,
                                        privateNote: "",
                                      })
                                    }
                                  >
                                    Submit Review
                                  </button>
                                  <button
                                    type="button"
                                    className="fol on"
                                    onClick={() =>
                                      setEditingRecordSheet({
                                        type: "placement",
                                        record: {
                                          placement,
                                          opportunity,
                                          organisation,
                                        },
                                        mode: "self_declare",
                                        claimedHours:
                                          placement.claimedHours ||
                                          opportunity.expectedHours ||
                                          40,
                                        organisationId: String(
                                          organisation.id || ""
                                        ),
                                        issuerOrOrganisationName:
                                          organisation.name.replace(
                                            /\s*\(Fictional Demo\)/i,
                                            ""
                                          ),
                                        skillsText: defaultSkillList,
                                        publicSummary:
                                          placement.memberCompletionSummary ||
                                          `Self-declared practical hours and skills for ${opportunity.title}: ${defaultSkillList}.`,
                                        privateNote: "",
                                      })
                                    }
                                  >
                                    Self Declare
                                  </button>
                                </>
                              )}
                            {placement.workflowState ===
                              "Completion submitted" &&
                              isSupervisor &&
                              !isMember && (
                                <button
                                  type="button"
                                  className="fol"
                                  onClick={async () => {
                                    await apiFetch(
                                      `/api/placements/${placement.id}/transition`,
                                      {
                                        method: "POST",
                                        body: JSON.stringify({
                                          action: "supervisor_review",
                                          supervisorConfirmedHours:
                                            placement.claimedHours || 40,
                                          supervisorAssessedSkills: (
                                            opportunity.requiredSkills || []
                                          ).map((s: string) => ({
                                            skill: s,
                                            proficiency:
                                              "Demonstrated in supervised practice",
                                            note: "Verified by supervisor",
                                          })),
                                          supervisorReviewNote:
                                            "Verified attendance and practical competence.",
                                        }),
                                      }
                                    );
                                    await loadProfile();
                                    await onRefreshSession();
                                  }}
                                >
                                  Verify Skills &amp; Hours
                                </button>
                              )}
                            {placement.workflowState ===
                              "Supervisor reviewed" &&
                              isMember && (
                                <button
                                  type="button"
                                  className="fol"
                                  onClick={async () => {
                                    await apiFetch(
                                      `/api/placements/${placement.id}/transition`,
                                      {
                                        method: "POST",
                                        body: JSON.stringify({
                                          action: "member_accept_finalise",
                                        }),
                                      }
                                    );
                                    setFeedback({
                                      type: "ok",
                                      text: "Placement finalised into Talent Passport!",
                                    });
                                    await loadProfile();
                                    await onRefreshSession();
                                  }}
                                >
                                  Accept &amp; Finalise
                                </button>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </>
            )}

            <div className="sSecHead">
              <h3>Talent Passport Skills &amp; Credentials</h3>
              <span>Verified &amp; Self-declared</span>
            </div>

            {/* Optional Organisation Role Credentials stored in User Passport */}
            {memberships.length > 0 &&
              (passportCatFilter === "all" ||
                passportCatFilter === "Organisation Role") &&
              memberships.map((m: any) => (
                <div
                  key={`org-cred-${m.membership.id}`}
                  className="opp cursor-pointer"
                  onClick={() => onOpenOrgModal(m.organisation.id)}
                >
                  <div className="top">
                    <span className="otype">
                      Organisation Role · Extra Credential
                    </span>
                    <span
                      className="pill flex items-center gap-1"
                      style={
                        m.organisation.verificationStatus === "approved"
                          ? { background: "#e6f2f3", color: "#0b5d66" }
                          : { background: "#fdece5", color: "#b84a22" }
                      }
                    >
                      {m.organisation.verificationStatus === "approved" && (
                        <VerifiedBadgeSvg />
                      )}
                      {m.organisation.verificationStatus === "approved"
                        ? "Verified Org Role"
                        : "Self-declared"}
                    </span>
                  </div>
                  <h4>
                    {m.membership.roleTitle} —{" "}
                    {m.organisation.name.replace(/\s*\(Fictional Demo\)/i, "")}
                  </h4>
                  <p>
                    {m.organisation.orgType} · {m.organisation.location}
                  </p>
                  <div className="bot">
                    <div className="facts">
                      <span>Extra Credential</span>
                      {(m.organisation.servicesOrProgrammes || [])
                        .slice(0, 2)
                        .map((s: string) => (
                          <span key={s}>{s}</span>
                        ))}
                    </div>
                  </div>
                </div>
              ))}

            {filteredPassportRecords.length === 0 ? (
              <div className="sEmpty">
                <b>No Passport records in this category</b>
                Add your education, certificates or practical placements to build
                verified career evidence.
              </div>
            ) : (
              filteredPassportRecords.map((rec: any) => {
                const isVerified =
                  rec.evidenceStatus ===
                    "Confirmed by an authorised organisation representative" ||
                  rec.evidenceStatus === "Institution-issued credential";
                const isSubmitted =
                  rec.evidenceStatus === "Submitted for verification" ||
                  rec.evidenceStatus === "Submitted for review";

                const canVerifyAsOrgStaff =
                  rec.userId !== currentUser?.id &&
                  rec.organisationId &&
                  myMemberships.some(
                    (m: any) =>
                      m.organisation.id === rec.organisationId &&
                      m.organisation.verificationStatus === "approved"
                  );
                const isPlatformAdmin =
                  currentUser?.platformRole === "admin" &&
                  rec.userId !== currentUser?.id;

                return (
                  <div key={rec.id} className="opp">
                    <div className="top">
                      <span
                        className={`otype ${
                          rec.recordCategory === "Practical experience"
                            ? "vol"
                            : ""
                        }`}
                      >
                        {rec.recordCategory}
                      </span>

                      <span
                        className="pill flex items-center gap-1"
                        style={
                          isVerified
                            ? { background: "#e6f2f3", color: "#0b5d66" }
                            : isSubmitted
                            ? { background: "#fdece5", color: "#b84a22" }
                            : { background: "#f5f6f8", color: "#6b7480" }
                        }
                      >
                        {isVerified && <VerifiedBadgeSvg />}
                        {rec.evidenceStatus}
                      </span>
                    </div>

                    <h4>{rec.title}</h4>
                    <p
                      className={
                        rec.organisationId ? "cursor-pointer hover:underline" : ""
                      }
                      onClick={() =>
                        rec.organisationId && onOpenOrgModal(rec.organisationId)
                      }
                    >
                      {rec.issuerOrOrganisationName.replace(
                        /\s*\(Fictional Demo\)/i,
                        ""
                      )}{" "}
                      · {rec.startDate || "2026"}
                      {rec.endDate ? ` – ${rec.endDate}` : ""}
                    </p>

                    <p className="mt-2 !text-[#0f1720] leading-relaxed">
                      {rec.publicSummary}
                    </p>

                    {rec.verifierNameAndRole && (
                      <div className="mt-2.5 px-3 py-2 rounded-xl bg-[#f5f6f8] flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#0b5d66]">
                          Verified by {rec.verifierNameAndRole}
                        </span>
                        {rec.evidenceReference && (
                          <span className="text-[#6b7480] font-mono text-[11px]">
                            #{rec.evidenceReference}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="bot">
                      <div className="facts">
                        {rec.confirmedHours > 0 && (
                          <span
                            style={{ background: "#e6f2f3", color: "#0b5d66" }}
                          >
                            {rec.confirmedHours}h Confirmed
                          </span>
                        )}
                        {(rec.skillsDemonstrated || []).map((sk: string) => (
                          <span key={sk}>{sk}</span>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isOwnProfile && (
                          <>
                            <button
                              type="button"
                              className="fol"
                              onClick={() =>
                                setEditingRecordSheet({
                                  type: "passport",
                                  record: rec,
                                  mode: "submit_for_review",
                                  claimedHours: rec.confirmedHours || 30,
                                  organisationId: rec.organisationId
                                    ? String(rec.organisationId)
                                    : allOrganisations[0]
                                    ? String(allOrganisations[0].id)
                                    : "",
                                  issuerOrOrganisationName:
                                    rec.issuerOrOrganisationName.replace(
                                      /\s*\(Fictional Demo\)/i,
                                      ""
                                    ),
                                  skillsText: (
                                    rec.skillsDemonstrated || []
                                  ).join(", "),
                                  publicSummary: rec.publicSummary || "",
                                  privateNote: "",
                                })
                              }
                            >
                              Submit Review
                            </button>
                            <button
                              type="button"
                              className="fol on"
                              onClick={() =>
                                setEditingRecordSheet({
                                  type: "passport",
                                  record: rec,
                                  mode: "self_declare",
                                  claimedHours: rec.confirmedHours || 30,
                                  organisationId: rec.organisationId
                                    ? String(rec.organisationId)
                                    : "",
                                  issuerOrOrganisationName:
                                    rec.issuerOrOrganisationName.replace(
                                      /\s*\(Fictional Demo\)/i,
                                      ""
                                    ),
                                  skillsText: (
                                    rec.skillsDemonstrated || []
                                  ).join(", "),
                                  publicSummary: rec.publicSummary || "",
                                  privateNote: "",
                                })
                              }
                            >
                              Self Declare
                            </button>
                          </>
                        )}

                        {(canVerifyAsOrgStaff || isPlatformAdmin) && (
                          <button
                            type="button"
                            className="fol"
                            onClick={() =>
                              handleVerifyRecord(
                                rec.id,
                                rec.recordCategory === "Education"
                                  ? "issue_credential"
                                  : "confirm",
                                rec.confirmedHours || 24,
                                "Confirmed by authorised representative"
                              )
                            }
                          >
                            Verify
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* =====================================================================
          EDIT PROFILE & ORGANISATION ROLES (Merged into one Edit Profile page)
      ===================================================================== */}
      {viewMode === "edit" && isOwnProfile && (
        <div className="px-4 pt-2 pb-8 space-y-6">
          <form onSubmit={handleSaveProfileEdits}>
            <div className="sSecHead mt-2">
              <h3>Profile, Career Stage &amp; Privacy</h3>
              <button type="button" onClick={onOpenOnboardingEdit}>
                Full Questionnaire →
              </button>
            </div>

            <label className="lab">Full Name</label>
            <input
              type="text"
              className="fld"
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
            />

            <label className="lab">
              Career Stage (Editable Profile Attribute)
            </label>
            <select
              className="fld"
              value={editForm.careerStage}
              onChange={(e) =>
                setEditForm({ ...editForm, careerStage: e.target.value })
              }
            >
              <option value="Exploring tourism careers">
                Exploring tourism careers
              </option>
              <option value="Currently studying">Currently studying</option>
              <option value="Intern or apprentice">Intern or apprentice</option>
              <option value="Recently graduated">Recently graduated</option>
              <option value="Working professional">Working professional</option>
              <option value="Self-employed or running a tourism business">
                Self-employed or running a tourism business
              </option>
              <option value="Returning to work or changing careers">
                Returning to work or changing careers
              </option>
            </select>

            <label className="lab">Location</label>
            <input
              type="text"
              className="fld"
              value={editForm.location}
              onChange={(e) =>
                setEditForm({ ...editForm, location: e.target.value })
              }
            />

            <label className="lab">Curated Career Pathway</label>
            <select
              className="fld"
              value={editForm.selectedPathwayId}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  selectedPathwayId: e.target.value,
                })
              }
            >
              {CURATED_CAREER_PATHWAYS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>

            <label className="lab">Bio</label>
            <textarea
              rows={3}
              className="fld"
              value={editForm.bio}
              onChange={(e) =>
                setEditForm({ ...editForm, bio: e.target.value })
              }
            />

            <div className="two">
              <div>
                <label className="lab">Profile Visibility</label>
                <select
                  className="fld"
                  value={editForm.profileVisibility}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      profileVisibility: e.target.value,
                    })
                  }
                >
                  <option value="public">Public</option>
                  <option value="connections_only">Connections Only</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div>
                <label className="lab">Messaging Privacy</label>
                <select
                  className="fld"
                  value={editForm.messagingPrivacy}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      messagingPrivacy: e.target.value,
                    })
                  }
                >
                  <option value="connections_and_employers">
                    Connections &amp; Employers
                  </option>
                  <option value="connections_only">Connections Only</option>
                  <option value="anyone">Anyone</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs font-semibold mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.dataSaverMode}
                onChange={(e) =>
                  setEditForm({ ...editForm, dataSaverMode: e.target.checked })
                }
                className="w-4 h-4 accent-[#0b5d66]"
              />
              <span>Enable Limited Mobile Data-Saver Mode</span>
            </label>

            <button type="submit" className="obBtn mt-5">
              Save Profile Changes
            </button>
          </form>

          {/* Merged Organisation Role & Representation Section */}
          <div className="pt-4 border-t border-[#e8eaee]">
            <div className="sSecHead">
              <h3>Organisation Roles &amp; Representation</h3>
              <button
                type="button"
                onClick={() => setShowAddOrgModal(true)}
              >
                + Add Org Role
              </button>
            </div>

            {memberships.length > 0 ? (
              <div className="space-y-2">
                {memberships.map((m: any) => (
                  <div
                    key={m.membership.id}
                    className="opp !mt-0 cursor-pointer"
                    onClick={() => onOpenOrgModal(m.organisation.id)}
                  >
                    <div className="top">
                      <span className="otype">{m.organisation.orgType}</span>
                      <span className="pill">
                        {m.organisation.verificationStatus}
                      </span>
                    </div>
                    <h4>
                      {m.organisation.name.replace(
                        /\s*\(Fictional Demo\)/i,
                        ""
                      )}
                    </h4>
                    <p>
                      Role: {m.membership.roleTitle} · {m.organisation.location}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="opp !mt-0">
                <span className="otype">Organisation Membership</span>
                <h4>Represent a Tourism Business or Institution</h4>
                <p>
                  Add an organisation role to publish opportunities or verify
                  placement records.
                </p>
                <div className="bot">
                  <div className="facts">
                    <span>Multi-staff supported</span>
                  </div>
                  <button
                    type="button"
                    className="fol"
                    onClick={() => setShowAddOrgModal(true)}
                  >
                    + Org Role
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SLIDE-UP SHEET: ADD PASSPORT RECORD (.cp)
      ===================================================================== */}
      <div className={`cp ${showAddPassport ? "show" : ""}`}>
        <div className="cpHead">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowAddPassport(false)}
          >
            <CloseSvg />
          </button>
          <b>New Talent Passport Record</b>
          <button
            type="button"
            className="cpPost"
            disabled={
              !passportForm.title.trim() ||
              !passportForm.issuerOrOrganisationName.trim()
            }
            onClick={handleAddPassportRecord}
          >
            Save
          </button>
        </div>
        <div className="cpBody">
          <div className="two">
            <div>
              <label className="lab">Record Category</label>
              <select
                className="fld"
                value={passportForm.recordCategory}
                onChange={(e) =>
                  setPassportForm({
                    ...passportForm,
                    recordCategory: e.target.value,
                  })
                }
              >
                <option value="Education">Education</option>
                <option value="Certificate">Certificate</option>
                <option value="Achievement">Achievement</option>
                <option value="Practical experience">Practical experience</option>
              </select>
            </div>
            <div>
              <label className="lab">Issuing Organisation</label>
              <select
                className="fld"
                value={passportForm.organisationId}
                onChange={(e) => {
                  const org = allOrganisations.find(
                    (o) => o.id === Number(e.target.value)
                  );
                  setPassportForm({
                    ...passportForm,
                    organisationId: e.target.value,
                    issuerOrOrganisationName: org
                      ? org.name
                      : passportForm.issuerOrOrganisationName,
                  });
                }}
              >
                <option value="">Unlisted / Self-declared</option>
                {allOrganisations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name.replace(/\s*\(Fictional Demo\)/i, "")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="lab">Title of Qualification or Experience</label>
          <input
            type="text"
            className="fld"
            placeholder="e.g. Certificate in Front-Office & PMS Operations"
            value={passportForm.title}
            onChange={(e) =>
              setPassportForm({ ...passportForm, title: e.target.value })
            }
          />

          <label className="lab">Issuer or Organisation Name</label>
          <input
            type="text"
            className="fld"
            placeholder="e.g. Bulawayo School of Hospitality"
            value={passportForm.issuerOrOrganisationName}
            onChange={(e) =>
              setPassportForm({
                ...passportForm,
                issuerOrOrganisationName: e.target.value,
              })
            }
          />

          <label className="lab">Skills Demonstrated (Select from Tours Roadmap or Comma-separated)</label>
          <div className="sChips !pt-0 !pb-2">
            {activePathway.coreSkills.map((sk) => {
              const currentSkills = passportForm.skillsText
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              const isSelected = currentSkills.some(
                (s) => s.toLowerCase() === sk.toLowerCase()
              );
              return (
                <button
                  key={sk}
                  type="button"
                  className={`sChip ${isSelected ? "on" : ""}`}
                  onClick={() => {
                    const next = isSelected
                      ? currentSkills.filter(
                          (s) => s.toLowerCase() !== sk.toLowerCase()
                        )
                      : [...currentSkills, sk];
                    setPassportForm({
                      ...passportForm,
                      skillsText: next.join(", "),
                    });
                  }}
                >
                  {sk}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            className="fld"
            value={passportForm.skillsText}
            onChange={(e) =>
              setPassportForm({ ...passportForm, skillsText: e.target.value })
            }
          />

          <label className="lab">Submission Option</label>
          <div className="ctypes mt-1.5">
            <button
              type="button"
              className={`ctype ${passportForm.submitForReview ? "on" : ""}`}
              onClick={() =>
                setPassportForm({ ...passportForm, submitForReview: true })
              }
            >
              <span>Submit Review</span>
            </button>
            <button
              type="button"
              className={`ctype ${!passportForm.submitForReview ? "on" : ""}`}
              onClick={() =>
                setPassportForm({ ...passportForm, submitForReview: false })
              }
            >
              <span>Self Declare</span>
            </button>
          </div>

          <label className="lab">Public Summary</label>
          <textarea
            rows={3}
            className="fld"
            placeholder="Describe what you completed or achieved…"
            value={passportForm.publicSummary}
            onChange={(e) =>
              setPassportForm({
                ...passportForm,
                publicSummary: e.target.value,
              })
            }
          />

          <label className="lab">
            Private Evidence Vault Note (Protected — Never Public)
          </label>
          <textarea
            rows={2}
            className="fld"
            placeholder="Certificate reference number or supervisor verification note…"
            value={passportForm.privateDocContent}
            onChange={(e) =>
              setPassportForm({
                ...passportForm,
                privateDocContent: e.target.value,
              })
            }
          />
          <div className="hint">
            Submitting or self-declaring a skill here automatically updates your
            Tours roadmap progress.
          </div>
        </div>
      </div>

      {/* =====================================================================
          SLIDE-UP SHEET: SKILL & PLACEMENT DETAILS FORM (Submit Review / Self Declare)
      ===================================================================== */}
      <div className={`cp ${editingRecordSheet ? "show" : ""}`}>
        <div className="cpHead">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setEditingRecordSheet(null)}
          >
            <CloseSvg />
          </button>
          <b>
            {editingRecordSheet?.mode === "submit_for_review"
              ? "Submit Review"
              : "Self Declare Skill"}
          </b>
          <button
            type="button"
            className="cpPost"
            onClick={async () => {
              if (!editingRecordSheet) return;
              try {
                const selectedSkills = editingRecordSheet.skillsText
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);

                if (editingRecordSheet.type === "placement") {
                  const pl = editingRecordSheet.record.placement;
                  const opp = editingRecordSheet.record.opportunity;
                  const org = editingRecordSheet.record.organisation;

                  if (
                    editingRecordSheet.mode === "submit_for_review" &&
                    (pl.workflowState === "In progress" ||
                      pl.workflowState === "Terms confirmed")
                  ) {
                    await apiFetch(`/api/placements/${pl.id}/transition`, {
                      method: "POST",
                      body: JSON.stringify({
                        action: "submit_completion",
                        claimedHours: editingRecordSheet.claimedHours,
                        memberCompletionSummary:
                          editingRecordSheet.publicSummary,
                      }),
                    });
                  }

                  // Also record/update in Talent Passport so the Tours roadmap immediately reflects the completed skill
                  await apiFetch("/api/passport", {
                    method: "POST",
                    body: JSON.stringify({
                      recordCategory: "Practical experience",
                      title: opp.title,
                      issuerOrOrganisationName:
                        editingRecordSheet.issuerOrOrganisationName ||
                        org.name.replace(/\s*\(Fictional Demo\)/i, ""),
                      organisationId: editingRecordSheet.organisationId
                        ? Number(editingRecordSheet.organisationId)
                        : org.id,
                      startDate: "2026-10",
                      endDate: "2026-10",
                      skillsDemonstrated: selectedSkills,
                      publicSummary: editingRecordSheet.publicSummary,
                      evidenceReference: `PL-${pl.id}`,
                      submitForReview:
                        editingRecordSheet.mode === "submit_for_review",
                      privateDocFileName: "placement_evidence.txt",
                      privateDocContent: editingRecordSheet.privateNote,
                    }),
                  });
                } else {
                  const rec = editingRecordSheet.record;
                  await apiFetch(`/api/passport/${rec.id}/verify`, {
                    method: "POST",
                    body: JSON.stringify({
                      action: editingRecordSheet.mode,
                      confirmedHours: editingRecordSheet.claimedHours,
                      skillsDemonstrated: selectedSkills,
                      publicSummary: editingRecordSheet.publicSummary,
                      organisationId: editingRecordSheet.organisationId
                        ? Number(editingRecordSheet.organisationId)
                        : null,
                      issuerOrOrganisationName:
                        editingRecordSheet.issuerOrOrganisationName,
                      note:
                        editingRecordSheet.privateNote ||
                        (editingRecordSheet.mode === "submit_for_review"
                          ? "Submitted for verification from Talent Passport"
                          : "Self-declared from Talent Passport"),
                    }),
                  });
                }

                setEditingRecordSheet(null);
                setFeedback({
                  type: "ok",
                  text:
                    editingRecordSheet.mode === "submit_for_review"
                      ? "Submitted for review — your Tours roadmap skill progress has been updated!"
                      : "Self-declared — your Tours roadmap skill progress has been updated!",
                });
                await loadProfile();
                await onRefreshSession();
              } catch (err: any) {
                setFeedback({ type: "err", text: err.message });
              }
            }}
          >
            Submit
          </button>
        </div>

        {editingRecordSheet && (
          <div className="cpBody">
            <div className="opp !mt-0">
              <div className="top">
                <span className="otype">
                  {editingRecordSheet.type === "placement"
                    ? "Practical Placement"
                    : editingRecordSheet.record.recordCategory}
                </span>
                <span className="pill">
                  {editingRecordSheet.mode === "submit_for_review"
                    ? "Submit Review"
                    : "Self Declare"}
                </span>
              </div>
              <h4>
                {editingRecordSheet.type === "placement"
                  ? editingRecordSheet.record.opportunity.title
                  : editingRecordSheet.record.title}
              </h4>
              <p>
                Corresponds with Tours Roadmap ({activePathway.title}) —
                completing this updates your roadmap skill status
              </p>
            </div>

            {/* Mode Switcher: Only Submit Review and Self Declare */}
            <div className="ctypes mt-3">
              <button
                type="button"
                className={`ctype ${
                  editingRecordSheet.mode === "submit_for_review" ? "on" : ""
                }`}
                onClick={() =>
                  setEditingRecordSheet({
                    ...editingRecordSheet,
                    mode: "submit_for_review",
                  })
                }
              >
                <span>Submit Review</span>
              </button>
              <button
                type="button"
                className={`ctype ${
                  editingRecordSheet.mode === "self_declare" ? "on" : ""
                }`}
                onClick={() =>
                  setEditingRecordSheet({
                    ...editingRecordSheet,
                    mode: "self_declare",
                  })
                }
              >
                <span>Self Declare</span>
              </button>
            </div>

            <label className="lab">
              Tours Roadmap Skills Demonstrated (Tap to toggle)
            </label>
            <div className="sChips !pt-0 !pb-2">
              {activePathway.coreSkills.map((sk) => {
                const currentSkills = editingRecordSheet.skillsText
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                const isSelected = currentSkills.some(
                  (s) => s.toLowerCase() === sk.toLowerCase()
                );
                return (
                  <button
                    key={sk}
                    type="button"
                    className={`sChip ${isSelected ? "on" : ""}`}
                    onClick={() => {
                      const next = isSelected
                        ? currentSkills.filter(
                            (s) => s.toLowerCase() !== sk.toLowerCase()
                          )
                        : [...currentSkills, sk];
                      setEditingRecordSheet({
                        ...editingRecordSheet,
                        skillsText: next.join(", "),
                      });
                    }}
                  >
                    {sk}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              className="fld"
              value={editingRecordSheet.skillsText}
              onChange={(e) =>
                setEditingRecordSheet({
                  ...editingRecordSheet,
                  skillsText: e.target.value,
                })
              }
            />

            <label className="lab">Practical Hours</label>
            <div className="rng">
              <input
                type="range"
                min={4}
                max={120}
                value={editingRecordSheet.claimedHours}
                onChange={(e) =>
                  setEditingRecordSheet({
                    ...editingRecordSheet,
                    claimedHours: Number(e.target.value),
                  })
                }
              />
              <b>{editingRecordSheet.claimedHours}h</b>
            </div>

            {editingRecordSheet.mode === "submit_for_review" && (
              <>
                <label className="lab">Verifying Organisation</label>
                <select
                  className="fld"
                  value={editingRecordSheet.organisationId}
                  onChange={(e) => {
                    const org = allOrganisations.find(
                      (o) => o.id === Number(e.target.value)
                    );
                    setEditingRecordSheet({
                      ...editingRecordSheet,
                      organisationId: e.target.value,
                      issuerOrOrganisationName: org
                        ? org.name.replace(/\s*\(Fictional Demo\)/i, "")
                        : editingRecordSheet.issuerOrOrganisationName,
                    });
                  }}
                >
                  <option value="">Select verifying organisation…</option>
                  {allOrganisations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name.replace(/\s*\(Fictional Demo\)/i, "")}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label className="lab">Organisation / Context</label>
            <input
              type="text"
              className="fld"
              value={editingRecordSheet.issuerOrOrganisationName}
              onChange={(e) =>
                setEditingRecordSheet({
                  ...editingRecordSheet,
                  issuerOrOrganisationName: e.target.value,
                })
              }
            />

            <label className="lab">Details &amp; Completion Summary</label>
            <textarea
              rows={3}
              className="fld"
              value={editingRecordSheet.publicSummary}
              onChange={(e) =>
                setEditingRecordSheet({
                  ...editingRecordSheet,
                  publicSummary: e.target.value,
                })
              }
            />

            <label className="lab">
              Private Evidence Note (Optional — Protected)
            </label>
            <textarea
              rows={2}
              className="fld"
              placeholder="Supervisor contact, logbook or certificate reference…"
              value={editingRecordSheet.privateNote}
              onChange={(e) =>
                setEditingRecordSheet({
                  ...editingRecordSheet,
                  privateNote: e.target.value,
                })
              }
            />
          </div>
        )}
      </div>

      {/* =====================================================================
          SLIDE-UP SHEET: ADD ORGANISATION ROLE (.cp)
      ===================================================================== */}
      <div className={`cp ${showAddOrgModal ? "show" : ""}`}>
        <div className="cpHead">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowAddOrgModal(false)}
          >
            <CloseSvg />
          </button>
          <b>Register Organisation</b>
          <button
            type="button"
            className="cpPost"
            disabled={!newOrgForm.name.trim() || !newOrgForm.description.trim()}
            onClick={handleRegisterNewOrg}
          >
            Submit
          </button>
        </div>
        <div className="cpBody">
          <div className="hint !mt-0 mb-3">
            New organisations start as <b>Pending</b> until approved by a Platform
            Administrator.
          </div>
          <label className="lab">Organisation Name</label>
          <input
            type="text"
            className="fld"
            value={newOrgForm.name}
            onChange={(e) =>
              setNewOrgForm({ ...newOrgForm, name: e.target.value })
            }
          />
          <div className="two">
            <div>
              <label className="lab">Type</label>
              <select
                className="fld"
                value={newOrgForm.orgType}
                onChange={(e) =>
                  setNewOrgForm({ ...newOrgForm, orgType: e.target.value })
                }
              >
                <option value="Lodge / Camp">Lodge / Camp</option>
                <option value="Hotel / Resort">Hotel / Resort</option>
                <option value="Tour Operator">Tour Operator</option>
                <option value="Training Institution">Training Institution</option>
              </select>
            </div>
            <div>
              <label className="lab">Your Role</label>
              <input
                type="text"
                className="fld"
                value={newOrgForm.roleTitle}
                onChange={(e) =>
                  setNewOrgForm({ ...newOrgForm, roleTitle: e.target.value })
                }
              />
            </div>
          </div>
          <label className="lab">Location</label>
          <input
            type="text"
            className="fld"
            value={newOrgForm.location}
            onChange={(e) =>
              setNewOrgForm({ ...newOrgForm, location: e.target.value })
            }
          />
          <label className="lab">Public Description</label>
          <textarea
            rows={3}
            className="fld"
            value={newOrgForm.description}
            onChange={(e) =>
              setNewOrgForm({ ...newOrgForm, description: e.target.value })
            }
          />
          <label className="lab">Private Verification Evidence (Admin Only)</label>
          <textarea
            rows={2}
            className="fld"
            placeholder="ZTA operator license or institutional charter reference…"
            value={newOrgForm.privateDocContent}
            onChange={(e) =>
              setNewOrgForm({
                ...newOrgForm,
                privateDocContent: e.target.value,
              })
            }
          />
        </div>
      </div>

      {/* =====================================================================
          SLIDE-UP SHEET: INSPECT PRIVATE EVIDENCE VAULT DOCUMENT (.cp)
      ===================================================================== */}
      <div className={`cp ${viewingPrivateDoc ? "show" : ""}`}>
        <div className="cpHead">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setViewingPrivateDoc(null)}
          >
            <CloseSvg />
          </button>
          <b>Private Evidence Vault</b>
          <span style={{ width: 48 }} />
        </div>
        {viewingPrivateDoc && (
          <div className="cpBody space-y-3">
            <div className="opp">
              <span className="otype">Authorised Access Verified</span>
              <h4>{viewingPrivateDoc.fileName}</h4>
              <p>
                Protected server-side document · Never exposed via public file URL
              </p>
              <div className="mt-3 p-3 rounded-xl bg-[#f5f6f8] text-xs font-mono text-[#0f1720] whitespace-pre-wrap">
                {viewingPrivateDoc.dataUriOrContent}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
