import React, { useState, useEffect } from "react";
import {
  MapPin,
  ShieldCheck,
  Award,
  Briefcase,
  Compass,
  Plus,
  Lock,
  Eye,
  AlertCircle,
  CheckCircle2,
  Edit3,
  MessageSquare,
  UserPlus,
  UserCheck,
  Building2,
  X,
} from "lucide-react";
import { ResilientImage } from "./ResilientImage.tsx";
import { CURATED_CAREER_PATHWAYS } from "../constants/pathways.ts";

interface ProfileAndPassportViewProps {
  currentUser: any;
  viewedUserId: number;
  myMemberships: any[];
  allOrganisations: any[];
  opportunities: any[];
  dataSaverMode: boolean;
  apiFetch: (url: string, options?: RequestInit) => Promise<any>;
  onRefreshSession: () => Promise<void>;
  onOpenOnboardingEdit: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenMessagingWithUser: (userId: number) => void;
  onOpenOrgModal: (orgId: number) => void;
}

export const ProfileAndPassportView: React.FC<ProfileAndPassportViewProps> = ({
  currentUser,
  viewedUserId,
  myMemberships,
  allOrganisations,
  opportunities,
  dataSaverMode,
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
    "posts" | "portfolio" | "passport" | "journey"
  >("passport");
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  // Modals
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [showAddPassport, setShowAddPassport] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddOrgModal, setShowAddOrgModal] = useState(false);
  const [viewingPrivateDoc, setViewingPrivateDoc] = useState<any | null>(null);

  // Forms
  const [portfolioForm, setPortfolioForm] = useState({
    title: "",
    description: "",
    mediaUrl: "/src/assets/images/nyanga_front_office_1791386453942.jpg",
    skillTagsText: "Guest Check-In & Concierge Protocol, Property Management Systems (PMS)",
    roleContext: "Hospitality Practical Project",
    projectDate: "October 2026",
  });

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
      <div className="bg-white border border-[#E6E0D3] rounded-2xl p-8 text-center text-xs text-[#4A5B50]">
        Loading member profile and Talent Passport...
      </div>
    );
  }

  if (!profileData || !profileData.member) {
    return (
      <div className="bg-white border border-[#E6E0D3] rounded-2xl p-8 text-center text-xs text-[#9E2A2B]">
        Unable to load profile or profile is private.
      </div>
    );
  }

  const {
    member,
    posts = [],
    portfolio = [],
    passport = [],
    confirmedPracticalHours = 0,
    assessedSkills = [],
    memberships = [],
    relationships = [],
    recommendations,
  } = profileData;

  const isOwnProfile = currentUser?.id === member.id;

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

  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/portfolio", {
        method: "POST",
        body: JSON.stringify({
          title: portfolioForm.title,
          description: portfolioForm.description,
          mediaUrl: portfolioForm.mediaUrl,
          mediaType: "image",
          skillTags: portfolioForm.skillTagsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          roleContext: portfolioForm.roleContext,
          projectDate: portfolioForm.projectDate,
        }),
      });
      setShowAddPortfolio(false);
      setPortfolioForm({
        ...portfolioForm,
        title: "",
        description: "",
      });
      setFeedback({
        type: "ok",
        text: "Portfolio work item published to your profile.",
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
        text: "Record added to Talent Passport (Self-declared / Submitted for review until confirmed by an authorised representative).",
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
        body: JSON.stringify({
          action,
          confirmedHours,
          note,
        }),
      });
      setFeedback({
        type: "ok",
        text: `Passport record updated (${action}). Audit trail preserved.`,
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
      setShowEditProfile(false);
      setFeedback({ type: "ok", text: "Profile and privacy settings updated." });
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
        text: "Organisation registered in Pending status awaiting administrator approval.",
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

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === "ok"
              ? "bg-[#1B5E3A]/10 border-[#1B5E3A]/30 text-[#14241B]"
              : "bg-[#9E2A2B]/10 border-[#9E2A2B]/30 text-[#9E2A2B]"
          }`}
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

      {/* PROFILE HEADER CARD */}
      <div className="bg-white border border-[#E6E0D3] rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <ResilientImage
              src={member.avatarUrl}
              alt={member.name}
              dataSaverMode={dataSaverMode}
              className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-[#E6E0D3]"
            />
            <div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#4A5B50]">
                <span className="font-semibold text-[#163A2B]">
                  {member.careerStage}
                </span>
                <span aria-hidden="true">·</span>
                <span>{member.location}</span>
                {member.isDemo && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#8A6200] font-medium">
                      Fictional Demo Account
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-2xl font-display font-semibold text-[#14241B] mt-0.5">
                {member.name}
              </h1>
              <p className="text-sm text-[#14241B] mt-1 max-w-2xl">{member.bio}</p>

              {/* Clean unboxed career interests & availability */}
              <div className="text-xs text-[#4A5B50] mt-2 space-y-0.5">
                <div>
                  <strong className="text-[#14241B]">Availability:</strong>{" "}
                  {member.availability || "Flexible"} <span aria-hidden="true">·</span>{" "}
                  <strong className="text-[#14241B]">Interests:</strong>{" "}
                  {(member.tourismInterests || []).join(" · ") || "Tourism & Hospitality"}
                </div>
                {memberships.length > 0 && (
                  <div>
                    <strong className="text-[#14241B]">Organisation Roles:</strong>{" "}
                    {memberships.map((m: any, idx: number) => (
                      <span key={m.membership.id}>
                        {idx > 0 && " · "}
                        <button
                          type="button"
                          onClick={() => onOpenOrgModal(m.organisation.id)}
                          className="underline hover:no-underline text-[#163A2B] font-medium"
                        >
                          {m.membership.roleTitle} at {m.organisation.name} (
                          {m.organisation.verificationStatus})
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Action Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isOwnProfile ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowEditProfile(true)}
                  className="px-3.5 py-2 min-h-[44px] text-xs font-medium border border-[#E6E0D3] rounded-xl hover:bg-[#F1ECE1] transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile & Privacy</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenOnboardingEdit}
                  className="px-3.5 py-2 min-h-[44px] text-xs font-medium border border-[#E6E0D3] rounded-xl hover:bg-[#F1ECE1] transition-colors whitespace-nowrap"
                >
                  Questionnaire
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddOrgModal(true)}
                  className="px-3.5 py-2 min-h-[44px] text-xs font-medium bg-[#163A2B] text-white rounded-xl hover:bg-[#1E4D38] transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>+ Add Organisation Role</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    handleToggleRelationship(
                      "follow",
                      isFollowing ? "remove" : "create"
                    )
                  }
                  className="px-3.5 py-2 min-h-[44px] text-xs font-medium border border-[#E6E0D3] rounded-xl hover:bg-[#F1ECE1] whitespace-nowrap"
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>

                {!connectionRecord ? (
                  <button
                    type="button"
                    onClick={() => handleToggleRelationship("connection", "create")}
                    className="px-3.5 py-2 min-h-[44px] text-xs font-medium bg-[#163A2B] text-white rounded-xl hover:bg-[#1E4D38] flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Connect</span>
                  </button>
                ) : connectionRecord.status === "pending" &&
                  connectionRecord.targetId === currentUser?.id ? (
                  <button
                    type="button"
                    onClick={() => handleToggleRelationship("connection", "accept")}
                    className="px-3.5 py-2 min-h-[44px] text-xs font-medium bg-[#B8860B] text-white rounded-xl whitespace-nowrap"
                  >
                    Accept Connection
                  </button>
                ) : (
                  <span className="px-3 py-2 text-xs text-[#4A5B50] border border-[#E6E0D3] rounded-xl">
                    Connection: {connectionRecord.status}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => onOpenMessagingWithUser(member.id)}
                  className="px-3.5 py-2 min-h-[44px] text-xs font-medium border border-[#163A2B] text-[#163A2B] rounded-xl hover:bg-[#163A2B]/5 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Message</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* VERIFIED PASSPORT SUMMARY STRIP (Attendance vs Competence explicitly separated; no public star rating or unexplained score) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E6E0D3]">
          <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E6E0D3]">
            <span className="text-xs text-[#4A5B50] block">
              Confirmed Practical Attendance Hours
            </span>
            <span className="text-2xl font-mono-tabular font-semibold text-[#163A2B] mt-0.5 block">
              {confirmedPracticalHours} hrs
            </span>
            <span className="text-[11px] text-[#4A5B50]">
              Verified by authorised employers/institutions
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E6E0D3] sm:col-span-2">
            <span className="text-xs text-[#4A5B50] block">
              Separately Assessed & Verified Skills ({assessedSkills.length})
            </span>
            <p className="text-xs font-medium text-[#14241B] mt-1">
              {assessedSkills.length > 0
                ? assessedSkills.join(" · ")
                : "No skills verified by supervisor assessment yet (Self-declared skills are listed below)."}
            </p>
            <span className="text-[11px] text-[#4A5B50] block mt-1">
              Note: Follower counts and likes never affect competence verification or
              employer matching.
            </span>
          </div>
        </div>
      </div>

      {/* 4 REQUIRED PROFILE TABS: Posts | Portfolio | Talent Passport | Career Journey */}
      <div className="flex items-center gap-1 p-1 bg-[#F1ECE1] rounded-xl overflow-x-auto">
        {[
          { id: "passport", label: `Talent Passport (${passport.length})` },
          { id: "portfolio", label: `Portfolio (${portfolio.length})` },
          { id: "journey", label: "Career Journey & Pathways" },
          { id: "posts", label: `Posts (${posts.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 min-h-[40px] text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-white text-[#14241B] shadow-sm"
                : "text-[#4A5B50] hover:text-[#14241B]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: TALENT PASSPORT */}
      {activeTab === "passport" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E6E0D3] rounded-2xl p-4">
            <div className="text-xs text-[#4A5B50]">
              <strong className="text-[#14241B]">
                Structured Evidence & Verification Rules:
              </strong>{" "}
              Records distinguish Attendance (Confirmed Hours) from Competence (Skill
              Assessments). Members cannot verify their own experience.
            </div>
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setShowAddPassport(true)}
                className="px-4 py-2 min-h-[40px] bg-[#163A2B] text-white text-xs font-medium rounded-xl hover:bg-[#1E4D38] shrink-0 whitespace-nowrap"
              >
                + Add Passport Record
              </button>
            )}
          </div>

          {passport.length === 0 ? (
            <div className="bg-white border border-[#E6E0D3] rounded-2xl p-8 text-center text-xs text-[#4A5B50]">
              No Talent Passport records recorded yet.
            </div>
          ) : (
            passport.map((rec: any) => {
              // Check if currentUser is an authorised representative of rec.organisationId (and NOT the record owner!)
              const canVerifyAsOrgStaff =
                rec.userId !== currentUser?.id &&
                rec.organisationId &&
                myMemberships.some(
                  (m: any) =>
                    m.organisation.id === rec.organisationId &&
                    m.organisation.verificationStatus === "approved"
                );
              const isPlatformAdmin =
                currentUser?.platformRole === "admin" && rec.userId !== currentUser?.id;

              return (
                <div
                  key={rec.id}
                  className="bg-white border border-[#E6E0D3] rounded-2xl p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#4A5B50]">
                        <span className="font-semibold text-[#14241B]">
                          {rec.recordCategory}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{rec.issuerOrOrganisationName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">
                          {rec.startDate || "N/A"} — {rec.endDate || "Present"}
                        </span>
                        {rec.confirmedHours > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular font-semibold text-[#163A2B]">
                              {rec.confirmedHours} confirmed hrs
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-[#14241B] mt-1">
                        {rec.title}
                      </h3>
                    </div>

                    {/* Explicit Evidence Status Text + Icon */}
                    <div className="text-xs font-semibold flex items-center gap-1.5 shrink-0">
                      {(rec.evidenceStatus ===
                        "Confirmed by an authorised organisation representative" ||
                        rec.evidenceStatus === "Institution-issued credential") && (
                        <span className="text-[#1B5E3A] flex items-center gap-1">
                          <ShieldCheck className="w-4 h-4" />
                          <span>{rec.evidenceStatus}</span>
                        </span>
                      )}
                      {(rec.evidenceStatus === "Self-declared" ||
                        rec.evidenceStatus === "Submitted for review") && (
                        <span className="text-[#8A6200] flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          <span>{rec.evidenceStatus}</span>
                        </span>
                      )}
                      {(rec.evidenceStatus === "Disputed" ||
                        rec.evidenceStatus === "Revoked") && (
                        <span className="text-[#9E2A2B] flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          <span>{rec.evidenceStatus}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#14241B] leading-relaxed">
                    {rec.publicSummary}
                  </p>

                  <div className="text-xs text-[#4A5B50] space-y-1 pt-2 border-t border-[#E6E0D3]">
                    {(rec.skillsDemonstrated || []).length > 0 && (
                      <div>
                        <strong className="text-[#14241B]">
                          Skills Linked to Record:
                        </strong>{" "}
                        {rec.skillsDemonstrated.join(" · ")}
                      </div>
                    )}
                    {rec.verifierNameAndRole && (
                      <div>
                        <strong className="text-[#14241B]">
                          Issuer / Verifier Representative:
                        </strong>{" "}
                        {rec.verifierNameAndRole}{" "}
                        {rec.evidenceReference && `· Ref: ${rec.evidenceReference}`}
                      </div>
                    )}
                    {rec.isDemo && (
                      <div className="text-[#8A6200]">
                        Fictional Demo Verification — Marked for demonstration only; does
                        not imply real organisation endorsement.
                      </div>
                    )}
                  </div>

                  {/* Private Evidence Vault & Verification Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {rec.privateEvidenceDocId && (
                        <button
                          type="button"
                          onClick={() =>
                            handleViewPrivateEvidence(rec.privateEvidenceDocId)
                          }
                          className="px-3 py-1.5 min-h-[36px] text-xs font-medium border border-[#E6E0D3] rounded-lg hover:bg-[#F1ECE1] flex items-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5 text-[#163A2B]" />
                          <span>Inspect Protected Private Evidence</span>
                        </button>
                      )}

                      {isOwnProfile && rec.evidenceStatus === "Self-declared" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleVerifyRecord(
                              rec.id,
                              "submit_for_review",
                              0,
                              "Requesting organisation verification"
                            )
                          }
                          className="px-3 py-1.5 min-h-[36px] text-xs font-medium border border-[#163A2B] text-[#163A2B] rounded-lg hover:bg-[#163A2B]/5"
                        >
                          Submit for Review
                        </button>
                      )}

                      {isOwnProfile && rec.evidenceStatus !== "Disputed" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleVerifyRecord(
                              rec.id,
                              "dispute",
                              rec.confirmedHours,
                              "Member flagged inaccurate hours or assessment details for review."
                            )
                          }
                          className="px-3 py-1.5 min-h-[36px] text-xs text-[#9E2A2B] hover:underline"
                        >
                          Dispute Record
                        </button>
                      )}
                    </div>

                    {/* Authorised Organisation Staff or Admin Verification Controls */}
                    {(canVerifyAsOrgStaff || isPlatformAdmin) && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleVerifyRecord(
                              rec.id,
                              rec.recordCategory === "Education"
                                ? "issue_credential"
                                : "confirm",
                              rec.confirmedHours || 24,
                              "Verified by authorised representative"
                            )
                          }
                          className="px-3 py-1.5 min-h-[36px] text-xs font-medium bg-[#163A2B] text-white rounded-lg hover:bg-[#1E4D38]"
                        >
                          {rec.recordCategory === "Education"
                            ? "Issue Institutional Credential"
                            : "Confirm as Authorised Representative"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleVerifyRecord(
                              rec.id,
                              "revoke",
                              0,
                              "Verification revoked during audit"
                            )
                          }
                          className="px-3 py-1.5 min-h-[36px] text-xs font-medium text-[#9E2A2B] border border-[#9E2A2B]/30 rounded-lg hover:bg-[#9E2A2B]/5"
                        >
                          Revoke
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Audit History */}
                  {Array.isArray(rec.verificationHistory) &&
                    rec.verificationHistory.length > 0 && (
                      <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E6E0D3] space-y-1">
                        <span className="text-[11px] font-semibold text-[#4A5B50] block">
                          Verification Audit History:
                        </span>
                        {rec.verificationHistory.map((h: any, i: number) => (
                          <div key={i} className="text-[11px] text-[#4A5B50]">
                            <span className="font-mono-tabular">{h.date}</span> ·{" "}
                            <strong className="text-[#14241B]">{h.actor}</strong> —{" "}
                            {h.action} ({h.status}) {h.note ? `· "${h.note}"` : ""}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB: PORTFOLIO */}
      {activeTab === "portfolio" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white border border-[#E6E0D3] rounded-2xl p-4">
            <p className="text-xs text-[#4A5B50]">
              Selected examples of practical hospitality, guiding, culinary or event work.
            </p>
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setShowAddPortfolio(true)}
                className="px-4 py-2 min-h-[40px] bg-[#163A2B] text-white text-xs font-medium rounded-xl hover:bg-[#1E4D38]"
              >
                + Add Portfolio Item
              </button>
            )}
          </div>

          {portfolio.length === 0 ? (
            <div className="bg-white border border-[#E6E0D3] rounded-2xl p-8 text-center text-xs text-[#4A5B50]">
              No portfolio items added yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portfolio.map((item: any) => (
                <div
                  key={item.id}
                  className="bg-white border border-[#E6E0D3] rounded-2xl overflow-hidden flex flex-col"
                >
                  <ResilientImage
                    src={item.mediaUrl}
                    alt={item.title}
                    dataSaverMode={dataSaverMode}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-xs text-[#4A5B50]">
                        <span>{item.roleContext || "Portfolio Showcase"}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{item.projectDate || "2026"}</span>
                      </div>
                      <h3 className="text-base font-display font-semibold text-[#14241B] mt-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#14241B] mt-1.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#E6E0D3] text-xs text-[#4A5B50]">
                      <strong className="text-[#14241B]">Skill Tags:</strong>{" "}
                      {(item.skillTags || []).join(" · ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: CAREER JOURNEY & BASIC CAREER GUIDANCE */}
      {activeTab === "journey" && (
        <div className="space-y-5">
          {/* Personalised First-Action Checklist */}
          {recommendations && (
            <div className="bg-white border border-[#E6E0D3] rounded-2xl p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-[#163A2B]">
                    {recommendations.checklistTitle} (Stage: {member.careerStage})
                  </span>
                  <h3 className="text-lg font-display font-semibold text-[#14241B] mt-0.5">
                    {recommendations.checklistQuote}
                  </h3>
                </div>
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => setShowEditProfile(true)}
                    className="px-3 py-1.5 text-xs font-medium border border-[#E6E0D3] rounded-lg hover:bg-[#F1ECE1]"
                  >
                    Change Pathway or Goal
                  </button>
                )}
              </div>

              <div className="space-y-2 pt-2">
                {(recommendations.steps || []).map((st: any) => (
                  <div
                    key={st.id}
                    className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E6E0D3] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#14241B]">{st.label}</p>
                      <p className="text-[11px] text-[#4A5B50] mt-0.5">{st.reason}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateTab(st.tab)}
                      className="px-3 py-1.5 text-xs font-medium bg-[#163A2B] text-white rounded-lg hover:bg-[#1E4D38] shrink-0 whitespace-nowrap"
                    >
                      Go to {st.tab}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Curated Career Pathway Breakdown */}
          <div className="bg-white border border-[#E6E0D3] rounded-2xl p-6 space-y-4">
            <div className="border-b border-[#E6E0D3] pb-4">
              <span className="text-xs text-[#4A5B50]">
                Curated Career Pathway · Rule-Based Skill Gap Analysis
              </span>
              <h3 className="text-xl font-display font-semibold text-[#14241B] mt-0.5">
                {activePathway.title}
              </h3>
              <p className="text-xs text-[#4A5B50] mt-1">{activePathway.summary}</p>
              <p className="text-xs text-[#14241B] mt-2">
                <strong>Common Roles:</strong> {activePathway.targetRoles.join(" · ")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E6E0D3] space-y-2">
                <h4 className="text-xs font-semibold text-[#1B5E3A]">
                  Verified Evidence Already Recorded in Talent Passport
                </h4>
                <ul className="space-y-1.5 text-xs text-[#14241B]">
                  {activePathway.coreSkills
                    .filter((sk) => assessedSkills.includes(sk))
                    .map((sk) => (
                      <li key={sk} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#1B5E3A] shrink-0" />
                        <span>{sk} (Assessed & Verified)</span>
                      </li>
                    ))}
                  {activePathway.coreSkills.filter((sk) => assessedSkills.includes(sk))
                    .length === 0 && (
                    <li className="text-[#4A5B50]">
                      No pathway skills verified yet. Complete a practical placement or
                      submit a credential for review.
                    </li>
                  )}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E6E0D3] space-y-2">
                <h4 className="text-xs font-semibold text-[#8A6200]">
                  Remaining Development Areas to Practice & Assess
                </h4>
                <ul className="space-y-1.5 text-xs text-[#14241B]">
                  {activePathway.coreSkills
                    .filter((sk) => !assessedSkills.includes(sk))
                    .map((sk) => (
                      <li key={sk}>
                        • {sk}
                      </li>
                    ))}
                </ul>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-semibold text-[#14241B] mb-2">
                Related Open Opportunities Matching This Pathway
              </h4>
              <div className="space-y-2">
                {opportunities
                  .filter((o) =>
                    (o.requiredSkills || []).some((rs: string) =>
                      activePathway.coreSkills.includes(rs)
                    )
                  )
                  .slice(0, 3)
                  .map((opp) => (
                    <div
                      key={opp.id}
                      className="p-3 rounded-xl border border-[#E6E0D3] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-[#14241B]">{opp.title}</span>
                        <span className="text-[#4A5B50] block">
                          {opp.opportunityType} · {opp.organisation?.name} ·{" "}
                          {opp.location}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateTab("opportunities")}
                        className="px-3 py-1.5 border border-[#163A2B] text-[#163A2B] rounded-lg hover:bg-[#163A2B]/5 whitespace-nowrap"
                      >
                        View Opportunity
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            <p className="text-[11px] text-[#4A5B50] italic pt-2 border-t border-[#E6E0D3]">
              {activePathway.disclaimer}
            </p>
          </div>
        </div>
      )}

      {/* TAB: VISUAL POSTS GRID */}
      {activeTab === "posts" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {posts.length === 0 ? (
            <div className="col-span-2 bg-white border border-[#E6E0D3] rounded-2xl p-8 text-center text-xs text-[#4A5B50]">
              No community posts published yet.
            </div>
          ) : (
            posts.map((post: any) => (
              <div
                key={post.id}
                className="bg-white border border-[#E6E0D3] rounded-2xl overflow-hidden flex flex-col"
              >
                {post.mediaUrl && (
                  <ResilientImage
                    src={post.mediaUrl}
                    alt={post.caption}
                    dataSaverMode={dataSaverMode}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4 space-y-2">
                  <div className="text-xs text-[#4A5B50]">
                    <span className="font-semibold text-[#163A2B]">{post.postType}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{post.locationTag || "Zimbabwe"}</span>
                  </div>
                  <p className="text-xs text-[#14241B] line-clamp-3">{post.caption}</p>
                  <div className="text-[11px] text-[#4A5B50]">
                    {(post.skillTags || []).join(" · ")}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: INSPECT PRIVATE EVIDENCE DOCUMENT */}
      {viewingPrivateDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E0D3] rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6E0D3] pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#163A2B]" />
                <h3 className="text-sm font-semibold text-[#14241B]">
                  Authorised Private Evidence Vault
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingPrivateDoc(null)}
                className="p-1 text-[#4A5B50]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-[#4A5B50] space-y-1">
              <p>
                <strong>File Name:</strong> {viewingPrivateDoc.fileName}
              </p>
              <p>
                <strong>Access Rule:</strong> Protected server-side access (never exposed
                via public URL).
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E6E0D3] text-xs font-mono text-[#14241B] whitespace-pre-wrap">
              {viewingPrivateDoc.dataUriOrContent}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD PORTFOLIO ITEM */}
      {showAddPortfolio && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E0D3] rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6E0D3] pb-3">
              <h3 className="text-base font-display font-semibold text-[#14241B]">
                Add Portfolio Work Example
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPortfolio(false)}
                className="p-1 text-[#4A5B50]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddPortfolio} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Project / Work Title *
                </label>
                <input
                  type="text"
                  required
                  value={portfolioForm.title}
                  onChange={(e) =>
                    setPortfolioForm({ ...portfolioForm, title: e.target.value })
                  }
                  placeholder="e.g., Eco-Lodge Solar & Water Conservation Guest Briefing Card"
                  className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Description & Practical Impact *
                </label>
                <textarea
                  rows={3}
                  required
                  value={portfolioForm.description}
                  onChange={(e) =>
                    setPortfolioForm({ ...portfolioForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Skill Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  value={portfolioForm.skillTagsText}
                  onChange={(e) =>
                    setPortfolioForm({
                      ...portfolioForm,
                      skillTagsText: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPortfolio(false)}
                  className="px-4 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#163A2B] text-white text-xs font-medium rounded-xl"
                >
                  Publish Portfolio Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD TALENT PASSPORT RECORD */}
      {showAddPassport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E0D3] rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E6E0D3] pb-3">
              <h3 className="text-base font-display font-semibold text-[#14241B]">
                Add Talent Passport Record
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPassport(false)}
                className="p-1 text-[#4A5B50]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddPassportRecord} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Category *
                  </label>
                  <select
                    value={passportForm.recordCategory}
                    onChange={(e) =>
                      setPassportForm({
                        ...passportForm,
                        recordCategory: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl bg-white"
                  >
                    <option value="Education">Education</option>
                    <option value="Certificate">Certificate</option>
                    <option value="Achievement">Achievement</option>
                    <option value="Practical experience">Practical experience</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Link to Registered Organisation (For Verification)
                  </label>
                  <select
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
                    className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl bg-white"
                  >
                    <option value="">Other / Unlisted Issuer (Self-declared)</option>
                    {allOrganisations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.verificationStatus})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Title of Qualification, Certificate or Experience *
                </label>
                <input
                  type="text"
                  required
                  value={passportForm.title}
                  onChange={(e) =>
                    setPassportForm({ ...passportForm, title: e.target.value })
                  }
                  placeholder="e.g., Certificate in Front-Office & PMS Operations"
                  className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Issuer or Organisation Name *
                </label>
                <input
                  type="text"
                  required
                  value={passportForm.issuerOrOrganisationName}
                  onChange={(e) =>
                    setPassportForm({
                      ...passportForm,
                      issuerOrOrganisationName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Public Summary *
                </label>
                <textarea
                  rows={2}
                  required
                  value={passportForm.publicSummary}
                  onChange={(e) =>
                    setPassportForm({
                      ...passportForm,
                      publicSummary: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Private Evidence Text / Reference (Stored in Private Vault — Not Public)
                </label>
                <textarea
                  rows={2}
                  value={passportForm.privateDocContent}
                  onChange={(e) =>
                    setPassportForm({
                      ...passportForm,
                      privateDocContent: e.target.value,
                    })
                  }
                  placeholder="Optional certificate serial number or supervisor contact note..."
                  className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPassport(false)}
                  className="px-4 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#163A2B] text-white text-xs font-medium rounded-xl"
                >
                  Save to Talent Passport
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PROFILE & DATA-SAVING PREFERENCES */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E0D3] rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E6E0D3] pb-3">
              <h3 className="text-base font-display font-semibold text-[#14241B]">
                Edit Profile, Career Stage & Privacy
              </h3>
              <button
                type="button"
                onClick={() => setShowEditProfile(false)}
                className="p-1 text-[#4A5B50]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProfileEdits} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Career Stage (Profile Attribute)
                  </label>
                  <select
                    value={editForm.careerStage}
                    onChange={(e) =>
                      setEditForm({ ...editForm, careerStage: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl bg-white"
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
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) =>
                      setEditForm({ ...editForm, location: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Selected Career Pathway
                  </label>
                  <select
                    value={editForm.selectedPathwayId}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        selectedPathwayId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl bg-white"
                  >
                    {CURATED_CAREER_PATHWAYS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Bio
                </label>
                <textarea
                  rows={2}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Profile Visibility
                  </label>
                  <select
                    value={editForm.profileVisibility}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        profileVisibility: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl bg-white"
                  >
                    <option value="public">Public</option>
                    <option value="connections_only">Connections Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Messaging Privacy
                  </label>
                  <select
                    value={editForm.messagingPrivacy}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        messagingPrivacy: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl bg-white"
                  >
                    <option value="connections_and_employers">
                      Accepted Connections & Applied Employers
                    </option>
                    <option value="connections_only">Accepted Connections Only</option>
                    <option value="anyone">Any Tourism Member</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-[#14241B] pt-2">
                <input
                  type="checkbox"
                  checked={editForm.dataSaverMode}
                  onChange={(e) =>
                    setEditForm({ ...editForm, dataSaverMode: e.target.checked })
                  }
                  className="accent-[#163A2B]"
                />
                <span>
                  Enable Limited Mobile Data-Saver Mode (Click-to-load images & disable
                  heavy media preloading)
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditProfile(false)}
                  className="px-4 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#163A2B] text-white text-xs font-medium rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ORGANISATION ROLE WITHOUT CREATING ANOTHER ACCOUNT */}
      {showAddOrgModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E0D3] rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E6E0D3] pb-3">
              <h3 className="text-base font-display font-semibold text-[#14241B]">
                Register an Organisation or Institution Role
              </h3>
              <button
                type="button"
                onClick={() => setShowAddOrgModal(false)}
                className="p-1 text-[#4A5B50]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRegisterNewOrg} className="space-y-3">
              <p className="text-xs text-[#4A5B50]">
                New organisations are saved as <strong>Pending</strong> until approved by
                a Platform Administrator. Verification evidence is stored privately.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Organisation Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOrgForm.name}
                    onChange={(e) =>
                      setNewOrgForm({ ...newOrgForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Organisation Type *
                  </label>
                  <select
                    value={newOrgForm.orgType}
                    onChange={(e) =>
                      setNewOrgForm({ ...newOrgForm, orgType: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl bg-white"
                  >
                    <option value="Lodge / Camp">Lodge / Camp</option>
                    <option value="Hotel / Resort">Hotel / Resort</option>
                    <option value="Tour Operator">Tour Operator</option>
                    <option value="Travel Agency">Travel Agency</option>
                    <option value="Training Institution">Training Institution</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Your Role Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOrgForm.roleTitle}
                    onChange={(e) =>
                      setNewOrgForm({ ...newOrgForm, roleTitle: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOrgForm.location}
                    onChange={(e) =>
                      setNewOrgForm({ ...newOrgForm, location: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Description & Services / Programmes *
                </label>
                <textarea
                  rows={2}
                  required
                  value={newOrgForm.description}
                  onChange={(e) =>
                    setNewOrgForm({ ...newOrgForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Private Verification Evidence (Admin Only)
                </label>
                <textarea
                  rows={2}
                  value={newOrgForm.privateDocContent}
                  onChange={(e) =>
                    setNewOrgForm({
                      ...newOrgForm,
                      privateDocContent: e.target.value,
                    })
                  }
                  placeholder="ZTA operator license number or institutional charter reference..."
                  className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOrgModal(false)}
                  className="px-4 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#163A2B] text-white text-xs font-medium rounded-xl"
                >
                  Submit Organisation for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
