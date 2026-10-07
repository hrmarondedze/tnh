import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  FileText,
  Lock,
  Users,
} from "lucide-react";

interface AdminWorkspaceViewProps {
  apiFetch: (url: string, options?: RequestInit) => Promise<any>;
  onRefreshGlobal: () => Promise<void>;
}

export const AdminWorkspaceView: React.FC<AdminWorkspaceViewProps> = ({
  apiFetch,
  onRefreshGlobal,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<
    "organisations" | "disputes" | "reports" | "users" | "audit"
  >("organisations");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadAdmin = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/overview");
      setData(res);
    } catch (err: any) {
      setStatusMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmin();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-[#E6E0D3] rounded-2xl p-8 text-center text-xs text-[#4A5B50]">
        Loading Platform Administrator Workspace...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white border border-[#E6E0D3] rounded-2xl p-8 text-center text-xs text-[#9E2A2B]">
        {statusMsg || "Administrator access required."}
      </div>
    );
  }

  const handleOrgDecision = async (orgId: number, status: string) => {
    await apiFetch(`/api/admin/organisations/${orgId}/decision`, {
      method: "POST",
      body: JSON.stringify({
        status,
        note: `Reviewed by Platform Administrator on ${new Date().toISOString().slice(0, 10)}`,
      }),
    });
    setStatusMsg(`Organisation status updated to ${status}.`);
    await loadAdmin();
    await onRefreshGlobal();
  };

  const handleResolveReport = async (reportId: number, status: string) => {
    await apiFetch(`/api/admin/reports/${reportId}/resolve`, {
      method: "POST",
      body: JSON.stringify({
        status,
        adminResolutionNote: `Resolved (${status}) by Platform Administrator.`,
      }),
    });
    setStatusMsg(`Report #${reportId} marked as ${status}.`);
    await loadAdmin();
  };

  const handleResolvePlacementDispute = async (
    placementId: number,
    confirmedHours: number
  ) => {
    await apiFetch(`/api/placements/${placementId}/transition`, {
      method: "POST",
      body: JSON.stringify({
        action: "admin_resolve_finalise",
        supervisorConfirmedHours: confirmedHours,
      }),
    });
    setStatusMsg(
      `Disputed placement #${placementId} resolved and finalised (${confirmedHours} hrs).`
    );
    await loadAdmin();
    await onRefreshGlobal();
  };

  const handleToggleUserRestriction = async (userId: number, isRestricted: boolean) => {
    await apiFetch(`/api/admin/users/${userId}/restrict`, {
      method: "POST",
      body: JSON.stringify({ isRestricted }),
    });
    setStatusMsg(`Account restriction updated.`);
    await loadAdmin();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E0D3] pb-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-[#14241B]">
            Platform Administrator Workspace
          </h1>
          <p className="text-xs text-[#4A5B50]">
            Server-enforced governance for organisation approvals, placement disputes,
            suspicious credentials, content reports, and audit logs.
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-[#F1ECE1] rounded-xl overflow-x-auto">
          {[
            {
              id: "organisations",
              label: `Organisations (${data.organisations?.length || 0})`,
            },
            {
              id: "disputes",
              label: `Placement Disputes (${data.disputedPlacements?.length || 0})`,
            },
            { id: "reports", label: `Reports (${data.reports?.length || 0})` },
            { id: "users", label: `Accounts (${data.users?.length || 0})` },
            { id: "audit", label: `Audit Log (${data.auditEvents?.length || 0})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as any)}
              className={`px-3 py-1.5 min-h-[38px] text-xs font-medium rounded-lg whitespace-nowrap ${
                subTab === t.id
                  ? "bg-white text-[#14241B] shadow-sm"
                  : "text-[#4A5B50] hover:text-[#14241B]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-xl bg-[#1B5E3A]/10 border border-[#1B5E3A]/30 text-xs text-[#14241B] flex justify-between">
          <span>{statusMsg}</span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. ORGANISATION APPROVALS */}
      {subTab === "organisations" && (
        <div className="space-y-3">
          {(data.organisations || []).map((org: any) => (
            <div
              key={org.id}
              className="bg-white border border-[#E6E0D3] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="text-xs text-[#4A5B50]">
                  <span>{org.orgType}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{org.location}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="font-semibold text-[#163A2B]">
                    Status: {org.verificationStatus}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[#14241B]">{org.name}</h3>
                <p className="text-xs text-[#4A5B50]">{org.description}</p>
                {org.verificationEvidenceNote && (
                  <p className="text-xs text-[#163A2B] bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E6E0D3]">
                    <strong>Private Verification Note:</strong>{" "}
                    {org.verificationEvidenceNote}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {org.verificationStatus !== "approved" && (
                  <button
                    type="button"
                    onClick={() => handleOrgDecision(org.id, "approved")}
                    className="px-3.5 py-2 min-h-[40px] bg-[#163A2B] text-white text-xs font-medium rounded-xl hover:bg-[#1E4D38]"
                  >
                    Approve Organisation
                  </button>
                )}
                {org.verificationStatus !== "pending" && (
                  <button
                    type="button"
                    onClick={() => handleOrgDecision(org.id, "pending")}
                    className="px-3.5 py-2 min-h-[40px] border border-[#E6E0D3] text-xs font-medium rounded-xl hover:bg-[#F1ECE1]"
                  >
                    Set Pending
                  </button>
                )}
                {org.verificationStatus !== "suspended" && (
                  <button
                    type="button"
                    onClick={() => handleOrgDecision(org.id, "suspended")}
                    className="px-3.5 py-2 min-h-[40px] text-[#9E2A2B] border border-[#9E2A2B]/30 text-xs font-medium rounded-xl hover:bg-[#9E2A2B]/5"
                  >
                    Suspend
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. PLACEMENT DISPUTES */}
      {subTab === "disputes" && (
        <div className="space-y-3">
          {(data.disputedPlacements || []).length === 0 ? (
            <div className="bg-white border border-[#E6E0D3] rounded-2xl p-8 text-center text-xs text-[#4A5B50]">
              No active placement disputes awaiting resolution.
            </div>
          ) : (
            data.disputedPlacements.map(
              ({ placement, opportunity, organisation, member }: any) => (
                <div
                  key={placement.id}
                  className="bg-white border border-[#E6E0D3] rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#9E2A2B] font-semibold">
                        Disputed Placement #{placement.id} · Member: {member.name} · Host:{" "}
                        {organisation.name}
                      </span>
                      <h3 className="text-base font-semibold text-[#14241B]">
                        {opportunity.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleResolvePlacementDispute(
                          placement.id,
                          placement.claimedHours || 40
                        )
                      }
                      className="px-4 py-2 bg-[#163A2B] text-white text-xs font-medium rounded-xl"
                    >
                      Resolve & Finalise ({placement.claimedHours} hrs)
                    </button>
                  </div>
                  <p className="text-xs text-[#14241B]">
                    <strong>Dispute Reason:</strong> {placement.disputeNote}
                  </p>
                </div>
              )
            )
          )}
        </div>
      )}

      {/* 3. REPORTS & SUSPICIOUS CREDENTIALS */}
      {subTab === "reports" && (
        <div className="space-y-3">
          {(data.reports || []).map(({ report, reporter }: any) => (
            <div
              key={report.id}
              className="bg-white border border-[#E6E0D3] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="text-xs text-[#4A5B50]">
                  <span>Target: {report.targetType} #{report.targetId}</span>
                  <span aria-hidden="true"> · </span>
                  <span>Reported by: {reporter.name}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="font-semibold text-[#14241B]">
                    Status: {report.status}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[#14241B]">{report.reason}</h3>
                <p className="text-xs text-[#4A5B50]">{report.details}</p>
              </div>
              {report.status === "open" && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleResolveReport(report.id, "resolved")}
                    className="px-3.5 py-2 bg-[#163A2B] text-white text-xs font-medium rounded-xl"
                  >
                    Mark Resolved
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolveReport(report.id, "dismissed")}
                    className="px-3.5 py-2 border border-[#E6E0D3] text-xs font-medium rounded-xl"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 4. USER ACCOUNT RESTRICTIONS */}
      {subTab === "users" && (
        <div className="bg-white border border-[#E6E0D3] rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E6E0D3] bg-[#FAF7F2] text-[#4A5B50]">
                <th className="p-3.5">Member</th>
                <th className="p-3.5">Career Stage</th>
                <th className="p-3.5">Platform Role</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(data.users || []).map((u: any) => (
                <tr key={u.id} className="border-b border-[#E6E0D3]">
                  <td className="p-3.5 font-medium text-[#14241B]">
                    {u.name} ({u.email})
                  </td>
                  <td className="p-3.5 text-[#4A5B50]">{u.careerStage}</td>
                  <td className="p-3.5 font-mono-tabular">{u.platformRole}</td>
                  <td className="p-3.5">
                    {u.isRestricted ? (
                      <span className="text-[#9E2A2B] font-semibold">Restricted</span>
                    ) : (
                      <span className="text-[#1B5E3A] font-semibold">Active</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    {u.platformRole !== "admin" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleUserRestriction(u.id, !u.isRestricted)
                        }
                        className="px-3 py-1.5 border border-[#E6E0D3] rounded-lg hover:bg-[#F1ECE1]"
                      >
                        {u.isRestricted ? "Restore Access" : "Restrict Account"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. AUDIT HISTORY */}
      {subTab === "audit" && (
        <div className="bg-white border border-[#E6E0D3] rounded-2xl p-5 space-y-2.5">
          {(data.auditEvents || []).map((ev: any) => (
            <div
              key={ev.id}
              className="text-xs border-b border-[#E6E0D3] pb-2.5 last:border-b-0"
            >
              <span className="font-mono-tabular text-[#4A5B50]">
                {new Date(ev.createdAt).toISOString().slice(0, 16).replace("T", " ")}
              </span>{" "}
              · <strong className="text-[#163A2B]">{ev.actionType}</strong> by{" "}
              <strong className="text-[#14241B]">{ev.actorName}</strong> — {ev.summary}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
