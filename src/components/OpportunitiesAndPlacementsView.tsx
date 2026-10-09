import React, { useState } from "react";

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
  onNavigateToSearchOpportunities?: () => void;
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

export const OpportunitiesAndPlacementsView: React.FC<
  OpportunitiesAndPlacementsViewProps
> = ({
  currentUser,
  memberships,
  applications,
  onRefresh,
  apiFetch,
  onNavigateToSearchOpportunities,
}) => {
  const [subTab, setSubTab] = useState<"applications" | "publish">(
    "applications"
  );

  const [actionStatus, setActionStatus] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

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
    requiredSkillsText:
      "Guest Check-In & Concierge Protocol, Cross-Cultural Communication",
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

  const handleApplicationTransition = async (
    appId: number,
    nextStatus: string
  ) => {
    setActionStatus(null);
    try {
      await apiFetch(`/api/applications/${appId}/status`, {
        method: "PUT",
        body: JSON.stringify({ nextStatus }),
      });
      setActionStatus({
        type: "ok",
        text:
          nextStatus === "Accepted"
            ? "Application accepted! Placement & skill verification created in Talent Passport."
            : `Application updated to ${nextStatus}`,
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
          requiredSkills: newOpp.requiredSkillsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      setActionStatus({
        type: "ok",
        text: "Opportunity published to TourBridge Search.",
      });
      await onRefresh();
      setSubTab("applications");
    } catch (err: any) {
      setActionStatus({ type: "err", text: err.message });
    }
  };

  return (
    <div className="pb-12">
      {/* Sticky Segmented Bar (.seg) — Placements tab removed (consolidated into Talent Passport) */}
      <div className="seg !top-0">
        <button
          type="button"
          className={subTab === "applications" ? "on" : ""}
          onClick={() => setSubTab("applications")}
        >
          Applications ({applications.length})
        </button>
        {memberships.length > 0 && (
          <button
            type="button"
            className={subTab === "publish" ? "on" : ""}
            onClick={() => setSubTab("publish")}
          >
            + Post Role
          </button>
        )}
      </div>

      {/* Feedback Banner */}
      {actionStatus && (
        <div
          className="mx-4 mt-3 p-3 rounded-2xl text-xs font-semibold flex items-center justify-between"
          style={{
            background: actionStatus.type === "ok" ? "#e6f2f3" : "#fdece5",
            color: actionStatus.type === "ok" ? "#0b5d66" : "#b84a22",
          }}
        >
          <span>{actionStatus.text}</span>
          <button
            type="button"
            onClick={() => setActionStatus(null)}
            className="underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =====================================================================
          TAB 1: APPLICATIONS LIST (Exact .opp cards + .srow applicant headers)
      ===================================================================== */}
      {subTab === "applications" && (
        <div className="sSec">
          <div className="sSecHead">
            <h3>Submitted &amp; Candidate Applications</h3>
            {onNavigateToSearchOpportunities ? (
              <button type="button" onClick={onNavigateToSearchOpportunities}>
                Browse in Search
              </button>
            ) : (
              <span>{applications.length} total</span>
            )}
          </div>

          {applications.length === 0 ? (
            <div className="sEmpty">
              <b>No applications yet</b>
              Browse open opportunities in Search and apply with your Talent
              Passport.
            </div>
          ) : (
            applications.map(
              ({ application, opportunity, organisation, applicant }) => {
                const isApplicant =
                  application.applicantUserId === currentUser?.id;
                const isEmployer = memberships.some(
                  (m) => m.organisation.id === opportunity.organisationId
                );
                const appK = pickColorKey(applicant.name || "TM");

                return (
                  <div key={application.id} className="opp">
                    <div className="top">
                      <span className="otype">
                        {opportunity.opportunityType}
                      </span>
                      <span
                        className={`pill ${
                          application.status === "Rejected" ||
                          application.status === "Withdrawn"
                            ? "co"
                            : ""
                        }`}
                      >
                        {application.status}
                      </span>
                    </div>

                    <h4>{opportunity.title}</h4>
                    <p>
                      Host:{" "}
                      {organisation.name.replace(/\s*\(Fictional Demo\)/i, "")}{" "}
                      · {opportunity.location}
                    </p>

                    <div className="srow !py-2 !mt-1">
                      <div
                        className="avatar !w-9 !h-9"
                        style={{
                          background: applicant.avatarUrl
                            ? `url(${applicant.avatarUrl}) center/cover`
                            : grad(appK),
                        }}
                      >
                        {!applicant.avatarUrl && getInitials(applicant.name)}
                      </div>
                      <div className="who">
                        <div className="name">{applicant.name}</div>
                        <div className="meta">
                          {applicant.careerStage} · {applicant.location}
                        </div>
                      </div>
                    </div>

                    <p className="mt-1 !text-[#0f1720] bg-[#f5f6f8] p-2.5 rounded-xl">
                      “{application.supportingMessage}”
                    </p>

                    <div className="bot">
                      <div className="facts">
                        <span>{opportunity.expectedHours} expected hrs</span>
                        {Array.isArray(application.attachedPassportIds) &&
                          application.attachedPassportIds.length > 0 && (
                            <span
                              style={{
                                background: "#e6f2f3",
                                color: "#0b5d66",
                              }}
                            >
                              {application.attachedPassportIds.length} Passport
                              records attached
                            </span>
                          )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isApplicant &&
                          ["Submitted", "Shortlisted"].includes(
                            application.status
                          ) && (
                            <button
                              type="button"
                              className="fol on !text-[#b84a22]"
                              onClick={() =>
                                handleApplicationTransition(
                                  application.id,
                                  "Withdrawn"
                                )
                              }
                            >
                              Withdraw
                            </button>
                          )}

                        {isEmployer && application.status !== "Withdrawn" && (
                          <>
                            {application.status === "Submitted" && (
                              <button
                                type="button"
                                className="fol on"
                                onClick={() =>
                                  handleApplicationTransition(
                                    application.id,
                                    "Shortlisted"
                                  )
                                }
                              >
                                Shortlist
                              </button>
                            )}
                            {["Submitted", "Shortlisted"].includes(
                              application.status
                            ) && (
                              <>
                                <button
                                  type="button"
                                  className="fol"
                                  onClick={() =>
                                    handleApplicationTransition(
                                      application.id,
                                      "Accepted"
                                    )
                                  }
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  className="fol on !text-[#b84a22]"
                                  onClick={() =>
                                    handleApplicationTransition(
                                      application.id,
                                      "Rejected"
                                    )
                                  }
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            )
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: PUBLISH OPPORTUNITY (Exact .lab, .fld & .chipI styling)
      ===================================================================== */}
      {subTab === "publish" && (
        <div className="px-4 pt-3">
          {pendingMemberships.length > 0 && approvedMemberships.length === 0 ? (
            <div className="sEmpty">
              <b>Organisation Approval Required</b>
              Your organisation ({pendingMemberships[0].organisation.name}) is
              currently Pending administrator approval and cannot publish
              opportunities yet.
            </div>
          ) : (
            <form onSubmit={handlePublishOpp}>
              <div className="sSecHead">
                <h3>Publish New Tourism Opportunity</h3>
              </div>

              <div className="two">
                <div>
                  <label className="lab">Host Organisation</label>
                  <select
                    className="fld"
                    value={newOpp.organisationId}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, organisationId: e.target.value })
                    }
                  >
                    {approvedMemberships.map((m) => (
                      <option key={m.organisation.id} value={m.organisation.id}>
                        {m.organisation.name.replace(
                          /\s*\(Fictional Demo\)/i,
                          ""
                        )}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="lab">Type</label>
                  <select
                    className="fld"
                    value={newOpp.opportunityType}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, opportunityType: e.target.value })
                    }
                  >
                    <option value="Skill2Shift">Skill2Shift</option>
                    <option value="Internship">Internship</option>
                    <option value="Apprenticeship">Apprenticeship</option>
                    <option value="Job">Job</option>
                  </select>
                </div>
              </div>

              <label className="lab">Title</label>
              <input
                type="text"
                required
                className="fld"
                placeholder="e.g. Skill2Shift: Weekend Bush Dinner Service"
                value={newOpp.title}
                onChange={(e) =>
                  setNewOpp({ ...newOpp, title: e.target.value })
                }
              />

              <div className="two">
                <div>
                  <label className="lab">Location</label>
                  <input
                    type="text"
                    required
                    className="fld"
                    value={newOpp.location}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, location: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="lab">Expected Hours</label>
                  <input
                    type="number"
                    className="fld"
                    value={newOpp.expectedHours}
                    onChange={(e) =>
                      setNewOpp({
                        ...newOpp,
                        expectedHours: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="two">
                <div>
                  <label className="lab">Compensation Type</label>
                  <select
                    className="fld"
                    value={newOpp.compensationType}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, compensationType: e.target.value })
                    }
                  >
                    <option value="Stipend / Allowance">
                      Stipend / Allowance
                    </option>
                    <option value="Paid salary/wage">Paid salary/wage</option>
                    <option value="Unpaid learning placement">
                      Unpaid learning placement
                    </option>
                  </select>
                </div>
                <div>
                  <label className="lab">Amount / Allowance</label>
                  <input
                    type="text"
                    className="fld"
                    value={newOpp.compensationAmount}
                    onChange={(e) =>
                      setNewOpp({
                        ...newOpp,
                        compensationAmount: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <label className="lab">Description &amp; Tasks</label>
              <textarea
                rows={3}
                required
                className="fld"
                value={newOpp.description}
                onChange={(e) =>
                  setNewOpp({ ...newOpp, description: e.target.value })
                }
              />

              <label className="lab">Required Skills (Comma-separated)</label>
              <input
                type="text"
                className="fld"
                value={newOpp.requiredSkillsText}
                onChange={(e) =>
                  setNewOpp({ ...newOpp, requiredSkillsText: e.target.value })
                }
              />

              <label className="lab">Candidate Support Included</label>
              <div className="chips">
                <button
                  type="button"
                  onClick={() =>
                    setNewOpp({
                      ...newOpp,
                      transportProvided: !newOpp.transportProvided,
                    })
                  }
                  className={`chipI ${newOpp.transportProvided ? "on" : ""}`}
                >
                  Transport Provided
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewOpp({
                      ...newOpp,
                      mealsProvided: !newOpp.mealsProvided,
                    })
                  }
                  className={`chipI ${newOpp.mealsProvided ? "on" : ""}`}
                >
                  Duty Meals
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewOpp({
                      ...newOpp,
                      accommodationProvided: !newOpp.accommodationProvided,
                    })
                  }
                  className={`chipI ${
                    newOpp.accommodationProvided ? "on" : ""
                  }`}
                >
                  Staff Accommodation
                </button>
              </div>

              <button type="submit" className="obBtn mt-5">
                Publish Opportunity
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
