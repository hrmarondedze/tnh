import React, { useState } from "react";
import {
  Briefcase,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Send,
  ShieldCheck,
  FileText,
  X,
} from "lucide-react";

interface OpportunitiesAndPlacementsViewProps {
  currentUser: any;
  memberships: any[];
  opportunities: any[];
  applications: any[];
  placements: any[];
  myPassportRecords: any[];
  onRefresh: () => Promise<void>;
  apiFetch: (url: string, options?: RequestInit) => Promise<any>;
  onOpenOrgModal: (orgId: number) => void;
}

export const OpportunitiesAndPlacementsView: React.FC<
  OpportunitiesAndPlacementsViewProps
> = ({
  currentUser,
  memberships,
  opportunities,
  applications,
  placements,
  myPassportRecords,
  onRefresh,
  apiFetch,
  onOpenOrgModal,
}) => {
  const [subTab, setSubTab] = useState<"browse" | "applications" | "placements" | "publish">(
    "browse"
  );
  const [filterType, setFilterType] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterComp, setFilterComp] = useState("all");
  const [searchQ, setSearchQ] = useState("");

  // Application Modal
  const [applyingOpp, setApplyingOpp] = useState<any | null>(null);
  const [supportingMessage, setSupportingMessage] = useState("");
  const [selectedPassportIds, setSelectedPassportIds] = useState<number[]>([]);
  const [actionStatus, setActionStatus] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  // Placement Completion / Supervisor Review Modal
  const [activePlacementModal, setActivePlacementModal] = useState<{
    placement: any;
    opportunity: any;
    organisation: any;
    mode: "submit_completion" | "supervisor_review" | "dispute";
  } | null>(null);
  const [claimedHours, setClaimedHours] = useState<number>(40);
  const [completionSummary, setCompletionSummary] = useState("");
  const [supConfirmedHours, setSupConfirmedHours] = useState<number>(40);
  const [supReviewNote, setSupReviewNote] = useState("");
  const [supSkills, setSupSkills] = useState<
    Array<{ skill: string; proficiency: string; note: string }>
  >([]);
  const [disputeNote, setDisputeNote] = useState("");

  // Publish Opportunity Form
  const approvedMemberships = memberships.filter(
    (m) => m.organisation.verificationStatus === "approved"
  );
  const pendingMemberships = memberships.filter(
    (m) => m.organisation.verificationStatus !== "approved"
  );
  const [newOpp, setNewOpp] = useState({
    organisationId: approvedMemberships[0]?.organisation?.id || "",
    title: "",
    opportunityType: "Skill2Shift",
    location: "Victoria Falls, Matabeleland North",
    description: "",
    tasksText: "",
    requiredSkillsText: "Guest Check-In & Concierge Protocol, Cross-Cultural Communication",
    eligibility: "Open to Zimbabwean tourism students, graduates and professionals.",
    startDate: "2026-11-15",
    endDate: "2026-11-20",
    expectedHours: 40,
    compensationType: "Stipend / Allowance",
    compensationAmount: "USD $100 shift stipend",
    transportProvided: true,
    mealsProvided: true,
    accommodationProvided: false,
    applicationDeadline: "2026-11-10",
    supervisorNameAndRole: `${currentUser?.name} — Placement Supervisor`,
    assessmentExpectations:
      "Confirmed hours logged upon completion; separate practical assessment conducted on demonstrated tasks.",
  });

  const filteredOpps = opportunities.filter((opp) => {
    if (filterType !== "all" && opp.opportunityType !== filterType) return false;
    if (
      filterLocation !== "all" &&
      !opp.location.toLowerCase().includes(filterLocation.toLowerCase())
    )
      return false;
    if (filterComp !== "all" && opp.compensationType !== filterComp) return false;
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      const matchTitle = opp.title.toLowerCase().includes(q);
      const matchOrg = opp.organisation?.name?.toLowerCase().includes(q);
      const matchSkills = (opp.requiredSkills || []).some((s: string) =>
        s.toLowerCase().includes(q)
      );
      if (!matchTitle && !matchOrg && !matchSkills) return false;
    }
    return true;
  });

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingOpp) return;
    setActionStatus(null);
    try {
      await apiFetch(`/api/opportunities/${applyingOpp.id}/apply`, {
        method: "POST",
        body: JSON.stringify({
          supportingMessage,
          attachedPassportIds: selectedPassportIds,
        }),
      });
      setApplyingOpp(null);
      setSupportingMessage("");
      setSelectedPassportIds([]);
      setActionStatus({
        type: "ok",
        text: `Application submitted to ${applyingOpp.organisation?.name}. Track status in Applications.`,
      });
      await onRefresh();
      setSubTab("applications");
    } catch (err: any) {
      setActionStatus({ type: "err", text: err.message });
    }
  };

  const handleApplicationTransition = async (appId: number, nextStatus: string) => {
    setActionStatus(null);
    try {
      await apiFetch(`/api/applications/${appId}/status`, {
        method: "PUT",
        body: JSON.stringify({ nextStatus }),
      });
      setActionStatus({
        type: "ok",
        text: `Application updated to ${nextStatus}.${
          nextStatus === "Accepted"
            ? " If this is a practical placement, a Placement Completion tracker has been initialised."
            : ""
        }`,
      });
      await onRefresh();
    } catch (err: any) {
      setActionStatus({ type: "err", text: err.message });
    }
  };

  const handlePlacementTransition = async (
    placementId: number,
    action: string,
    extraPayload: Record<string, any> = {}
  ) => {
    setActionStatus(null);
    try {
      await apiFetch(`/api/placements/${placementId}/transition`, {
        method: "POST",
        body: JSON.stringify({
          action,
          ...extraPayload,
        }),
      });
      setActivePlacementModal(null);
      setActionStatus({
        type: "ok",
        text:
          action === "member_accept_finalise"
            ? "Placement finalised! Confirmed hours and separate skill assessments have entered your Talent Passport."
            : "Placement workflow updated.",
      });
      await onRefresh();
    } catch (err: any) {
      setActionStatus({ type: "err", text: err.message });
    }
  };

  const handlePublishOpp = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionStatus(null);
    try {
      await apiFetch("/api/opportunities", {
        method: "POST",
        body: JSON.stringify({
          ...newOpp,
          organisationId: Number(newOpp.organisationId),
          tasks: newOpp.tasksText
            .split("\n")
            .map((t) => t.trim())
            .filter(Boolean),
          requiredSkills: newOpp.requiredSkillsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      setActionStatus({
        type: "ok",
        text: "Opportunity published to the TourBridge community.",
      });
      await onRefresh();
      setSubTab("browse");
    } catch (err: any) {
      setActionStatus({ type: "err", text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E0D3] pb-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-[#14241B]">
            Opportunities & Practical Placements
          </h1>
          <p className="text-xs text-[#4A5B50] mt-0.5">
            Discover jobs, internships, apprenticeships and short Skill2Shift assignments
            across Zimbabwe.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#F1ECE1] rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setSubTab("browse")}
            className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              subTab === "browse"
                ? "bg-white text-[#14241B] shadow-sm"
                : "text-[#4A5B50] hover:text-[#14241B]"
            }`}
          >
            Browse ({opportunities.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("applications")}
            className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              subTab === "applications"
                ? "bg-white text-[#14241B] shadow-sm"
                : "text-[#4A5B50] hover:text-[#14241B]"
            }`}
          >
            Applications ({applications.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("placements")}
            className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              subTab === "placements"
                ? "bg-white text-[#14241B] shadow-sm"
                : "text-[#4A5B50] hover:text-[#14241B]"
            }`}
          >
            Placements ({placements.length})
          </button>
          {memberships.length > 0 && (
            <button
              type="button"
              onClick={() => setSubTab("publish")}
              className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                subTab === "publish"
                  ? "bg-[#163A2B] text-white shadow-sm"
                  : "text-[#163A2B] hover:bg-white/60"
              }`}
            >
              + Post Opportunity
            </button>
          )}
        </div>
      </div>

      {actionStatus && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            actionStatus.type === "ok"
              ? "bg-[#1B5E3A]/10 border-[#1B5E3A]/30 text-[#14241B]"
              : "bg-[#9E2A2B]/10 border-[#9E2A2B]/30 text-[#9E2A2B]"
          }`}
        >
          <span>{actionStatus.text}</span>
          <button
            type="button"
            onClick={() => setActionStatus(null)}
            className="text-xs underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: BROWSE OPPORTUNITIES */}
      {subTab === "browse" && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="bg-white border border-[#E6E0D3] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#4A5B50] mb-1">
                Search Title, Employer or Skill
              </label>
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="e.g., PMS, Safari, Chef..."
                className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A5B50] mb-1">
                Opportunity Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl bg-white"
              >
                <option value="all">All Types</option>
                <option value="Skill2Shift">Skill2Shift (Short Assignment)</option>
                <option value="Internship">Internship / Attachment</option>
                <option value="Apprenticeship">Apprenticeship</option>
                <option value="Job">Full-Time / Seasonal Job</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A5B50] mb-1">
                Location
              </label>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl bg-white"
              >
                <option value="all">All Zimbabwe Locations</option>
                <option value="Victoria Falls">Victoria Falls</option>
                <option value="Hwange">Hwange</option>
                <option value="Bulawayo">Bulawayo</option>
                <option value="Harare">Harare</option>
                <option value="Nyanga">Nyanga / Eastern Highlands</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A5B50] mb-1">
                Compensation
              </label>
              <select
                value={filterComp}
                onChange={(e) => setFilterComp(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl bg-white"
              >
                <option value="all">All Compensation Types</option>
                <option value="Paid salary/wage">Paid salary/wage</option>
                <option value="Stipend / Allowance">Stipend / Allowance</option>
                <option value="Unpaid learning placement">
                  Unpaid learning placement
                </option>
              </select>
            </div>
          </div>

          {filteredOpps.length === 0 ? (
            <div className="bg-white border border-[#E6E0D3] rounded-2xl p-8 text-center">
              <p className="text-sm font-medium text-[#14241B]">
                No opportunities match your active filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilterType("all");
                  setFilterLocation("all");
                  setFilterComp("all");
                  setSearchQ("");
                }}
                className="mt-3 px-4 py-2 text-xs font-medium bg-[#163A2B] text-white rounded-xl"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOpps.map((opp) => {
                const myApp = applications.find(
                  (a) =>
                    a.application.opportunityId === opp.id &&
                    a.application.applicantUserId === currentUser?.id
                );
                const isEmployerStaff = memberships.some(
                  (m) => m.organisation.id === opp.organisationId
                );

                return (
                  <div
                    key={opp.id}
                    className="bg-white border border-[#E6E0D3] rounded-2xl p-5 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        {/* Clean unboxed metadata kicker */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#4A5B50]">
                          <span className="font-semibold text-[#163A2B]">
                            {opp.opportunityType}
                          </span>
                          <span aria-hidden="true">·</span>
                          <button
                            type="button"
                            onClick={() => onOpenOrgModal(opp.organisationId)}
                            className="hover:underline font-medium text-[#14241B]"
                          >
                            {opp.organisation?.name}
                          </button>
                          <span aria-hidden="true">·</span>
                          <span>{opp.location}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">
                            {opp.expectedHours} expected hrs
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Status:{" "}
                            <strong className="text-[#14241B]">{opp.status}</strong>
                          </span>
                        </div>
                        <h3 className="text-lg font-display font-semibold text-[#14241B] mt-1">
                          {opp.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isEmployerStaff && (
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/opportunities/${opp.id}/status`, {
                                method: "PUT",
                                body: JSON.stringify({
                                  status: opp.status === "open" ? "closed" : "open",
                                }),
                              });
                              await onRefresh();
                            }}
                            className="px-3 py-2 min-h-[40px] text-xs font-medium border border-[#E6E0D3] rounded-xl hover:bg-[#F1ECE1] whitespace-nowrap"
                          >
                            {opp.status === "open" ? "Close Listing" : "Reopen Listing"}
                          </button>
                        )}

                        {myApp ? (
                          <span className="text-xs font-semibold text-[#163A2B] px-3 py-2">
                            Applied ({myApp.application.status})
                          </span>
                        ) : opp.status !== "open" ? (
                          <span className="text-xs text-[#9E2A2B] font-medium px-3 py-2">
                            Listing Closed
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setApplyingOpp(opp);
                              setSupportingMessage(
                                `Good day ${opp.supervisorNameAndRole || "Hiring Team"}, I would like to apply for "${opp.title}" using my TourBridge profile and Talent Passport.`
                              );
                            }}
                            className="px-4 py-2 min-h-[44px] bg-[#163A2B] text-[#FAF7F2] text-xs font-medium rounded-xl hover:bg-[#1E4D38] transition-colors whitespace-nowrap"
                          >
                            Apply with Passport
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-[#14241B] leading-relaxed">
                      {opp.description}
                    </p>

                    {/* Provisions & Compensation Metadata (Unboxed clean layout) */}
                    <div className="pt-2 border-t border-[#E6E0D3] text-xs text-[#4A5B50] space-y-1.5">
                      <div>
                        <strong className="text-[#14241B]">Compensation:</strong>{" "}
                        {opp.compensationType} ({opp.compensationAmount || "See details"}){" "}
                        <span aria-hidden="true">·</span>{" "}
                        <strong className="text-[#14241B]">Provisions:</strong> Transport:{" "}
                        {opp.transportProvided ? "Provided" : "Not provided"} / Meals:{" "}
                        {opp.mealsProvided ? "Provided" : "Not provided"} / Accommodation:{" "}
                        {opp.accommodationProvided ? "Provided" : "Not provided"}
                      </div>
                      <div>
                        <strong className="text-[#14241B]">Dates:</strong>{" "}
                        {opp.startDate || "Flexible"} to {opp.endDate || "Ongoing"}{" "}
                        <span aria-hidden="true">·</span>{" "}
                        <strong className="text-[#14241B]">Deadline:</strong>{" "}
                        {opp.applicationDeadline} <span aria-hidden="true">·</span>{" "}
                        <strong className="text-[#14241B]">Supervisor:</strong>{" "}
                        {opp.supervisorNameAndRole || "Assigned Supervisor"}
                      </div>
                      <div>
                        <strong className="text-[#14241B]">Required Skills:</strong>{" "}
                        {(opp.requiredSkills || []).join(" · ")}
                      </div>
                      {opp.assessmentExpectations && (
                        <div>
                          <strong className="text-[#14241B]">
                            Placement Assessment Expectations:
                          </strong>{" "}
                          {opp.assessmentExpectations}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: APPLICATIONS */}
      {subTab === "applications" && (
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="bg-white border border-[#E6E0D3] rounded-2xl p-8 text-center">
              <p className="text-sm text-[#4A5B50]">
                No applications submitted or received yet.
              </p>
            </div>
          ) : (
            applications.map(({ application, opportunity, organisation, applicant }) => {
              const isApplicant = application.applicantUserId === currentUser?.id;
              const isEmployer = memberships.some(
                (m) => m.organisation.id === opportunity.organisationId
              );

              return (
                <div
                  key={application.id}
                  className="bg-white border border-[#E6E0D3] rounded-2xl p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-[#4A5B50]">
                        <span>{opportunity.opportunityType}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{organisation.name}</span>
                        <span aria-hidden="true"> · </span>
                        <span>Applicant: {applicant.name}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-semibold text-[#163A2B]">
                          State: {application.status}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-[#14241B] mt-0.5">
                        {opportunity.title}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isApplicant &&
                        ["Submitted", "Shortlisted"].includes(application.status) && (
                          <button
                            type="button"
                            onClick={() =>
                              handleApplicationTransition(application.id, "Withdrawn")
                            }
                            className="px-3 py-1.5 min-h-[38px] text-xs font-medium text-[#9E2A2B] border border-[#9E2A2B]/30 rounded-lg hover:bg-[#9E2A2B]/5 whitespace-nowrap"
                          >
                            Withdraw Application
                          </button>
                        )}

                      {isEmployer && application.status !== "Withdrawn" && (
                        <>
                          {application.status === "Submitted" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleApplicationTransition(application.id, "Shortlisted")
                              }
                              className="px-3 py-1.5 min-h-[38px] text-xs font-medium border border-[#163A2B] text-[#163A2B] rounded-lg hover:bg-[#163A2B]/5 whitespace-nowrap"
                            >
                              Shortlist Candidate
                            </button>
                          )}
                          {["Submitted", "Shortlisted"].includes(application.status) && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleApplicationTransition(application.id, "Accepted")
                                }
                                className="px-3 py-1.5 min-h-[38px] text-xs font-medium bg-[#163A2B] text-white rounded-lg hover:bg-[#1E4D38] whitespace-nowrap"
                              >
                                Accept Candidate
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleApplicationTransition(application.id, "Rejected")
                                }
                                className="px-3 py-1.5 min-h-[38px] text-xs font-medium text-[#9E2A2B] border border-[#E6E0D3] rounded-lg hover:bg-[#9E2A2B]/5 whitespace-nowrap"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#14241B] bg-[#FAF7F2] p-3 rounded-xl border border-[#E6E0D3]">
                    <strong>Supporting Message:</strong> {application.supportingMessage}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: PRACTICAL PLACEMENTS COMPLETION WORKFLOW */}
      {subTab === "placements" && (
        <div className="space-y-4">
          <div className="bg-[#F1ECE1] border border-[#E6E0D3] rounded-2xl p-4 text-xs text-[#14241B] space-y-1">
            <p className="font-semibold">
              Practical Placement Completion & Verification Workflow
            </p>
            <p className="text-[#4A5B50]">
              States:{" "}
              <strong>
                Terms confirmed → In progress → Completion submitted → Supervisor reviewed
                → Member accepted or disputed → Finalised
              </strong>
              . Confirmed attendance hours enter the Talent Passport{" "}
              <strong>exactly once</strong> upon finalisation, and demonstrated skills are
              recorded in a separate competency assessment record.
            </p>
          </div>

          {placements.length === 0 ? (
            <div className="bg-white border border-[#E6E0D3] rounded-2xl p-8 text-center">
              <p className="text-sm text-[#4A5B50]">
                No active or completed practical placements yet.
              </p>
            </div>
          ) : (
            placements.map(({ placement, opportunity, organisation, member }) => {
              const isMember = placement.memberUserId === currentUser?.id;
              const isSupervisor = memberships.some(
                (m) => m.organisation.id === placement.organisationId
              );

              return (
                <div
                  key={placement.id}
                  className="bg-white border border-[#E6E0D3] rounded-2xl p-5 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-[#4A5B50]">
                        <span>Member: {member.name}</span>
                        <span aria-hidden="true"> · </span>
                        <span>Host: {organisation.name}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-semibold text-[#163A2B]">
                          State: {placement.workflowState}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-[#14241B] mt-0.5">
                        {opportunity.title}
                      </h3>
                    </div>

                    {/* Action Controls by Workflow State & Role */}
                    <div className="flex flex-wrap items-center gap-2">
                      {placement.workflowState === "Terms confirmed" &&
                        (isMember || isSupervisor) && (
                          <button
                            type="button"
                            onClick={() =>
                              handlePlacementTransition(placement.id, "start_in_progress")
                            }
                            className="px-3.5 py-2 min-h-[40px] text-xs font-medium bg-[#163A2B] text-white rounded-xl hover:bg-[#1E4D38]"
                          >
                            Confirm Terms & Start Placement
                          </button>
                        )}

                      {placement.workflowState === "In progress" && isMember && (
                        <button
                          type="button"
                          onClick={() => {
                            setClaimedHours(
                              placement.claimedHours || opportunity.expectedHours || 40
                            );
                            setCompletionSummary(
                              placement.memberCompletionSummary ||
                                `Completed practical shifts for ${opportunity.title}, including PMS check-in and guest safety briefings.`
                            );
                            setActivePlacementModal({
                              placement,
                              opportunity,
                              organisation,
                              mode: "submit_completion",
                            });
                          }}
                          className="px-3.5 py-2 min-h-[40px] text-xs font-medium bg-[#163A2B] text-white rounded-xl hover:bg-[#1E4D38]"
                        >
                          Submit Completion for Supervisor Review
                        </button>
                      )}

                      {placement.workflowState === "Completion submitted" &&
                        isSupervisor &&
                        !isMember && (
                          <button
                            type="button"
                            onClick={() => {
                              setSupConfirmedHours(placement.claimedHours || 40);
                              setSupReviewNote(
                                "Verified attendance logbook and observed front-office guest check-in accuracy."
                              );
                              setSupSkills(
                                (opportunity.requiredSkills || []).map((s: string) => ({
                                  skill: s,
                                  proficiency: "Demonstrated in supervised practice",
                                  note: "Assessed during placement shift",
                                }))
                              );
                              setActivePlacementModal({
                                placement,
                                opportunity,
                                organisation,
                                mode: "supervisor_review",
                              });
                            }}
                            className="px-3.5 py-2 min-h-[40px] text-xs font-medium bg-[#163A2B] text-white rounded-xl hover:bg-[#1E4D38]"
                          >
                            Supervisor: Review Hours & Assess Skills
                          </button>
                        )}

                      {placement.workflowState === "Supervisor reviewed" && isMember && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handlePlacementTransition(
                                placement.id,
                                "member_accept_finalise"
                              )
                            }
                            className="px-3.5 py-2 min-h-[40px] text-xs font-medium bg-[#163A2B] text-white rounded-xl hover:bg-[#1E4D38]"
                          >
                            Accept & Finalise to Talent Passport
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDisputeNote("");
                              setActivePlacementModal({
                                placement,
                                opportunity,
                                organisation,
                                mode: "dispute",
                              });
                            }}
                            className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-[#9E2A2B] border border-[#9E2A2B]/40 rounded-xl hover:bg-[#9E2A2B]/5"
                          >
                            Dispute Review
                          </button>
                        </>
                      )}

                      {placement.workflowState === "Finalised" && (
                        <span className="text-xs font-semibold text-[#1B5E3A] flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            Finalised ({placement.supervisorConfirmedHours} hrs in
                            Passport)
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Summary Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E6E0D3]">
                    <div>
                      <span className="text-[#4A5B50] block">Claimed Hours</span>
                      <span className="font-mono-tabular font-semibold text-sm text-[#14241B]">
                        {placement.claimedHours} hrs
                      </span>
                    </div>
                    <div>
                      <span className="text-[#4A5B50] block">
                        Supervisor Confirmed Hours
                      </span>
                      <span className="font-mono-tabular font-semibold text-sm text-[#163A2B]">
                        {placement.supervisorConfirmedHours} hrs
                      </span>
                    </div>
                    <div>
                      <span className="text-[#4A5B50] block">
                        Separately Assessed Skills
                      </span>
                      <span className="font-semibold text-[#14241B]">
                        {(placement.supervisorAssessedSkills || []).length > 0
                          ? placement.supervisorAssessedSkills
                              .map((s: any) => s.skill)
                              .join(" · ")
                          : "Pending supervisor assessment"}
                      </span>
                    </div>
                  </div>

                  {placement.memberCompletionSummary && (
                    <p className="text-xs text-[#14241B]">
                      <strong>Member Completion Summary:</strong>{" "}
                      {placement.memberCompletionSummary}
                    </p>
                  )}

                  {placement.supervisorReviewNote && (
                    <p className="text-xs text-[#163A2B]">
                      <strong>Supervisor Assessment Note:</strong>{" "}
                      {placement.supervisorReviewNote}
                    </p>
                  )}

                  {/* Audit Trail */}
                  {Array.isArray(placement.auditLog) && placement.auditLog.length > 0 && (
                    <div className="border-t border-[#E6E0D3] pt-2.5">
                      <p className="text-[11px] font-semibold text-[#4A5B50] mb-1">
                        Placement Audit History:
                      </p>
                      <div className="space-y-1">
                        {placement.auditLog.map((entry: any, idx: number) => (
                          <div key={idx} className="text-[11px] text-[#4A5B50]">
                            <span className="font-mono-tabular">{entry.date}</span> ·{" "}
                            <strong className="text-[#14241B]">{entry.state}</strong> by{" "}
                            {entry.actor} — {entry.detail}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 4: PUBLISH OPPORTUNITY (EMPLOYERS) */}
      {subTab === "publish" && (
        <div className="bg-white border border-[#E6E0D3] rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-display font-semibold text-[#14241B]">
            Publish a New Tourism Opportunity
          </h2>

          {pendingMemberships.length > 0 && approvedMemberships.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#9E2A2B]/10 border border-[#9E2A2B]/30 text-xs text-[#9E2A2B]">
              <strong>Organisation Approval Required:</strong> Your organisation (
              {pendingMemberships[0].organisation.name}) is currently{" "}
              <strong>Pending</strong> administrator verification. Pending organisations
              cannot publish opportunities until approved by a Platform Administrator.
            </div>
          ) : (
            <form onSubmit={handlePublishOpp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Host Approved Organisation *
                  </label>
                  <select
                    value={newOpp.organisationId}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, organisationId: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl bg-white"
                  >
                    {approvedMemberships.map((m) => (
                      <option key={m.organisation.id} value={m.organisation.id}>
                        {m.organisation.name} ({m.organisation.verificationStatus})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Opportunity Type *
                  </label>
                  <select
                    value={newOpp.opportunityType}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, opportunityType: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl bg-white"
                  >
                    <option value="Skill2Shift">
                      Skill2Shift (Short Practical Assignment)
                    </option>
                    <option value="Internship">Internship / Industrial Attachment</option>
                    <option value="Apprenticeship">Apprenticeship</option>
                    <option value="Job">Job</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Opportunity Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOpp.title}
                    onChange={(e) => setNewOpp({ ...newOpp, title: e.target.value })}
                    placeholder="e.g., Skill2Shift: Weekend Bush Dinner Service & Prep"
                    className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOpp.location}
                    onChange={(e) => setNewOpp({ ...newOpp, location: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Compensation Type * (Explicitly includes unpaid placements)
                  </label>
                  <select
                    value={newOpp.compensationType}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, compensationType: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl bg-white"
                  >
                    <option value="Stipend / Allowance">Stipend / Allowance</option>
                    <option value="Paid salary/wage">Paid salary/wage</option>
                    <option value="Unpaid learning placement">
                      Unpaid learning placement
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Pay / Stipend Details
                  </label>
                  <input
                    type="text"
                    value={newOpp.compensationAmount}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, compensationAmount: e.target.value })
                    }
                    placeholder="e.g., USD $120 allowance or Unpaid practicum"
                    className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Expected Hours
                  </label>
                  <input
                    type="number"
                    value={newOpp.expectedHours}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, expectedHours: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Application Deadline *
                  </label>
                  <input
                    type="date"
                    value={newOpp.applicationDeadline}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, applicationDeadline: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Description & Tasks *
                </label>
                <textarea
                  rows={3}
                  required
                  value={newOpp.description}
                  onChange={(e) => setNewOpp({ ...newOpp, description: e.target.value })}
                  placeholder="Describe the responsibilities, learning environment, and shift schedule..."
                  className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Required Skills (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newOpp.requiredSkillsText}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, requiredSkillsText: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Supervisor & Assessment Expectations
                  </label>
                  <input
                    type="text"
                    value={newOpp.assessmentExpectations}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, assessmentExpectations: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs text-[#14241B]">
                  <input
                    type="checkbox"
                    checked={newOpp.transportProvided}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, transportProvided: e.target.checked })
                    }
                  />
                  <span>Transport Provided</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[#14241B]">
                  <input
                    type="checkbox"
                    checked={newOpp.mealsProvided}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, mealsProvided: e.target.checked })
                    }
                  />
                  <span>Meals Provided</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[#14241B]">
                  <input
                    type="checkbox"
                    checked={newOpp.accommodationProvided}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, accommodationProvided: e.target.checked })
                    }
                  />
                  <span>Accommodation Provided</span>
                </label>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 min-h-[44px] bg-[#163A2B] text-white text-xs font-medium rounded-xl hover:bg-[#1E4D38]"
              >
                Publish Opportunity
              </button>
            </form>
          )}
        </div>
      )}

      {/* MODAL: APPLY WITH PROFILE & TALENT PASSPORT */}
      {applyingOpp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E0D3] rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6E0D3] pb-3">
              <h3 className="text-base font-display font-semibold text-[#14241B]">
                Apply: {applyingOpp.title}
              </h3>
              <button
                type="button"
                onClick={() => setApplyingOpp(null)}
                className="p-1 text-[#4A5B50] hover:text-[#14241B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4">
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E6E0D3] text-xs text-[#4A5B50]">
                You are applying with your TourBridge profile and Talent Passport.{" "}
                <strong>A video portfolio is never required to apply.</strong>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Supporting Message *
                </label>
                <textarea
                  rows={3}
                  required
                  value={supportingMessage}
                  onChange={(e) => setSupportingMessage(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1.5">
                  Highlight Talent Passport Records (Optional)
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {myPassportRecords.map((rec) => (
                    <label
                      key={rec.id}
                      className="flex items-start gap-2 p-2 rounded-lg border border-[#E6E0D3] text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPassportIds.includes(rec.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPassportIds([...selectedPassportIds, rec.id]);
                          } else {
                            setSelectedPassportIds(
                              selectedPassportIds.filter((id) => id !== rec.id)
                            );
                          }
                        }}
                        className="mt-0.5 accent-[#163A2B]"
                      />
                      <div>
                        <span className="font-medium text-[#14241B] block">
                          {rec.title}
                        </span>
                        <span className="text-[11px] text-[#4A5B50]">
                          {rec.recordCategory} · {rec.evidenceStatus}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyingOpp(null)}
                  className="px-4 py-2 text-xs font-medium border border-[#E6E0D3] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#163A2B] text-white text-xs font-medium rounded-xl hover:bg-[#1E4D38]"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PLACEMENT COMPLETION / SUPERVISOR REVIEW / DISPUTE */}
      {activePlacementModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E0D3] rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E6E0D3] pb-3">
              <h3 className="text-base font-display font-semibold text-[#14241B]">
                {activePlacementModal.mode === "submit_completion" &&
                  "Submit Practical Placement Completion"}
                {activePlacementModal.mode === "supervisor_review" &&
                  "Supervisor Review: Attendance Hours & Skill Assessment"}
                {activePlacementModal.mode === "dispute" &&
                  "Raise Placement Verification Dispute"}
              </h3>
              <button
                type="button"
                onClick={() => setActivePlacementModal(null)}
                className="p-1 text-[#4A5B50] hover:text-[#14241B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activePlacementModal.mode === "submit_completion" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Practical Hours Completed
                  </label>
                  <input
                    type="number"
                    value={claimedHours}
                    onChange={(e) => setClaimedHours(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Completion Summary & Tasks Performed
                  </label>
                  <textarea
                    rows={3}
                    value={completionSummary}
                    onChange={(e) => setCompletionSummary(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePlacementModal(null)}
                    className="px-4 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handlePlacementTransition(
                        activePlacementModal.placement.id,
                        "submit_completion",
                        {
                          claimedHours,
                          memberCompletionSummary: completionSummary,
                        }
                      )
                    }
                    className="px-5 py-2 bg-[#163A2B] text-white text-xs font-medium rounded-xl"
                  >
                    Submit for Supervisor Review
                  </button>
                </div>
              </div>
            )}

            {activePlacementModal.mode === "supervisor_review" && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E6E0D3] text-xs text-[#4A5B50]">
                  <strong>Attendance vs. Competence Separation:</strong> Confirmed hours
                  record participation. Only tick and assess skills that the candidate
                  actively demonstrated during the placement.
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Confirmed Practical Attendance Hours
                  </label>
                  <input
                    type="number"
                    value={supConfirmedHours}
                    onChange={(e) => setSupConfirmedHours(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1.5">
                    Skills Demonstrated & Assessed (Uncheck any skill not observed)
                  </label>
                  <div className="space-y-2">
                    {(activePlacementModal.opportunity.requiredSkills || []).map(
                      (skillName: string) => {
                        const isChecked = supSkills.some((s) => s.skill === skillName);
                        return (
                          <div
                            key={skillName}
                            className="p-2.5 rounded-xl border border-[#E6E0D3] space-y-1.5"
                          >
                            <label className="flex items-center gap-2 text-xs font-medium text-[#14241B] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSupSkills([
                                      ...supSkills,
                                      {
                                        skill: skillName,
                                        proficiency: "Demonstrated in supervised practice",
                                        note: "Verified by supervisor",
                                      },
                                    ]);
                                  } else {
                                    setSupSkills(
                                      supSkills.filter((s) => s.skill !== skillName)
                                    );
                                  }
                                }}
                                className="accent-[#163A2B]"
                              />
                              <span>{skillName}</span>
                            </label>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Supervisor Review Note
                  </label>
                  <textarea
                    rows={2}
                    value={supReviewNote}
                    onChange={(e) => setSupReviewNote(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePlacementModal(null)}
                    className="px-4 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handlePlacementTransition(
                        activePlacementModal.placement.id,
                        "supervisor_review",
                        {
                          supervisorConfirmedHours: supConfirmedHours,
                          supervisorAssessedSkills: supSkills,
                          supervisorReviewNote: supReviewNote,
                        }
                      )
                    }
                    className="px-5 py-2 bg-[#163A2B] text-white text-xs font-medium rounded-xl"
                  >
                    Submit Supervisor Assessment
                  </button>
                </div>
              </div>
            )}

            {activePlacementModal.mode === "dispute" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Reason for Disputing Supervisor Review *
                  </label>
                  <textarea
                    rows={3}
                    value={disputeNote}
                    onChange={(e) => setDisputeNote(e.target.value)}
                    placeholder="Explain the discrepancy in confirmed hours or assessed skills for administrator review..."
                    className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePlacementModal(null)}
                    className="px-4 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handlePlacementTransition(
                        activePlacementModal.placement.id,
                        "member_dispute",
                        { disputeNote }
                      )
                    }
                    className="px-5 py-2 bg-[#9E2A2B] text-white text-xs font-medium rounded-xl"
                  >
                    Submit Dispute to Admin
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
