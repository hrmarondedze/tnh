import React, { useState, useEffect, useCallback } from "react";
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, googleAuthProvider } from "./lib/firebase.ts";
import { OnboardingWizard } from "./components/OnboardingWizard.tsx";
import { OpportunitiesAndPlacementsView } from "./components/OpportunitiesAndPlacementsView.tsx";
import { ProfileAndPassportView } from "./components/ProfileAndPassportView.tsx";
import { AdminWorkspaceView } from "./components/AdminWorkspaceView.tsx";

/* ---------- Gradient Palettes from Reference UI ---------- */
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

/* ---------- Career Roadmap Paths & Interests from Reference UI ---------- */
const INTERESTS: Array<[string, string]> = [
  ["hotel", "Hotel operations"],
  ["fnb", "Food & beverage"],
  ["culinary", "Culinary arts"],
  ["tour", "Tour guiding"],
  ["wildlife", "Wildlife & safari"],
  ["travel", "Travel planning"],
  ["events", "Events & conferences"],
  ["guest", "Guest experience"],
  ["spa", "Spa & wellness"],
  ["revenue", "Sales & revenue"],
  ["cruise", "Cruise & airlines"],
  ["eco", "Sustainable tourism"],
];

interface RoadmapStep {
  k: "skill" | "exp";
  t: string;
  h: number;
}
interface CareerPathDef {
  id: string;
  backendPathwayId: string;
  name: string;
  tags: string[];
  blurb: string;
  seed: number[];
  steps: RoadmapStep[];
}

const skl = (t: string, h: number): RoadmapStep => ({ k: "skill", t, h });
const exp = (t: string, h: number): RoadmapStep => ({ k: "exp", t, h });

const PATHS: CareerPathDef[] = [
  {
    id: "gm",
    backendPathwayId: "front-office",
    name: "Hotel General Manager",
    tags: ["hotel", "guest", "revenue", "events", "spa"],
    blurb: "Acquire all core hospitality and guest-relations skills end to end.",
    seed: [40, 40, 15, 0, 0, 0],
    steps: [
      skl("Property Management Systems (PMS)", 40),
      skl("Guest Check-In & Concierge Protocol", 40),
      skl("Itinerary & Transfer Coordination", 30),
      skl("Cross-Cultural Communication", 30),
      skl("Complaint Resolution & Service Recovery", 40),
      skl("Foreign Currency & Billing Reconciliation", 40),
    ],
  },
  {
    id: "guide",
    backendPathwayId: "safari-guide",
    name: "Professional Tour Guide",
    tags: ["tour", "wildlife", "travel", "eco", "guest"],
    blurb: "Acquire all core wildlife, safety and guiding interpretation skills.",
    seed: [40, 40, 20, 0, 0, 0],
    steps: [
      skl("Wildlife Track & Sign Interpretation", 40),
      skl("Guest Safety & Bush Briefing", 40),
      skl("4x4 Off-Road Vehicle Handling", 40),
      skl("Bird Identification & Ecology", 30),
      skl("Wilderness First Aid", 30),
      skl("Conservation Ethics & Community Liaison", 40),
    ],
  },
  {
    id: "chef",
    backendPathwayId: "food-beverage",
    name: "Executive Chef",
    tags: ["culinary", "fnb", "guest"],
    blurb: "Acquire all core culinary, hygiene, menu plating and F&B skills.",
    seed: [30, 30, 0, 0, 0, 0],
    steps: [
      skl("Food Safety & HACCP Hygiene", 30),
      skl("Contemporary Zimbabwean Menu Plating", 40),
      skl("Bush Dinner & Remote Catering Logistics", 40),
      skl("Beverage & Wine Pairing Service", 30),
      skl("Kitchen Inventory & Cost Control", 30),
      skl("Dietary & Allergen Management", 30),
    ],
  },
  {
    id: "events",
    backendPathwayId: "event-coordinator",
    name: "Events Manager",
    tags: ["events", "guest", "travel", "revenue", "hotel"],
    blurb: "Acquire all core event setup, vendor and delegate logistics skills.",
    seed: [30, 0, 0, 0, 0],
    steps: [
      skl("Venue Setup & Banqueting Operations", 30),
      skl("Vendor & Supplier Negotiation", 30),
      skl("Delegate Registration & Logistics", 30),
      skl("Run-of-Show Timeline Management", 30),
      skl("Risk & Crowd Safety Compliance", 24),
    ],
  },
  {
    id: "travel",
    backendPathwayId: "tourism-marketing",
    name: "Travel Consultant",
    tags: ["travel", "cruise", "tour", "eco", "revenue"],
    blurb: "Acquire all core destination storytelling, trade and booking skills.",
    seed: [30, 0, 0, 0, 0],
    steps: [
      skl("Visual Destination Storytelling", 30),
      skl("Conservation-Sensitive Photography", 30),
      skl("Social Community Management", 30),
      skl("Tour Operator Trade Copywriting", 30),
      skl("Direct Booking Campaign Analytics", 30),
    ],
  },
];

const pathOf = (id: string) => PATHS.find((p) => p.id === id) || PATHS[0];
const totalHrs = (p: CareerPathDef) => p.steps.reduce((a, s) => a + s.h, 0);

function rankPaths(interests: string[]) {
  const set = new Set(interests);
  return PATHS.map((p) => {
    const o = p.tags.filter((t) => set.has(t)).length;
    const m = o
      ? Math.min(99, Math.round(55 + (45 * o) / Math.min(Math.max(1, set.size), p.tags.length)))
      : 35;
    return { p, m };
  }).sort((a, b) => b.m - a.m);
}

const DEMO_PERSONA_LIST = [
  { key: "demo-student", label: "Tariro Moyo (Student)", sub: "Bulawayo · Hospitality" },
  { key: "demo-guide", label: "Farai Ndlovu (Safari Guide)", sub: "Hwange · Supervisor" },
  { key: "demo-hospitality", label: "Nyasha Chikwanda (Chef)", sub: "Nyanga · Culinary" },
  { key: "demo-employer", label: "Kudzai Sibanda (Lodge Employer)", sub: "Victoria Falls · Zambezi Canopy" },
  { key: "demo-institution", label: "Dr. Chipo Mutasa (Institution)", sub: "Bulawayo · Registrar" },
  { key: "demo-admin", label: "Tendai Gumbo (Platform Admin)", sub: "Harare · Moderation & Approvals" },
];

const PRESET_MEDIA_OPTIONS = [
  { label: "Zambezi Canopy Eco-Lodge", url: "/src/assets/images/vicfalls_lodge_safari_1791386419455.jpg", k: "teal", g: "sun" },
  { label: "Hwange Walking Safari", url: "/src/assets/images/hwange_safari_guiding_1791386430930.jpg", k: "forest", g: "route" },
  { label: "Culinary Fine Plating", url: "/src/assets/images/harare_culinary_plating_1791386442823.jpg", k: "coral", g: "camera" },
  { label: "Nyanga Front Office", url: "/src/assets/images/nyanga_front_office_1791386453942.jpg", k: "navy", g: "sun" },
];

/* ---------- SVG Glyph Helper ---------- */
const GlyphSvg: React.FC<{ name: string; size?: number }> = ({ name, size = 24 }) => {
  const strokeW = size > 40 ? "1.2" : size >= 28 ? "1.5" : "1.9";
  if (name === "sun") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      </svg>
    );
  }
  if (name === "route") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="6" r="2" />
        <path d="M8 18h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16" />
      </svg>
    );
  }
  if (name === "clock") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2L9 5h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  );
};

const VerifiedBadgeSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#0b5d66">
    <path d="m12 2 2.4 1.9 3-.2 1 2.9 2.6 1.6-.8 3 .8 3-2.6 1.6-1 2.9-3-.2L12 22l-2.4-1.9-3 .2-1-2.9L3 15.8l.8-3-.8-3 2.6-1.6 1-2.9 3 .2L12 2Z" />
    <path d="m8.6 12.2 2.4 2.4 4.4-4.8" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PinSvg = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
);

export default function App() {
  // Authentication state (Token kept strictly in memory)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [activeDemoPersona, setActiveDemoPersona] = useState<string>("demo-student");

  // Primary 4-tab navigation from exact design: 'home' | 'search' | 'tours' | 'profile'
  const [activeTab, setActiveTab] = useState<"home" | "search" | "tours" | "profile">("home");

  // Secondary full-feature drawers/modals (preserving 100% of backend capabilities)
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showOnboardingOverlay, setShowOnboardingOverlay] = useState(false);
  const [obStep, setObStep] = useState<1 | 2>(1);
  const [obSelectedInterests, setObSelectedInterests] = useState<string[]>([
    "hotel",
    "tour",
    "guest",
  ]);
  const [obChosenPathId, setObChosenPathId] = useState<string>("gm");

  const [showFullQuestionnaireModal, setShowFullQuestionnaireModal] = useState(false);
  const [showOpportunitiesWorkspaceModal, setShowOpportunitiesWorkspaceModal] = useState(false);
  const [showFullPassportModal, setShowFullPassportModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showAccountMenuModal, setShowAccountMenuModal] = useState(false);
  const [optionsActiveSection, setOptionsActiveSection] = useState<
    "menu" | "applications" | "passport" | "edit" | "account"
  >("menu");
  const [selectedOrgModalId, setSelectedOrgModalId] = useState<number | null>(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  // Backend Data State
  const [sessionData, setSessionData] = useState<any | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [membersList, setMembersList] = useState<any[]>([]);
  const [relationshipsList, setRelationshipsList] = useState<any[]>([]);
  const [organisationsList, setOrganisationsList] = useState<any[]>([]);
  const [opportunitiesList, setOpportunitiesList] = useState<any[]>([]);
  const [applicationsList, setApplicationsList] = useState<any[]>([]);
  const [placementsList, setPlacementsList] = useState<any[]>([]);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [messagesData, setMessagesData] = useState<{ messages: any[]; partners: any[] }>({
    messages: [],
    partners: [],
  });
  const [activeChatPartnerId, setActiveChatPartnerId] = useState<number | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [viewedProfileUserId, setViewedProfileUserId] = useState<number | null>(null);

  // Search Screen State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState<"all" | "people" | "companies" | "opps" | "topics">("all");
  const [searchOppTypeFilter, setSearchOppTypeFilter] = useState<string>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "Front office",
    "Safari guide",
    "Zambezi Canopy",
  ]);

  // Apply with Talent Passport Sheet State (triggered directly from Search -> Opportunities)
  const [applyingOppModal, setApplyingOppModal] = useState<any | null>(null);
  const [applySupportingMsg, setApplySupportingMsg] = useState("");
  const [applyPassportIds, setApplyPassportIds] = useState<number[]>([]);

  // Roadmap State
  const [roadmapPathId, setRoadmapPathId] = useState<string>("gm");
  const [roadmapDoneHours, setRoadmapDoneHours] = useState<number[]>([40, 40, 15, 0, 0, 0]);
  const [roadmapSkillModal, setRoadmapSkillModal] = useState<{
    stepIndex: number;
    skillTitle: string;
    targetHours: number;
    mode: "submit_verification" | "self_declare";
  } | null>(null);
  const [rmClaimedHours, setRmClaimedHours] = useState<number>(40);
  const [rmOrgId, setRmOrgId] = useState<string>("");
  const [rmIssuerName, setRmIssuerName] = useState<string>("");
  const [rmEvidenceSummary, setRmEvidenceSummary] = useState<string>("");
  const [rmPrivateNote, setRmPrivateNote] = useState<string>("");

  // + Passport Record Sheet State (opened directly from Profile -> Passport tab)
  const [showAddPassportSheet, setShowAddPassportSheet] = useState(false);
  const [quickPassportForm, setQuickPassportForm] = useState({
    recordCategory: "Certificate",
    title: "",
    issuerOrOrganisationName: "",
    organisationId: "",
    skillsText: "Guest Check-In & Concierge Protocol, Cross-Cultural Communication",
    publicSummary: "",
    privateDocContent: "",
    submitForReview: true,
  });

  // Profile Segmented Filter ('all' | 'day' | 'passport') — 'Tours' tab removed from Profile
  const [profileSegment, setProfileSegment] = useState<"all" | "day" | "passport">("all");

  // Active Story Viewer Modal (shows story posts from other users or company pages only)
  const [activeStoryItem, setActiveStoryItem] = useState<{
    kind: "user" | "company";
    id: number;
    name: string;
    subtitle: string;
    avatarUrl?: string;
    caption: string;
    mediaUrl?: string;
    location: string;
  } | null>(null);

  // Create Post Sheet State ('life' | 'day' | 'tour')
  const [cpType, setCpType] = useState<"life" | "day" | "tour">("life");
  const [cpCaption, setCpCaption] = useState("");
  const [cpPhotos, setCpPhotos] = useState<Array<{ k: string; g: string; url: string }>>([
    PRESET_MEDIA_OPTIONS[0],
  ]);
  const [cpLoc, setCpLoc] = useState("Victoria Falls, Zimbabwe");
  const [cpCompany, setCpCompany] = useState("Zambezi Canopy Eco-Lodge");
  const [cpEntries, setCpEntries] = useState<Array<{ t: string; title: string; d: string }>>([
    { t: "06:30", title: "Briefing", d: "Shift huddle with the F&B supervisor" },
    { t: "09:00", title: "Breakfast service", d: "Ran the buffet station for 85 guests" },
    { t: "13:00", title: "Guest desk", d: "Coordinated airport shuttle manifests" },
  ]);

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      if (u) {
        const token = await u.getIdToken();
        setIdToken(token);
      } else {
        setIdToken(null);
      }
    });
    return () => unsub();
  }, []);

  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
      } else if (activeDemoPersona) {
        headers["Authorization"] = `Bearer demo-persona:${activeDemoPersona}`;
        headers["x-demo-persona"] = activeDemoPersona;
      }
      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      return data;
    },
    [idToken, activeDemoPersona]
  );

  const loadAllData = useCallback(async () => {
    try {
      const [meRes, feedRes, oppsRes, appsRes, orgsRes, membersRes, notifRes, msgRes] =
        await Promise.all([
          apiFetch("/api/me"),
          apiFetch("/api/posts?view=community&page=1&limit=20"),
          apiFetch("/api/opportunities"),
          apiFetch("/api/applications"),
          apiFetch("/api/organisations"),
          apiFetch("/api/members"),
          apiFetch("/api/notifications"),
          apiFetch("/api/messages"),
        ]);

      setSessionData(meRes);
      setFeedPosts(feedRes.posts || []);
      setOpportunitiesList(oppsRes.opportunities || []);
      setApplicationsList(appsRes.applications || []);
      setPlacementsList(appsRes.placements || []);
      setOrganisationsList(orgsRes.organisations || []);
      setMembersList(membersRes.members || []);
      setRelationshipsList(membersRes.relationships || []);
      setNotificationsList(notifRes.notifications || []);
      setMessagesData(msgRes);

      if (!viewedProfileUserId && meRes.user?.id) {
        setViewedProfileUserId(meRes.user.id);
      }
      if (!activeChatPartnerId && msgRes.partners?.length > 0) {
        setActiveChatPartnerId(msgRes.partners[0].id);
      }

      // Sync roadmap path with user's selectedPathwayId & Passport records
      const userPathway = meRes.user?.selectedPathwayId;
      const matchedPath =
        PATHS.find((p) => p.backendPathwayId === userPathway) || PATHS[0];
      setRoadmapPathId(matchedPath.id);
      const userRecords = meRes.metrics?.records || [];
      const userAssessedSkills: string[] = meRes.metrics?.assessedSkills || [];
      const syncedHours = matchedPath.steps.map((stepObj, idx) => {
        const hasRecord = userRecords.some((rec: any) =>
          (rec.skillsDemonstrated || []).some(
            (sk: string) => sk.toLowerCase() === stepObj.t.toLowerCase()
          )
        );
        const isAssessed = userAssessedSkills.some(
          (sk: string) => sk.toLowerCase() === stepObj.t.toLowerCase()
        );
        if (hasRecord || isAssessed) {
          return stepObj.h;
        }
        return matchedPath.seed[idx] || 0;
      });
      setRoadmapDoneHours(syncedHours);
    } catch (err: any) {
      console.error("Failed loading TourBridge state:", err);
    } finally {
      setLoadingSession(false);
    }
  }, [apiFetch, viewedProfileUserId, activeChatPartnerId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const currentUser = sessionData?.user;
  const myMemberships = sessionData?.memberships || [];
  const myPassportRecords = sessionData?.metrics?.records || [];
  const confirmedPracticalHours = sessionData?.metrics?.confirmedPracticalHours || 0;
  const assessedSkills = sessionData?.metrics?.assessedSkills || [];

  // Like / Save Post handler connected to real backend
  const handleInteractPost = async (postId: number, interactionType: "like" | "save") => {
    try {
      await apiFetch(`/api/posts/${postId}/interact`, {
        method: "POST",
        body: JSON.stringify({ interactionType }),
      });
      await loadAllData();
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // Comment handler connected to real backend
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommentPostId || !commentDraft.trim()) return;
    try {
      await apiFetch(`/api/posts/${activeCommentPostId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: commentDraft }),
      });
      setCommentDraft("");
      showToast("Comment posted");
      await loadAllData();
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // Follow / Connect handler in Search
  const handleFollowToggle = async (targetUserId: number, isCurrentlyFollowing: boolean) => {
    try {
      await apiFetch("/api/relationships", {
        method: "POST",
        body: JSON.stringify({
          targetId: targetUserId,
          relType: "follow",
          action: isCurrentlyFollowing ? "remove" : "create",
        }),
      });
      await loadAllData();
      showToast(isCurrentlyFollowing ? "Unfollowed" : "Following");
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // Apply to Opportunity directly from Search or Opportunities modal
  const handleQuickApply = async (opp: any) => {
    try {
      await apiFetch(`/api/opportunities/${opp.id}/apply`, {
        method: "POST",
        body: JSON.stringify({
          supportingMessage: `Applying with my TourBridge profile and Talent Passport for ${opp.title}.`,
          attachedPassportIds: myPassportRecords.slice(0, 2).map((r: any) => r.id),
        }),
      });
      await loadAllData();
      showToast(`Applied to ${opp.title}`);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // Publish New Post from Create Sheet ('Life at work' | 'Day in the life' | 'Tour progress')
  const isCpValid = () => {
    if (cpType === "life") return Boolean(cpCaption.trim() || cpPhotos.length > 0);
    if (cpType === "day")
      return Boolean(cpCompany.trim() && cpEntries.some((e) => e.title.trim()));
    return true;
  };

  const handlePublishCreatePost = async () => {
    if (!isCpValid()) return;
    try {
      let postType = "Work showcase";
      let finalCaption = cpCaption.trim();
      let mediaUrl = cpPhotos[0]?.url || "";
      let skillTags: string[] = ["Guest Check-In & Concierge Protocol"];

      if (cpType === "life") {
        postType = "Work showcase";
        if (!finalCaption) {
          finalCaption = `Sharing a snapshot from ${cpLoc || cpCompany || "work"}.`;
        }
      } else if (cpType === "day") {
        postType = "Learning update";
        const timelineSummary = cpEntries
          .filter((e) => e.title.trim())
          .map((e) => `${e.t || "08:00"} ${e.title.trim()}${e.d ? ` — ${e.d.trim()}` : ""}`)
          .join(" | ");
        finalCaption = `[Day at ${cpCompany}] ${timelineSummary}${
          cpCaption.trim() ? ` · ${cpCaption.trim()}` : ""
        }`;
        mediaUrl = "";
        skillTags = ["Hospitality Operations", "Daily Shift Log"];
      } else {
        postType = "Achievement";
        const p = pathOf(roadmapPathId);
        const got = p.steps.reduce(
          (a, s, i) => a + Math.min(roadmapDoneHours[i] || 0, s.h),
          0
        );
        const pct = Math.round((got / totalHrs(p)) * 100);
        finalCaption = `[Roadmap Progress: ${p.name} · ${pct}% · ${got}h] ${
          cpCaption.trim() || `Completed another milestone on my ${p.name} roadmap.`
        }`;
        mediaUrl = "";
        skillTags = [p.name, "Talent Passport Roadmap"];
      }

      await apiFetch("/api/posts", {
        method: "POST",
        body: JSON.stringify({
          postType,
          caption: finalCaption,
          mediaUrl,
          mediaType: "image",
          skillTags,
          locationTag: cpLoc || cpCompany || currentUser?.location || "Zimbabwe",
        }),
      });

      setShowCreateSheet(false);
      setCpCaption("");
      setActiveTab("home");
      await loadAllData();
      showToast("Posted to your feed");
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // Save Onboarding Roadmap Selection to Backend
  const handleStartSelectedPath = async () => {
    const chosen = pathOf(obChosenPathId);
    try {
      await apiFetch("/api/onboarding", {
        method: "PUT",
        body: JSON.stringify({
          step: 5,
          completed: true,
          selectedPathwayId: chosen.backendPathwayId,
          tourismInterests: obSelectedInterests,
          immediateCareerGoal: `Complete ${chosen.name} roadmap (${totalHrs(chosen)} hrs)`,
        }),
      });
      setRoadmapPathId(chosen.id);
      setRoadmapDoneHours([...chosen.seed]);
      setShowOnboardingOverlay(false);
      setActiveTab("tours");
      await loadAllData();
      showToast(`Started ${chosen.name} roadmap`);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // Open Roadmap Skill Verification / Self-Declare Sheet (like in Placements)
  const openRoadmapSkillSheet = (
    stepIndex: number,
    mode: "submit_verification" | "self_declare"
  ) => {
    const p = pathOf(roadmapPathId);
    const stepObj = p.steps[stepIndex];
    const defaultOrg = organisationsList[0];
    setRmClaimedHours(stepObj.h);
    setRmOrgId(
      mode === "submit_verification" && defaultOrg ? String(defaultOrg.id) : ""
    );
    setRmIssuerName(
      mode === "submit_verification" && defaultOrg
        ? defaultOrg.name.replace(/\s*\(Fictional Demo\)/i, "")
        : currentUser?.institutionName || "Self-Declared Practical Portfolio"
    );
    setRmEvidenceSummary(
      `Demonstrated ${stepObj.t} (${stepObj.h} hrs) as part of the ${p.name} career roadmap.`
    );
    setRmPrivateNote("");
    setRoadmapSkillModal({
      stepIndex,
      skillTitle: stepObj.t,
      targetHours: stepObj.h,
      mode,
    });
  };

  // Submit Roadmap Skill for Verification or Self-Declare Verification to advance to next skill
  const handleSubmitRoadmapSkill = async () => {
    if (!roadmapSkillModal) return;
    try {
      const isSubmitForReview =
        roadmapSkillModal.mode === "submit_verification";
      await apiFetch("/api/passport", {
        method: "POST",
        body: JSON.stringify({
          recordCategory: "Practical experience",
          title: `Skill Milestone: ${roadmapSkillModal.skillTitle}`,
          issuerOrOrganisationName:
            rmIssuerName.trim() ||
            (isSubmitForReview
              ? "Approved Host Organisation"
              : "Self-Declared Skill Practice"),
          organisationId: rmOrgId ? Number(rmOrgId) : null,
          startDate: "2026-10",
          endDate: "2026-10",
          skillsDemonstrated: [roadmapSkillModal.skillTitle],
          publicSummary:
            rmEvidenceSummary.trim() ||
            `Completed ${rmClaimedHours}h on ${roadmapSkillModal.skillTitle}.`,
          evidenceReference: `RM-${roadmapPathId.toUpperCase()}-S${
            roadmapSkillModal.stepIndex + 1
          }`,
          submitForReview: isSubmitForReview,
          privateDocFileName: `${roadmapSkillModal.skillTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")}_evidence.txt`,
          privateDocContent: rmPrivateNote.trim(),
        }),
      });

      const nextDone = [...roadmapDoneHours];
      nextDone[roadmapSkillModal.stepIndex] = roadmapSkillModal.targetHours;
      setRoadmapDoneHours(nextDone);
      setRoadmapSkillModal(null);
      await loadAllData();
      showToast(
        isSubmitForReview
          ? `Submitted "${roadmapSkillModal.skillTitle}" for review — will be recorded in your Passport once verified!`
          : `Self-declared "${roadmapSkillModal.skillTitle}" — recorded in your Passport with Self-declared tag!`
      );
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // Navigate to Talent Passport showing achieved skills when pressing Your Career Path card
  const handleOpenPassportFromCareerPath = () => {
    if (currentUser?.id) {
      setViewedProfileUserId(currentUser.id);
    }
    setProfileSegment("passport");
    setActiveTab("profile");
    setShowFullPassportModal(true);
  };

  // Send direct message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatPartnerId || !messageDraft.trim()) return;
    try {
      await apiFetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          receiverId: activeChatPartnerId,
          content: messageDraft,
        }),
      });
      setMessageDraft("");
      await loadAllData();
      showToast("Message sent");
    } catch (err: any) {
      showToast(err.message);
    }
  };

  /* ---------- Render Roadmap Content (Used in Tours tab & Create Post Snapshot) ---------- */
  const activePath = pathOf(roadmapPathId);
  const getStepVerificationState = (stepTitle: string, idx: number) => {
    const isVerifiedInPassport =
      assessedSkills.some(
        (sk: string) => sk.toLowerCase() === stepTitle.toLowerCase()
      ) ||
      myPassportRecords.some(
        (rec: any) =>
          (rec.evidenceStatus ===
            "Confirmed by an authorised organisation representative" ||
            rec.evidenceStatus === "Institution-issued credential") &&
          (rec.skillsDemonstrated || []).some(
            (sk: string) => sk.toLowerCase() === stepTitle.toLowerCase()
          )
      );
    if (isVerifiedInPassport) return "verified";

    const matchingRec = myPassportRecords.find((rec: any) =>
      (rec.skillsDemonstrated || []).some(
        (sk: string) => sk.toLowerCase() === stepTitle.toLowerCase()
      )
    );
    if (matchingRec) {
      return matchingRec.evidenceStatus === "Submitted for verification" ||
        matchingRec.evidenceStatus === "Submitted for review"
        ? "submitted"
        : "self_declared";
    }

    const matchingPlacement = placementsList.find(
      ({ placement, opportunity }: any) =>
        placement.memberUserId === currentUser?.id &&
        (placement.workflowState === "Completion submitted" ||
          placement.workflowState === "Supervisor reviewed" ||
          placement.workflowState === "Finalised") &&
        (opportunity.requiredSkills || []).some(
          (sk: string) => sk.toLowerCase() === stepTitle.toLowerCase()
        )
    );
    if (matchingPlacement) {
      return matchingPlacement.placement.workflowState === "Finalised"
        ? "verified"
        : "submitted";
    }

    if ((roadmapDoneHours[idx] || 0) >= activePath.steps[idx].h) {
      return "self_declared";
    }
    return "pending";
  };

  const pathTotalHours = totalHrs(activePath);
  const isStepDone = (i: number) =>
    getStepVerificationState(activePath.steps[i].t, i) !== "pending";
  const pathGotHours = activePath.steps.reduce(
    (a, s, i) =>
      a + (isStepDone(i) ? s.h : Math.min(roadmapDoneHours[i] || 0, s.h)),
    0
  );
  const pathPct = Math.round((pathGotHours / pathTotalHours) * 100);
  const activeStepIdx = activePath.steps.findIndex((_, i) => !isStepDone(i));
  const doneStepsCount = activePath.steps.filter((_, i) => isStepDone(i)).length;
  const nextStepObj = activeStepIdx >= 0 ? activePath.steps[activeStepIdx] : null;

  const renderRoadmapVisual = (interactive = true) => {
    const r = 28;
    const c = 2 * Math.PI * r;
    const off = c * (1 - pathPct / 100);

    return (
      <div className="rmWrap">
        <div
          className={`rmSum ${
            interactive
              ? "cursor-pointer transition-transform active:scale-[0.99]"
              : ""
          }`}
          onClick={() => {
            if (interactive) {
              handleOpenPassportFromCareerPath();
            }
          }}
          role={interactive ? "button" : undefined}
          tabIndex={interactive ? 0 : undefined}
          title={
            interactive
              ? "Tap to open your Talent Passport and see achieved skills"
              : undefined
          }
        >
          <div className="rmTop">
            <div>
              <small className="flex items-center gap-1.5">
                Your career path · Tap to view Passport skills →
              </small>
              <h2>{activePath.name}</h2>
            </div>
            <div className="rmRing">
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r={r}
                  fill="none"
                  stroke="rgba(255,255,255,.25)"
                  strokeWidth="6"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={r}
                  fill="none"
                  stroke="#fff"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={off}
                />
              </svg>
              <b>{pathPct}%</b>
            </div>
          </div>
          <div className="rmBar">
            <i style={{ width: `${pathPct}%` }} />
          </div>
          <div className="rmMeta">
            <span>
              {doneStepsCount} of {activePath.steps.length} skills achieved
            </span>
            <span>
              {pathGotHours} / {pathTotalHours} hrs ({confirmedPracticalHours}h
              verified)
            </span>
          </div>
          {nextStepObj ? (
            <div className="rmNext">
              Current skill to verify: <b>{nextStepObj.t}</b>
            </div>
          ) : (
            <div className="rmNext">
              <b>All career path skills achieved! Tap to view in Passport.</b>
            </div>
          )}
        </div>

        <div className="road">
          {activePath.steps.map((s, i) => {
            const left = i % 2 === 0;
            const verState = getStepVerificationState(s.t, i);
            const st = isStepDone(i)
              ? "done"
              : i === activeStepIdx
              ? "active"
              : "locked";
            const h = isStepDone(i)
              ? s.h
              : Math.min(roadmapDoneHours[i] || 0, s.h);
            const sp = Math.round((h / s.h) * 100);
            const toCenter = i === activePath.steps.length - 1;
            const f = (x: number) => (left ? x : 360 - x);
            const end = toCenter ? 180 : f(344);
            const dPath = toCenter
              ? `M${f(16)} 4 C ${f(16)} 32, 180 22, 180 58`
              : `M${f(16)} 4 C ${f(16)} 36, ${f(120)} 18, ${f(180)} 32 C ${f(240)} 46, ${f(344)} 30, ${f(344)} 60`;

            const statusBadgeLabel =
              verState === "verified"
                ? "Verified"
                : verState === "submitted"
                ? "Submitted for verification"
                : verState === "self_declared"
                ? "Self-declared"
                : st === "active"
                ? "Current skill"
                : "Locked";

            return (
              <React.Fragment key={i}>
                <div className={`rn ${left ? "L" : "R"} ${st}`}>
                  <div className="rbadge">
                    {st === "done" ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                    ) : st === "locked" ? (
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="5" y="11" width="14" height="9" rx="2.5" />
                        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <div className="rcard">
                    <div className="rtop">
                      <span className="rtype skill">
                        Skill {i + 1} of {activePath.steps.length}
                      </span>
                      <span
                        className="pill"
                        style={
                          verState === "verified"
                            ? { background: "#e6f2f3", color: "#0b5d66" }
                            : verState === "submitted" ||
                              verState === "self_declared"
                            ? { background: "#fdece5", color: "#b84a22" }
                            : { background: "#f5f6f8", color: "#6b7480" }
                        }
                      >
                        {statusBadgeLabel}
                      </span>
                    </div>
                    <h4>{s.t}</h4>
                    <p>Required competence · {s.h} practical hrs</p>
                    <div className="rbar">
                      <i style={{ width: `${sp}%` }} />
                    </div>
                    <div className="rfoot">
                      <span>
                        {h} / {s.h} hrs
                      </span>
                      <span>{sp}%</span>
                    </div>
                    {interactive && st === "active" && (
                      <div className="flex flex-col gap-2 mt-2.5">
                        <button
                          type="button"
                          className="rlog !mt-0 !bg-[#0b5d66]"
                          onClick={() =>
                            openRoadmapSkillSheet(i, "submit_verification")
                          }
                        >
                          Submit for Verification
                        </button>
                        <button
                          type="button"
                          className="rlog !mt-0"
                          onClick={() =>
                            openRoadmapSkillSheet(i, "self_declare")
                          }
                        >
                          Self-Declare Verification
                        </button>
                      </div>
                    )}
                    {interactive && st === "done" && (
                      <div className="mt-2 pt-2 border-t border-[#e8eaee] flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#0b5d66]">
                          Recorded in Talent Passport
                        </span>
                        <button
                          type="button"
                          className="text-[11px] font-bold text-[#0b5d66] underline"
                          onClick={handleOpenPassportFromCareerPath}
                        >
                          View in Passport →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <svg
                  className={`cn ${isStepDone(i) ? "done" : ""}`}
                  viewBox="0 0 360 64"
                  aria-hidden="true"
                >
                  <path d={dPath} />
                  <path
                    className="ah"
                    d={`M${end - 7} 52 L${end} 61 L${end + 7} 52`}
                  />
                </svg>
              </React.Fragment>
            );
          })}

          <div
            className={`rgoal cursor-pointer ${activeStepIdx < 0 ? "won" : ""}`}
            onClick={() => {
              if (interactive) handleOpenPassportFromCareerPath();
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 21V4M5 5h11l-2 3.5L16 12H5" />
            </svg>
            <small>Career goal</small>
            <b>{activePath.name}</b>
          </div>
        </div>

        {interactive && (
          <div className="flex items-center justify-center gap-4 mt-5">
            <button
              type="button"
              className="rmReset !m-0"
              onClick={() => {
                setObStep(1);
                setShowOnboardingOverlay(true);
              }}
            >
              Change career path
            </button>
            <button
              type="button"
              className="rmReset !m-0"
              onClick={() => setShowFullQuestionnaireModal(true)}
            >
              Full Career Questionnaire
            </button>
          </div>
        )}
      </div>
    );
  };

  const unreadCount =
    (sessionData?.unreadNotificationsCount || 0) +
    (sessionData?.unreadMessagesCount || 0);

  return (
    <div className="app-shell">
      {/* =====================================================================
          TOP NAVIGATION (Shown on Home screen just like the reference UI)
      ===================================================================== */}
      {activeTab === "home" && (
        <header className="topnav" id="topnav">
          <button
            type="button"
            className="icon-btn"
            aria-label="Create post"
            onClick={() => setShowCreateSheet(true)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setShowAccountMenuModal(true)}
            className="brand"
            title="Switch Demo Persona or Open Workspaces"
          >
            T<span>&amp;</span>H
            <small className="text-[11px] font-semibold text-[#6b7480] bg-[#f5f6f8] px-2 py-0.5 rounded-full">
              {currentUser?.name?.split(" ")[0] || "TourBridge"} ▾
            </small>
          </button>

          <button
            type="button"
            className="icon-btn"
            aria-label="Notifications & Messages"
            onClick={async () => {
              setShowNotificationsModal(true);
              await apiFetch("/api/notifications/read-all", { method: "POST" });
              await loadAllData();
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z" />
              <path d="M10 19a2.2 2.2 0 0 0 4 0" />
            </svg>
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>
        </header>
      )}

      {/* =====================================================================
          MAIN SCROLLING SCREENS
      ===================================================================== */}
      <main className="screens">
        {/* -------------------------------------------------------------------
            SCREEN 1: HOME (Stories Row + Photo / Day-in-the-life / Progress Feed)
        ------------------------------------------------------------------- */}
        <section
          className={`screen ${activeTab === "home" ? "active" : ""}`}
          id="screen-home"
        >
          {/* Stories / Quick Highlights — Only from other users or company pages */}
          <div className="stories" id="stories">
            {organisationsList.map((org, idx) => {
              const k = pickColorKey(org.name);
              const cleanOrgName = org.name.replace(
                /\s*\(Fictional Demo\)/i,
                ""
              );
              const orgPost = feedPosts.find(
                (p) => p.organisationId === org.id
              );
              return (
                <div
                  key={`org-story-${org.id}`}
                  className={`story ${idx > 1 ? "seen" : ""}`}
                  onClick={() =>
                    setActiveStoryItem({
                      kind: "company",
                      id: org.id,
                      name: cleanOrgName,
                      subtitle: `${org.orgType} · Company Page`,
                      avatarUrl: org.logoUrl,
                      caption:
                        orgPost?.caption ||
                        org.description ||
                        `Explore hospitality placements and career opportunities at ${cleanOrgName}.`,
                      mediaUrl:
                        orgPost?.mediaUrl ||
                        org.bannerUrl ||
                        org.logoUrl ||
                        PRESET_MEDIA_OPTIONS[idx % PRESET_MEDIA_OPTIONS.length]
                          .url,
                      location: org.location || "Zimbabwe",
                    })
                  }
                  role="button"
                  tabIndex={0}
                >
                  <div className="ring">
                    <div
                      className="tile"
                      style={{
                        background: org.logoUrl
                          ? `url(${org.logoUrl}) center/cover`
                          : grad(k),
                      }}
                    >
                      {!org.logoUrl && getInitials(org.name)}
                    </div>
                  </div>
                  <p>{cleanOrgName}</p>
                </div>
              );
            })}

            {membersList
              .filter((m) => m.id !== currentUser?.id)
              .map((m, idx) => {
                const k = pickColorKey(m.name);
                const memberPost = feedPosts.find(
                  (p) => p.author?.id === m.id
                );
                return (
                  <div
                    key={`mem-story-${m.id}`}
                    className={`story ${idx % 2 === 1 ? "seen" : ""}`}
                    onClick={() =>
                      setActiveStoryItem({
                        kind: "user",
                        id: m.id,
                        name: m.name,
                        subtitle: m.careerStage || "Tourism Professional",
                        avatarUrl: m.avatarUrl,
                        caption:
                          memberPost?.caption ||
                          m.bio ||
                          `Sharing a day in the life in ${m.location || "Zimbabwe"}.`,
                        mediaUrl:
                          memberPost?.mediaUrl ||
                          m.avatarUrl ||
                          PRESET_MEDIA_OPTIONS[
                            (idx + 1) % PRESET_MEDIA_OPTIONS.length
                          ].url,
                        location: m.location || "Zimbabwe",
                      })
                    }
                    role="button"
                    tabIndex={0}
                  >
                    <div className="ring">
                      <div
                        className="tile"
                        style={{
                          background: m.avatarUrl
                            ? `url(${m.avatarUrl}) center/cover`
                            : grad(k),
                        }}
                      >
                        {!m.avatarUrl && getInitials(m.name)}
                      </div>
                    </div>
                    <p>{m.preferredName || m.name.split(" ")[0]}</p>
                  </div>
                );
              })}
          </div>

          {/* Feed Posts */}
          <div id="feed">
            {feedPosts.map((post, idx) => {
              const authorName = post.author?.name || "Tourism Member";
              const k = pickColorKey(authorName);
              const isCompanyPost =
                post.postType === "Industry update" || Boolean(post.organisationId);
              const tagLabel =
                post.postType === "Learning update"
                  ? "Day in the life"
                  : post.postType === "Achievement"
                  ? "Tour guide progress"
                  : "Life at work";

              // Determine rich visual card rendering (Photo vs Day-in-the-life timeline vs Progress Ring)
              const isDayCard =
                post.caption.startsWith("[Day at ") ||
                (post.postType === "Learning update" && !post.mediaUrl);
              const isProgressCard =
                post.caption.startsWith("[Roadmap Progress:") ||
                (post.postType === "Achievement" && !post.mediaUrl);

              return (
                <article key={post.id} className="post">
                  <div className="post-head">
                    <div
                      className="avatar cursor-pointer"
                      onClick={() => {
                        if (post.organisationId) {
                          setSelectedOrgModalId(post.organisationId);
                        } else if (post.author?.id) {
                          setViewedProfileUserId(post.author.id);
                          setActiveTab("profile");
                        }
                      }}
                      style={{
                        background: post.author?.avatarUrl
                          ? `url(${post.author.avatarUrl}) center/cover`
                          : grad(k),
                      }}
                    >
                      {!post.author?.avatarUrl && getInitials(authorName)}
                    </div>
                    <div className="who">
                      <div
                        className="name cursor-pointer"
                        onClick={() => {
                          if (post.organisationId) {
                            setSelectedOrgModalId(post.organisationId);
                          } else if (post.author?.id) {
                            setViewedProfileUserId(post.author.id);
                            setActiveTab("profile");
                          }
                        }}
                      >
                        {authorName}
                        {isCompanyPost && (
                          <>
                            <VerifiedBadgeSvg />
                            <span className="pill co">Company</span>
                          </>
                        )}
                      </div>
                      <div className="meta">
                        {post.author?.careerStage || "Tourism Member"} ·{" "}
                        {post.locationTag || post.author?.location || "Zimbabwe"} ·{" "}
                        {idx + 2}h
                      </div>
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="More options"
                      onClick={() => setShowOpportunitiesWorkspaceModal(true)}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <circle cx="5" cy="12" r="1.8" />
                        <circle cx="12" cy="12" r="1.8" />
                        <circle cx="19" cy="12" r="1.8" />
                      </svg>
                    </button>
                  </div>

                  <span className="tag">{tagLabel}</span>

                  {/* BODY VARIANT A: Day in the life timeline card */}
                  {isDayCard ? (
                    <div className="dayCard">
                      <div className="dayHero" style={{ background: grad(k) }}>
                        <small>
                          A day at {post.locationTag || "Zambezi Canopy Eco-Lodge"}
                        </small>
                        <h3>My day as a hospitality trainee</h3>
                      </div>
                      <div className="timeline">
                        {[
                          [
                            "06:30",
                            "Briefing",
                            "Shift huddle & safety protocol check",
                          ],
                          [
                            "09:30",
                            "Guest arrivals",
                            "PMS check-in & transfer manifest coordination",
                          ],
                          [
                            "14:00",
                            "Practical shift",
                            post.caption.slice(0, 95),
                          ],
                          [
                            "17:30",
                            "Debrief",
                            "Logged hours for Talent Passport verification",
                          ],
                        ].map((it, tIdx) => (
                          <div key={tIdx} className="tl">
                            <time>{it[0]}</time>
                            <i />
                            <div>
                              <b>{it[1]}</b>
                              <span>{it[2]}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : isProgressCard ? (
                    /* BODY VARIANT B: Tour guide / Roadmap progress ring card */
                    (() => {
                      const pct = 70;
                      const r = 28;
                      const c = 2 * Math.PI * r;
                      const off = c * (1 - pct / 100);
                      return (
                        <div className="progCard">
                          <div className="progTop">
                            <div className="ringProg">
                              <svg width="64" height="64" viewBox="0 0 64 64">
                                <circle
                                  cx="32"
                                  cy="32"
                                  r={r}
                                  fill="none"
                                  stroke="#d9dde3"
                                  strokeWidth="6"
                                />
                                <circle
                                  cx="32"
                                  cy="32"
                                  r={r}
                                  fill="none"
                                  stroke="#0b5d66"
                                  strokeWidth="6"
                                  strokeLinecap="round"
                                  strokeDasharray={c}
                                  strokeDashoffset={off}
                                />
                              </svg>
                              <b>{pct}%</b>
                            </div>
                            <div>
                              <h3>Talent Passport &amp; Certification</h3>
                              <p>
                                {post.skillTags?.[0] || "Cultural Heritage & Guiding"}
                              </p>
                            </div>
                          </div>
                          <div className="stats">
                            <div className="stat">
                              <b>{confirmedPracticalHours || 42}h</b>
                              <span>Practical</span>
                            </div>
                            <div className="stat">
                              <b>{assessedSkills.length || 4}</b>
                              <span>Assessed skills</span>
                            </div>
                            <div className="stat">
                              <b>Verified</b>
                              <span>Passport status</span>
                            </div>
                          </div>
                          <div className="steps">
                            {Array.from({ length: 10 }, (_, i) => (
                              <i key={i} className={i < 7 ? "on" : ""} />
                            ))}
                          </div>
                          <div className="stepsLbl">
                            <span>7 of 10 modules</span>
                            <span>3 to go</span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    /* BODY VARIANT C: Visual Media / Gradient Card */
                    <div
                      className={`media ${idx % 3 === 2 ? "wide" : ""}`}
                      style={{
                        background: post.mediaUrl
                          ? `url(${post.mediaUrl}) center/cover`
                          : grad(k, 160),
                      }}
                    >
                      {!post.mediaUrl && (
                        <>
                          <span
                            className="shape"
                            style={{
                              width: 220,
                              height: 220,
                              right: -60,
                              top: -50,
                              background: "#fff",
                            }}
                          />
                          <span
                            className="shape"
                            style={{
                              width: 160,
                              height: 160,
                              left: -40,
                              bottom: 30,
                              background: "#000",
                              opacity: 0.12,
                            }}
                          />
                          <div className="glyph">
                            <GlyphSvg name={idx % 2 === 0 ? "sun" : "route"} size={64} />
                          </div>
                        </>
                      )}
                      {(post.locationTag || post.author?.location) && (
                        <div className="loc">
                          <PinSvg />
                          {post.locationTag || post.author?.location}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="actions">
                    <button
                      type="button"
                      onClick={() => handleInteractPost(post.id, "like")}
                      className={`act like ${post.likedByMe ? "liked" : ""}`}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20s-7.5-4.5-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10C19.5 15.5 12 20 12 20Z" />
                      </svg>
                      <span>{post.likesCount}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveCommentPostId(
                          activeCommentPostId === post.id ? null : post.id
                        )
                      }
                      className="act"
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 11.5c0 4-3.6 7-8 7-1 0-2-.15-2.8-.45L4.5 19.5l1.2-3.6C4.6 14.9 4 13.3 4 11.5c0-4 3.6-7 8-7s8 3 8 7Z" />
                      </svg>
                      <span>{post.commentsCount}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        showToast(`Shared ${authorName.split(" ")[0]}'s post`)
                      }
                      className="act"
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 4 10.5 14.5M21 4l-6.5 16-4-5.5L5 10.5 21 4Z" />
                      </svg>
                    </button>

                    <span className="spacer" />

                    <button
                      type="button"
                      aria-label="Save"
                      onClick={() => handleInteractPost(post.id, "save")}
                      className={`act save ${post.savedByMe ? "saved" : ""}`}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1Z" />
                      </svg>
                    </button>
                  </div>

                  {/* Caption */}
                  <div className="caption" style={{ marginTop: 4 }}>
                    <b
                      className="cursor-pointer"
                      onClick={() => {
                        if (post.organisationId) {
                          setSelectedOrgModalId(post.organisationId);
                        } else if (post.author?.id) {
                          setViewedProfileUserId(post.author.id);
                          setActiveTab("profile");
                        }
                      }}
                    >
                      {authorName.split(" ")[0]}
                    </b>{" "}
                    {post.caption}
                  </div>

                  {/* Comments toggle & inline comment drawer */}
                  <div
                    className="comments cursor-pointer"
                    onClick={() =>
                      setActiveCommentPostId(
                        activeCommentPostId === post.id ? null : post.id
                      )
                    }
                  >
                    {post.commentsCount > 0
                      ? `View all ${post.commentsCount} comments`
                      : "Add a comment…"}
                  </div>

                  {activeCommentPostId === post.id && (
                    <div className="px-4 pb-3 space-y-2">
                      {(post.comments || []).map((c: any) => (
                        <div key={c.comment.id} className="text-xs">
                          <b className="font-semibold">{c.author?.name}: </b>
                          <span className="text-[#0f1720]">{c.comment.content}</span>
                        </div>
                      ))}
                      <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                          placeholder="Write a comment…"
                          className="fld !py-1.5 !px-3 !text-xs flex-1"
                        />
                        <button type="submit" className="fol">
                          Post
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {loadingSession && (
            <div className="loader" id="sentinel">
              <div className="spin" />
            </div>
          )}
        </section>

        {/* -------------------------------------------------------------------
            SCREEN 2: SEARCH (People, Companies, Opportunities, Topics)
        ------------------------------------------------------------------- */}
        <section
          className={`screen ${activeTab === "search" ? "active" : ""}`}
          id="screen-search"
        >
          <div className="sTop">
            <label className="sBox">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="m20 20-4.2-4.2" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    const v = searchQuery.trim();
                    setRecentSearches((prev) =>
                      [v, ...prev.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(
                        0,
                        6
                      )
                    );
                  }
                }}
                placeholder="Search people, companies, opportunities"
                autoComplete="off"
              />
              <button
                type="button"
                className={`sClear ${searchQuery ? "show" : ""}`}
                aria-label="Clear"
                onClick={() => setSearchQuery("")}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </label>

            <div className="sChips">
              {[
                { id: "all", label: "All" },
                { id: "people", label: "People" },
                { id: "companies", label: "Companies" },
                { id: "opps", label: "Opportunities" },
                { id: "topics", label: "Topics" },
              ].map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setSearchFilter(ch.id as any)}
                  className={`sChip ${searchFilter === ch.id ? "on" : ""}`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          <div id="sBody">
            {(() => {
              const q = searchQuery.trim().toLowerCase();
              const topics = [
                { tag: "dayinthelife", n: "4.2K" },
                { tag: "frontdesklife", n: "2.8K" },
                { tag: "tourguidejourney", n: "2.1K" },
                { tag: "hospitalitycareers", n: "1.9K" },
                { tag: "safarilife", n: "1.4K" },
              ].filter((t) => !q || `#${t.tag}`.includes(q));

              const filteredPeople = membersList.filter(
                (p) =>
                  !q ||
                  `${p.name} ${p.careerStage} ${p.location}`
                    .toLowerCase()
                    .includes(q)
              );
              const filteredCompanies = organisationsList.filter(
                (c) =>
                  !q ||
                  `${c.name} ${c.orgType} ${c.location}`
                    .toLowerCase()
                    .includes(q)
              );
              const filteredOpps = opportunitiesList.filter((o) => {
                if (
                  searchFilter === "opps" &&
                  searchOppTypeFilter !== "all" &&
                  o.opportunityType !== searchOppTypeFilter
                ) {
                  return false;
                }
                if (!q) return true;
                const skillsStr = (o.requiredSkills || []).join(" ");
                return `${o.title} ${o.opportunityType} ${o.location} ${o.organisation?.name} ${skillsStr}`
                  .toLowerCase()
                  .includes(q);
              });

              const renderPersonRow = (p: any) => {
                const isFollowing = relationshipsList.some(
                  (r: any) =>
                    r.requesterId === currentUser?.id &&
                    r.targetId === p.id &&
                    r.relType === "follow"
                );
                const k = pickColorKey(p.name);
                return (
                  <div key={p.id} className="srow">
                    <div
                      className="avatar cursor-pointer"
                      onClick={() => {
                        setViewedProfileUserId(p.id);
                        setActiveTab("profile");
                      }}
                      style={{
                        background: p.avatarUrl
                          ? `url(${p.avatarUrl}) center/cover`
                          : grad(k),
                      }}
                    >
                      {!p.avatarUrl && getInitials(p.name)}
                    </div>
                    <div
                      className="who cursor-pointer"
                      onClick={() => {
                        setViewedProfileUserId(p.id);
                        setActiveTab("profile");
                      }}
                    >
                      <div className="name">{p.name}</div>
                      <div className="meta">
                        {p.careerStage} · {p.location}
                      </div>
                    </div>
                    {p.id !== currentUser?.id && (
                      <button
                        type="button"
                        onClick={() => handleFollowToggle(p.id, isFollowing)}
                        className={`fol ${isFollowing ? "on" : ""}`}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </button>
                    )}
                  </div>
                );
              };

              const renderCompanyRow = (c: any) => {
                const k = pickColorKey(c.name);
                const isHiring = opportunitiesList.some(
                  (o) => o.organisationId === c.id && o.status === "open"
                );
                return (
                  <div
                    key={c.id}
                    className="srow cursor-pointer"
                    onClick={() => setSelectedOrgModalId(c.id)}
                  >
                    <div
                      className="avatar"
                      style={{
                        background: c.logoUrl
                          ? `url(${c.logoUrl}) center/cover`
                          : grad(k),
                      }}
                    >
                      {!c.logoUrl && getInitials(c.name)}
                    </div>
                    <div className="who">
                      <div className="name">
                        {c.name.replace(/\s*\(Fictional Demo\)/i, "")}
                        {c.verificationStatus === "approved" && <VerifiedBadgeSvg />}
                        {isHiring && <span className="pill">Hiring</span>}
                      </div>
                      <div className="meta">
                        {c.orgType} · {c.location}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrgModalId(c.id);
                      }}
                      className="fol"
                    >
                      View
                    </button>
                  </div>
                );
              };

              const renderOppCard = (o: any) => {
                const myApp = applicationsList.find(
                  (a) =>
                    a.application.opportunityId === o.id &&
                    a.application.applicantUserId === currentUser?.id
                );
                const isEmployerStaff = myMemberships.some(
                  (m: any) => m.organisation.id === o.organisationId
                );
                const isVol =
                  o.opportunityType === "Skill2Shift" ||
                  o.compensationType === "Unpaid learning placement";
                const orgNameClean =
                  o.organisation?.name?.replace(
                    /\s*\(Fictional Demo\)/i,
                    ""
                  ) || "Verified Organisation";
                const orgK = pickColorKey(orgNameClean);

                return (
                  <div key={o.id} className="opp">
                    <div className="top">
                      <span className={`otype ${isVol ? "vol" : ""}`}>
                        {o.opportunityType}
                      </span>
                      <div className="flex items-center gap-2">
                        {isEmployerStaff && (
                          <button
                            type="button"
                            className="text-xs font-semibold text-[#6b7480] underline"
                            onClick={async () => {
                              await apiFetch(
                                `/api/opportunities/${o.id}/status`,
                                {
                                  method: "PUT",
                                  body: JSON.stringify({
                                    status:
                                      o.status === "open" ? "closed" : "open",
                                  }),
                                }
                              );
                              await loadAllData();
                              showToast(
                                o.status === "open"
                                  ? "Opportunity closed"
                                  : "Opportunity reopened"
                              );
                            }}
                          >
                            {o.status === "open" ? "Close listing" : "Reopen"}
                          </button>
                        )}
                        <span className="pill">{o.expectedHours} hrs</span>
                      </div>
                    </div>

                    {/* Host Company Row (.srow compact) */}
                    <div
                      className="srow !py-2 !mt-1 cursor-pointer"
                      onClick={() => setSelectedOrgModalId(o.organisationId)}
                    >
                      <div
                        className="avatar !w-9 !h-9"
                        style={{ background: grad(orgK) }}
                      >
                        {getInitials(orgNameClean)}
                      </div>
                      <div className="who">
                        <div className="name">
                          {orgNameClean}
                          <VerifiedBadgeSvg />
                        </div>
                        <div className="meta">
                          {o.location} ·{" "}
                          {o.compensationAmount || o.compensationType}
                        </div>
                      </div>
                    </div>

                    <h4 className="!mt-1">{o.title}</h4>
                    <p className="mt-1.5 !text-[#0f1720] leading-relaxed">
                      {o.description}
                    </p>

                    <div className="bot">
                      <div className="facts">
                        <span>{o.compensationType}</span>
                        {o.transportProvided && <span>Transport</span>}
                        {o.mealsProvided && <span>Meals</span>}
                        {o.accommodationProvided && (
                          <span>Accommodation</span>
                        )}
                        {(o.requiredSkills || [])
                          .slice(0, 2)
                          .map((sk: string) => (
                            <span key={sk}>{sk}</span>
                          ))}
                      </div>
                      {myApp ? (
                        <button
                          type="button"
                          onClick={() => setShowOpportunitiesWorkspaceModal(true)}
                          className="fol on"
                        >
                          {myApp.application.status}
                        </button>
                      ) : o.status !== "open" ? (
                        <button type="button" className="fol on" disabled>
                          Closed
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setApplyingOppModal(o);
                            setApplySupportingMsg(
                              `Good day ${
                                o.supervisorNameAndRole || "Hiring Team"
                              }, I would like to apply for "${
                                o.title
                              }" using my TourBridge profile and Talent Passport.`
                            );
                            setApplyPassportIds(
                              myPassportRecords
                                .slice(0, 2)
                                .map((r: any) => r.id)
                            );
                          }}
                          className="fol"
                        >
                          Apply
                        </button>
                      )}
                    </div>
                  </div>
                );
              };

              if (!q && searchFilter === "all") {
                return (
                  <>
                    {recentSearches.length > 0 && (
                      <div className="sSec">
                        <div className="sSecHead">
                          <h3>Recent</h3>
                          <button
                            type="button"
                            onClick={() => setRecentSearches([])}
                          >
                            Clear all
                          </button>
                        </div>
                        <div className="recent">
                          {recentSearches.map((r, i) => (
                            <span
                              key={i}
                              className="rec"
                              onClick={() => setSearchQuery(r)}
                            >
                              {r}
                              <i
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRecentSearches(
                                    recentSearches.filter((_, idx) => idx !== i)
                                  );
                                }}
                              >
                                &times;
                              </i>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="sSec">
                      <div className="sSecHead">
                        <h3>Trending on T&amp;H</h3>
                      </div>
                      {topics.slice(0, 3).map((t) => (
                        <div
                          key={t.tag}
                          className="srow cursor-pointer"
                          onClick={() => setSearchQuery(t.tag)}
                        >
                          <div className="hash">#</div>
                          <div className="who">
                            <div className="name">#{t.tag}</div>
                            <div className="meta">{t.n} posts</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="sSec">
                      <div className="sSecHead">
                        <h3>Opportunities for you</h3>
                        <button
                          type="button"
                          onClick={() => setShowOpportunitiesWorkspaceModal(true)}
                        >
                          Placements &amp; All ({opportunitiesList.length})
                        </button>
                      </div>
                      {filteredOpps.slice(0, 3).map(renderOppCard)}
                    </div>

                    <div className="sSec">
                      <div className="sSecHead">
                        <h3>People to follow</h3>
                      </div>
                      {filteredPeople.slice(0, 4).map(renderPersonRow)}
                    </div>

                    <div className="sSec">
                      <div className="sSecHead">
                        <h3>Companies &amp; Institutions</h3>
                      </div>
                      {filteredCompanies.map(renderCompanyRow)}
                    </div>
                    <div className="sPad" />
                  </>
                );
              }

              const showP = searchFilter === "all" || searchFilter === "people";
              const showC = searchFilter === "all" || searchFilter === "companies";
              const showO = searchFilter === "all" || searchFilter === "opps";
              const showT = searchFilter === "all" || searchFilter === "topics";

              const hasAny =
                (showP && filteredPeople.length > 0) ||
                (showC && filteredCompanies.length > 0) ||
                (showO && filteredOpps.length > 0) ||
                (showT && topics.length > 0);

              if (!hasAny) {
                return (
                  <div className="sEmpty">
                    <b>No results{q ? ` for “${searchQuery.trim()}”` : ""}</b>
                    Try a different keyword or check the spelling.
                  </div>
                );
              }

              return (
                <>
                  {showP && filteredPeople.length > 0 && (
                    <div className="sSec">
                      <div className="sSecHead">
                        <h3>People</h3>
                        <span>{filteredPeople.length}</span>
                      </div>
                      {filteredPeople.map(renderPersonRow)}
                    </div>
                  )}
                  {showC && filteredCompanies.length > 0 && (
                    <div className="sSec">
                      <div className="sSecHead">
                        <h3>Companies</h3>
                        <span>{filteredCompanies.length}</span>
                      </div>
                      {filteredCompanies.map(renderCompanyRow)}
                    </div>
                  )}
                  {showO && filteredOpps.length > 0 && (
                    <div className="sSec">
                      <div className="sSecHead">
                        <h3>Opportunities</h3>
                        <button
                          type="button"
                          onClick={() => setShowOpportunitiesWorkspaceModal(true)}
                        >
                          Manage Applications &amp; Placements
                        </button>
                      </div>
                      {filteredOpps.map(renderOppCard)}
                    </div>
                  )}
                  {showT && topics.length > 0 && (
                    <div className="sSec">
                      <div className="sSecHead">
                        <h3>Topics</h3>
                        <span>{topics.length}</span>
                      </div>
                      {topics.map((t) => (
                        <div key={t.tag} className="srow">
                          <div className="hash">#</div>
                          <div className="who">
                            <div className="name">#{t.tag}</div>
                            <div className="meta">{t.n} posts</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="sPad" />
                </>
              );
            })()}
          </div>
        </section>

        {/* -------------------------------------------------------------------
            SCREEN 3: TOURS / MY ROADMAP
        ------------------------------------------------------------------- */}
        <section
          className={`screen ${activeTab === "tours" ? "active" : ""}`}
          id="screen-tours"
        >
          <div className="pbar">
            <b>My roadmap</b>
            <button
              type="button"
              className="icon-btn"
              aria-label="Change career path"
              onClick={() => {
                setObStep(1);
                setShowOnboardingOverlay(true);
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 8h13l-3-3M20 16H7l3 3" />
              </svg>
            </button>
          </div>

          {renderRoadmapVisual(true)}
        </section>

        {/* -------------------------------------------------------------------
            SCREEN 4: PROFILE (Avatar Ring, Stats, Bio, Chips, Segmented Grid & Talent Passport)
        ------------------------------------------------------------------- */}
        <section
          className={`screen ${activeTab === "profile" ? "active" : ""}`}
          id="screen-profile"
        >
          {(() => {
            const profUser =
              membersList.find((m) => m.id === viewedProfileUserId) || currentUser;
            const handleStr =
              profUser?.email?.split("@")[0] ||
              profUser?.name?.toLowerCase().replace(/\s+/g, ".") ||
              "member";
            const k = pickColorKey(profUser?.name || "TM");
            const userPosts = feedPosts.filter(
              (p) => p.author?.id === profUser?.id
            );

            return (
              <>
                <div className="pbar">
                  <b>@{handleStr}</b>
                  <div className="flex items-center gap-1">
                    {viewedProfileUserId &&
                      viewedProfileUserId !== currentUser?.id && (
                        <button
                          type="button"
                          onClick={() => setViewedProfileUserId(currentUser?.id)}
                          className="text-xs font-semibold text-[#0b5d66] px-2 py-1"
                        >
                          Back to Me
                        </button>
                      )}
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Menu"
                      onClick={() => {
                        setOptionsActiveSection("menu");
                        setShowAccountMenuModal(true);
                      }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M4 7h16M4 12h16M4 17h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="pTop">
                  <div className="pav">
                    <div
                      style={{
                        background: profUser?.avatarUrl
                          ? `url(${profUser.avatarUrl}) center/cover`
                          : grad(k),
                      }}
                    >
                      {!profUser?.avatarUrl && getInitials(profUser?.name)}
                    </div>
                  </div>
                  <div className="pStats">
                    <div>
                      <b>{userPosts.length || 4}</b>
                      <span>Posts</span>
                    </div>
                    <div>
                      <b>{confirmedPracticalHours}h</b>
                      <span>Verified Hrs</span>
                    </div>
                    <div>
                      <b>{myPassportRecords.length}</b>
                      <span>Passport</span>
                    </div>
                  </div>
                </div>

                <div className="pInfo">
                  <h2>{profUser?.name}</h2>
                  <div className="user">@{handleStr}</div>
                  <div className="title">{profUser?.careerStage}</div>
                  <div className="bio">
                    {profUser?.bio ||
                      "Building verified tourism & hospitality experience across Zimbabwe.\nFront office · Safari guiding · Guest experience"}
                  </div>
                  <div className="pChips">
                    <span className="pChip">
                      <PinSvg />
                      {profUser?.location || "Harare, Zimbabwe"}
                    </span>
                    <span className="pChip">
                      <GlyphSvg name="route" size={13} />
                      {myMemberships[0]?.organisation?.name?.replace(
                        /\s*\(Fictional Demo\)/i,
                        ""
                      ) ||
                        profUser?.availability ||
                        "Available for Placements"}
                    </span>
                  </div>
                </div>

                {profUser?.id === currentUser?.id ? (
                  <div className="pBtns">
                    <button
                      type="button"
                      className="pBtn primary"
                      onClick={() => setShowEditProfileModal(true)}
                    >
                      Edit profile
                    </button>
                    <button
                      type="button"
                      className="pBtn"
                      onClick={async () => {
                        const shareUrl = `${window.location.origin}/?member=${profUser?.id || ""}`;
                        if (navigator.clipboard?.writeText) {
                          await navigator.clipboard
                            .writeText(shareUrl)
                            .catch(() => {});
                        }
                        showToast(`Profile link copied (@${handleStr})`);
                      }}
                    >
                      Share profile
                    </button>
                  </div>
                ) : (
                  <div className="pBtns">
                    <button
                      type="button"
                      className="pBtn primary"
                      onClick={() =>
                        handleFollowToggle(
                          profUser?.id,
                          relationshipsList.some(
                            (r: any) =>
                              r.requesterId === currentUser?.id &&
                              r.targetId === profUser?.id &&
                              r.relType === "follow"
                          )
                        )
                      }
                    >
                      {relationshipsList.some(
                        (r: any) =>
                          r.requesterId === currentUser?.id &&
                          r.targetId === profUser?.id &&
                          r.relType === "follow"
                      )
                        ? "Following"
                        : "Follow"}
                    </button>
                    <button
                      type="button"
                      className="pBtn"
                      onClick={() => {
                        setActiveChatPartnerId(profUser?.id);
                        setShowNotificationsModal(true);
                      }}
                    >
                      Message
                    </button>
                  </div>
                )}

                <div className="seg">
                  <button
                    type="button"
                    className={profileSegment === "all" ? "on" : ""}
                    onClick={() => setProfileSegment("all")}
                  >
                    Posts
                  </button>
                  <button
                    type="button"
                    className={profileSegment === "day" ? "on" : ""}
                    onClick={() => setProfileSegment("day")}
                  >
                    Day in the life
                  </button>
                  <button
                    type="button"
                    className={profileSegment === "passport" ? "on" : ""}
                    onClick={() => setProfileSegment("passport")}
                  >
                    Passport
                  </button>
                </div>

                {profileSegment === "passport" ? (
                  <div className="p-4 space-y-3">
                    {/* + Extra Certificate / Passport Record Action Header inside Profile -> Passport tab */}
                    <div className="sSecHead !mb-1">
                      <h3>Talent Passport (Verified &amp; Self-declared)</h3>
                      {profUser?.id === currentUser?.id && (
                        <button
                          type="button"
                          className="fol"
                          onClick={() => {
                            setQuickPassportForm({
                              ...quickPassportForm,
                              recordCategory: "Certificate",
                              submitForReview: false,
                            });
                            setShowAddPassportSheet(true);
                          }}
                        >
                          + Add Certificate
                        </button>
                      )}
                    </div>

                    {/* Optional Organisation Role Credentials stored in User Passport */}
                    {profUser?.id === currentUser?.id &&
                      myMemberships.map((m: any) => (
                        <div
                          key={`prof-org-${m.membership.id}`}
                          className="opp !mt-0 cursor-pointer"
                          onClick={() => setSelectedOrgModalId(m.organisation.id)}
                        >
                          <div className="top">
                            <span className="otype">
                              Organisation Role · Extra Credential
                            </span>
                            <span
                              className="pill flex items-center gap-1"
                              style={{ background: "#e6f2f3", color: "#0b5d66" }}
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
                            {m.organisation.name.replace(
                              /\s*\(Fictional Demo\)/i,
                              ""
                            )}
                          </h4>
                          <p>
                            {m.organisation.orgType} · {m.organisation.location}
                          </p>
                          <div className="bot">
                            <div className="facts">
                              <span>Optional Organisation Role</span>
                              {(m.organisation.servicesOrProgrammes || [])
                                .slice(0, 2)
                                .map((s: string) => (
                                  <span key={s}>{s}</span>
                                ))}
                            </div>
                          </div>
                        </div>
                      ))}

                    {/* Talent Passport Credentials & Acquired Skills (Only Verified or Self-declared appear in Passport) */}
                    {myPassportRecords
                      .filter((rec: any) => {
                        const isVer =
                          rec.evidenceStatus ===
                            "Confirmed by an authorised organisation representative" ||
                          rec.evidenceStatus === "Institution-issued credential";
                        const isSelf = rec.evidenceStatus === "Self-declared";
                        return isVer || isSelf;
                      })
                      .map((rec: any) => {
                        const isVer =
                          rec.evidenceStatus ===
                            "Confirmed by an authorised organisation representative" ||
                          rec.evidenceStatus === "Institution-issued credential";
                        const firstStepIdx = activePath.steps.findIndex((st) =>
                          (rec.skillsDemonstrated || []).some(
                            (sk: string) =>
                              sk.toLowerCase() === st.t.toLowerCase()
                          )
                        );
                        const targetIdx =
                          firstStepIdx >= 0
                            ? firstStepIdx
                            : Math.max(0, activeStepIdx);
                        return (
                          <div key={rec.id} className="opp">
                            <div className="top">
                              <span className="otype">{rec.recordCategory}</span>
                              <span
                                className="pill flex items-center gap-1"
                                style={
                                  isVer
                                    ? { background: "#e6f2f3", color: "#0b5d66" }
                                    : { background: "#fdece5", color: "#b84a22" }
                                }
                              >
                                {isVer && <VerifiedBadgeSvg />}
                                {isVer ? "Verified" : "Self-declared"}
                              </span>
                            </div>
                            <h4>{rec.title}</h4>
                            <p>
                              {rec.issuerOrOrganisationName.replace(
                                /\s*\(Fictional Demo\)/i,
                                ""
                              )}
                            </p>
                            <p className="mt-1 text-xs text-[#0f1720]">
                              {rec.publicSummary}
                            </p>
                            <div className="bot">
                              <div className="facts">
                                {rec.confirmedHours > 0 && (
                                  <span>{rec.confirmedHours} confirmed hrs</span>
                                )}
                                {(rec.skillsDemonstrated || []).map(
                                  (sk: string) => (
                                    <span key={sk}>{sk}</span>
                                  )
                                )}
                              </div>
                              {profUser?.id === currentUser?.id && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    className="fol"
                                    onClick={() =>
                                      openRoadmapSkillSheet(
                                        targetIdx,
                                        "submit_verification"
                                      )
                                    }
                                  >
                                    Submit Review
                                  </button>
                                  <button
                                    type="button"
                                    className="fol on"
                                    onClick={() =>
                                      openRoadmapSkillSheet(
                                        targetIdx,
                                        "self_declare"
                                      )
                                    }
                                  >
                                    Self Declare
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="grid3">
                    {[
                      { t: "photo", k: "teal", g: "sun", url: PRESET_MEDIA_OPTIONS[0].url },
                      { t: "day", k: "coral", g: "clock", l: "Day in the life" },
                      { t: "photo", k: "dusk", g: "camera", url: PRESET_MEDIA_OPTIONS[2].url },
                      { t: "tour", k: "navy", g: "route", l: `${pathPct}%` },
                      { t: "photo", k: "forest", g: "route", url: PRESET_MEDIA_OPTIONS[1].url },
                      { t: "photo", k: "plum", g: "sun", url: PRESET_MEDIA_OPTIONS[3].url },
                      { t: "day", k: "teal", g: "clock", l: "Day in the life" },
                      { t: "photo", k: "sand", g: "camera" },
                      { t: "tour", k: "forest", g: "route", l: `${confirmedPracticalHours}h` },
                    ]
                      .filter(
                        (c) =>
                          profileSegment === "all" || c.t === profileSegment
                      )
                      .map((c, i) => (
                        <div
                          key={i}
                          className="cell cursor-pointer"
                          onClick={() => setShowFullPassportModal(true)}
                          style={{
                            background: c.url
                              ? `url(${c.url}) center/cover`
                              : grad(c.k, 120 + (i % 4) * 25),
                          }}
                        >
                          {!c.url && <GlyphSvg name={c.g} size={30} />}
                          {c.l && <small>{c.l}</small>}
                        </div>
                      ))}
                  </div>
                )}
              </>
            );
          })()}
        </section>
      </main>

      {/* =====================================================================
          BOTTOM TAB BAR (Exact 4-tab design: Home, Search, Tours, Profile)
      ===================================================================== */}
      <nav className="tabbar" id="tabbar" aria-label="Primary">
        <button
          type="button"
          className={`tab ${activeTab === "home" ? "active" : ""}`}
          onClick={() => setActiveTab("home")}
          aria-label="Home"
        >
          <span className="tico">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 11 12 4l8 7v8.2a.8.8 0 0 1-.8.8H15v-5.5H9V20H4.8a.8.8 0 0 1-.8-.8V11Z" />
            </svg>
          </span>
        </button>

        <button
          type="button"
          className={`tab ${activeTab === "search" ? "active" : ""}`}
          onClick={() => setActiveTab("search")}
          aria-label="Search"
        >
          <span className="tico">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-4.2-4.2" />
            </svg>
          </span>
        </button>

        <button
          type="button"
          className={`tab ${activeTab === "tours" ? "active" : ""}`}
          onClick={() => setActiveTab("tours")}
          aria-label="Tours"
        >
          <span className="tico">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M6 20.5c-3.2-4.2 2-7.5 6-7.5s6.4-3 3-7"
                strokeWidth="2.2"
                strokeDasharray="0.1 3.6"
              />
              <path d="M12.4 8.4 15 5.6l2.8 2.8" strokeWidth="2" />
            </svg>
          </span>
        </button>

        <button
          type="button"
          className={`tab ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => {
            if (currentUser?.id) setViewedProfileUserId(currentUser.id);
            setActiveTab("profile");
          }}
          aria-label="Profile"
        >
          <span className="tico">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8.5" r="3.8" />
              <path d="M4.5 20c.6-3.7 3.7-5.8 7.5-5.8s6.9 2.1 7.5 5.8" />
            </svg>
          </span>
        </button>
      </nav>

      {/* =====================================================================
          ONBOARDING OVERLAY (Exact 2-step Interest Chips -> Career Path Match)
      ===================================================================== */}
      <div className={`ob ${showOnboardingOverlay ? "show" : ""}`}>
        <div className="obHead">
          {obStep === 2 ? (
            <button
              type="button"
              className="icon-btn"
              aria-label="Back"
              onClick={() => setObStep(1)}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 5-7 7 7 7" />
              </svg>
            </button>
          ) : (
            <span style={{ width: 40 }} />
          )}
          <span className="obDots">
            <i className={obStep === 1 ? "on" : ""} />
            <i className={obStep === 2 ? "on" : ""} />
          </span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            onClick={() => setShowOnboardingOverlay(false)}
          >
            &times;
          </button>
        </div>

        {obStep === 1 ? (
          <>
            <div className="obBody">
              <h1>What are you into?</h1>
              <p>
                Pick at least 3 interests. We’ll suggest tourism and hospitality
                careers that fit you.
              </p>
              <div className="chips">
                {INTERESTS.map(([id, label]) => {
                  const isOn = obSelectedInterests.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        if (isOn) {
                          setObSelectedInterests(
                            obSelectedInterests.filter((x) => x !== id)
                          );
                        } else {
                          setObSelectedInterests([...obSelectedInterests, id]);
                        }
                      }}
                      className={`chipI ${isOn ? "on" : ""}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="obFoot">
              <button
                type="button"
                className="obBtn"
                disabled={obSelectedInterests.length < 3}
                onClick={() => setObStep(2)}
              >
                {obSelectedInterests.length < 3
                  ? `Pick ${3 - obSelectedInterests.length} more`
                  : `Continue · ${obSelectedInterests.length} selected`}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="obBody">
              <h1>Your career paths</h1>
              <p>
                Based on your interests. Choose one and we’ll build your roadmap.
              </p>
              {rankPaths(obSelectedInterests).map(({ p, m }, i) => {
                const sk = p.steps.filter((s) => s.k === "skill").length;
                const ex = p.steps.length - sk;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setObChosenPathId(p.id)}
                    className={`pc ${i === 0 ? "best" : ""} ${
                      obChosenPathId === p.id ? "on" : ""
                    }`}
                  >
                    <div className="row">
                      <h3>{p.name}</h3>
                      <span className="match">{m}% match</span>
                    </div>
                    <p>{p.blurb}</p>
                    <div className="meta">
                      <span>{sk} skills</span>
                      <span>{ex} experiences</span>
                      <span>{totalHrs(p)} hrs</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="obFoot">
              <button
                type="button"
                className="obBtn"
                onClick={handleStartSelectedPath}
              >
                Start this path
              </button>
            </div>
          </>
        )}
      </div>

      {/* =====================================================================
          CREATE POST SLIDE-UP SHEET ('Life at work' | 'Day in the life' | 'Tour progress')
      ===================================================================== */}
      <div
        className={`cp ${showCreateSheet ? "show" : ""}`}
        aria-hidden={!showCreateSheet}
      >
        <div className="cpHead">
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            onClick={() => setShowCreateSheet(false)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <b>New post</b>
          <button
            type="button"
            className="cpPost"
            disabled={!isCpValid()}
            onClick={handlePublishCreatePost}
          >
            Post
          </button>
        </div>

        <div className="cpBody">
          <div className="cAuthor">
            <div
              className="avatar"
              style={{
                background: currentUser?.avatarUrl
                  ? `url(${currentUser.avatarUrl}) center/cover`
                  : grad(pickColorKey(currentUser?.name || "TM")),
              }}
            >
              {!currentUser?.avatarUrl && getInitials(currentUser?.name)}
            </div>
            <div>
              <div className="name">{currentUser?.name || "Tariro Moyo"}</div>
              <div className="meta">
                {currentUser?.careerStage || "Hospitality Student"}
              </div>
            </div>
          </div>

          <div className="ctypes">
            {[
              { id: "life", label: "Life at work", g: "camera" },
              { id: "day", label: "Day in the life", g: "clock" },
              { id: "tour", label: "Tour progress", g: "route" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCpType(t.id as any)}
                className={`ctype ${cpType === t.id ? "on" : ""}`}
              >
                <GlyphSvg name={t.g} size={20} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {cpType === "life" && (
            <>
              <label className="lab">Photos</label>
              <div className="phs">
                {cpPhotos.map((p, i) => (
                  <div
                    key={i}
                    className="ph"
                    style={{
                      background: p.url
                        ? `url(${p.url}) center/cover`
                        : grad(p.k, 140 + i * 20),
                    }}
                  >
                    {!p.url && <GlyphSvg name={p.g} size={22} />}
                    <button
                      type="button"
                      className="phx"
                      aria-label="Remove photo"
                      onClick={() =>
                        setCpPhotos(cpPhotos.filter((_, idx) => idx !== i))
                      }
                    >
                      &times;
                    </button>
                  </div>
                ))}
                {cpPhotos.length < 4 && (
                  <button
                    type="button"
                    className="ph add"
                    onClick={() => {
                      const nextOpt =
                        PRESET_MEDIA_OPTIONS[
                          cpPhotos.length % PRESET_MEDIA_OPTIONS.length
                        ];
                      setCpPhotos([...cpPhotos, nextOpt]);
                    }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <small>Add</small>
                  </button>
                )}
              </div>
              <div className="hint">
                Up to 4 photos. Note: Claiming a skill in a post does not
                automatically verify that skill in your Talent Passport.
              </div>

              <label className="lab">Caption</label>
              <textarea
                className="fld"
                rows={4}
                maxLength={500}
                placeholder="Share what life at work looks like…"
                value={cpCaption}
                onChange={(e) => setCpCaption(e.target.value)}
              />
              <div className="cnt">{cpCaption.length}/500</div>

              <label className="lab">Location (optional)</label>
              <input
                className="fld"
                placeholder="e.g. Zambezi Canopy Eco-Lodge, Victoria Falls"
                value={cpLoc}
                onChange={(e) => setCpLoc(e.target.value)}
              />

              <label className="lab">Tag a company (optional)</label>
              <input
                className="fld"
                placeholder="Company you work or train at"
                value={cpCompany}
                onChange={(e) => setCpCompany(e.target.value)}
              />
            </>
          )}

          {cpType === "day" && (
            <>
              <label className="lab">Which company?</label>
              <input
                className="fld"
                placeholder="e.g. Zambezi Canopy Eco-Lodge"
                value={cpCompany}
                onChange={(e) => setCpCompany(e.target.value)}
              />

              <label className="lab">Your day, moment by moment</label>
              {cpEntries.map((entry, i) => (
                <div key={i} className="erow">
                  <input
                    className="fld t"
                    value={entry.t}
                    placeholder="06:30"
                    onChange={(e) => {
                      const next = [...cpEntries];
                      next[i] = { ...next[i], t: e.target.value };
                      setCpEntries(next);
                    }}
                  />
                  <div className="ecol">
                    <input
                      className="fld"
                      value={entry.title}
                      placeholder="What you did"
                      onChange={(e) => {
                        const next = [...cpEntries];
                        next[i] = { ...next[i], title: e.target.value };
                        setCpEntries(next);
                      }}
                    />
                    <input
                      className="fld"
                      value={entry.d}
                      placeholder="Details (optional)"
                      onChange={(e) => {
                        const next = [...cpEntries];
                        next[i] = { ...next[i], d: e.target.value };
                        setCpEntries(next);
                      }}
                    />
                  </div>
                  {cpEntries.length > 1 && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Remove"
                      onClick={() =>
                        setCpEntries(cpEntries.filter((_, idx) => idx !== i))
                      }
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
              {cpEntries.length < 6 && (
                <button
                  type="button"
                  className="addE"
                  onClick={() =>
                    setCpEntries([...cpEntries, { t: "", title: "", d: "" }])
                  }
                >
                  + Add a moment
                </button>
              )}

              <label className="lab">
                Anything to add about your day? (optional)
              </label>
              <textarea
                className="fld"
                rows={3}
                maxLength={500}
                value={cpCaption}
                onChange={(e) => setCpCaption(e.target.value)}
              />
            </>
          )}

          {cpType === "tour" && (
            <>
              <label className="lab">Screenshot from your Tours page</label>
              <div className="snap">{renderRoadmapVisual(false)}</div>
              <div className="snapMeta">
                <span>
                  <GlyphSvg name="camera" size={16} /> Captured just now
                </span>
                <button
                  type="button"
                  className="snapRe"
                  onClick={() => showToast("Screenshot retaken")}
                >
                  Retake
                </button>
              </div>
              <label className="lab">Add a caption (optional)</label>
              <textarea
                className="fld"
                rows={3}
                maxLength={500}
                value={cpCaption}
                onChange={(e) => setCpCaption(e.target.value)}
              />
            </>
          )}
        </div>
      </div>

      {/* =====================================================================
          SLIDE-OVER WORKSPACE MODALS (Preserving all full TourBridge backend journeys)
      ===================================================================== */}

      {/* 0. Story Viewer Modal (Shows story posts from other users or company pages only) */}
      {activeStoryItem && (
        <div className="ob show">
          <div className="pbar">
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => {
                const story = activeStoryItem;
                setActiveStoryItem(null);
                if (story.kind === "company") {
                  setSelectedOrgModalId(story.id);
                } else {
                  setViewedProfileUserId(story.id);
                  setActiveTab("profile");
                }
              }}
            >
              <div
                className="avatar !w-9 !h-9"
                style={{
                  background: activeStoryItem.avatarUrl
                    ? `url(${activeStoryItem.avatarUrl}) center/cover`
                    : grad(pickColorKey(activeStoryItem.name)),
                }}
              >
                {!activeStoryItem.avatarUrl &&
                  getInitials(activeStoryItem.name)}
              </div>
              <div className="leading-tight">
                <b className="block text-sm flex items-center gap-1.5">
                  {activeStoryItem.name}
                  {activeStoryItem.kind === "company" && (
                    <span className="pill co">Company</span>
                  )}
                </b>
                <span className="text-[11px] text-[#6b7480]">
                  {activeStoryItem.subtitle}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setActiveStoryItem(null)}
              aria-label="Close Story"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div className="obBody !p-0">
            <article className="post !border-b-0">
              <div
                className="media"
                style={{
                  background: activeStoryItem.mediaUrl
                    ? `url(${activeStoryItem.mediaUrl}) center/cover`
                    : grad(pickColorKey(activeStoryItem.name), 150),
                }}
              >
                <div className="loc">
                  <PinSvg />
                  {activeStoryItem.location}
                </div>
              </div>
              <div className="caption" style={{ marginTop: 14 }}>
                <b>{activeStoryItem.name.split(" ")[0]}</b>{" "}
                {activeStoryItem.caption}
              </div>
              <div className="p-4">
                <button
                  type="button"
                  className="obBtn"
                  onClick={() => {
                    const story = activeStoryItem;
                    setActiveStoryItem(null);
                    if (story.kind === "company") {
                      setSelectedOrgModalId(story.id);
                    } else {
                      setViewedProfileUserId(story.id);
                      setActiveTab("profile");
                    }
                  }}
                >
                  {activeStoryItem.kind === "company"
                    ? `View ${activeStoryItem.name} Company Page`
                    : `View ${activeStoryItem.name}'s Profile`}
                </button>
              </div>
            </article>
          </div>
        </div>
      )}

      {/* 1. Options Page (Triggered by the 3 lines at the top-right corner of Profile) */}
      {showAccountMenuModal && (
        <div className="ob show">
          <div className="pbar">
            <div className="flex items-center gap-2">
              {optionsActiveSection !== "menu" && (
                <button
                  type="button"
                  className="icon-btn !w-8 !h-8"
                  onClick={() => setOptionsActiveSection("menu")}
                  aria-label="Back to Options"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
              )}
              <b>
                {optionsActiveSection === "menu" && "Options"}
                {optionsActiveSection === "applications" &&
                  `Applications (${applicationsList.length})`}
                {optionsActiveSection === "passport" && "Talent Passport"}
                {optionsActiveSection === "edit" &&
                  "Edit Profile & Org Role"}
                {optionsActiveSection === "account" && "Account & Demo Roles"}
              </b>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowAccountMenuModal(false)}
              aria-label="Close"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <div className="obBody !p-0">
            {/* SECTION 1: VERTICAL SCROLLABLE OPTION CARDS (No horizontal scroll bar at the top) */}
            {optionsActiveSection === "menu" && (
              <div className="sSec space-y-3 pb-12">
                {/* Deep Teal Member Summary Card (.rmSum) */}
                <div className="rmSum">
                  <div className="rmTop">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="avatar !w-12 !h-12 !rounded-2xl border-2 border-white/30"
                        style={{
                          background: currentUser?.avatarUrl
                            ? `url(${currentUser.avatarUrl}) center/cover`
                            : grad(pickColorKey(currentUser?.name || "TM")),
                        }}
                      >
                        {!currentUser?.avatarUrl &&
                          getInitials(currentUser?.name)}
                      </div>
                      <div className="min-w-0">
                        <small className="block truncate">
                          {currentUser?.careerStage} · {currentUser?.location}
                        </small>
                        <h2 className="truncate">{currentUser?.name}</h2>
                      </div>
                    </div>
                    <div className="rmRing">
                      <svg width="64" height="64" viewBox="0 0 64 64">
                        <circle
                          cx="32"
                          cy="32"
                          r={28}
                          fill="none"
                          stroke="rgba(255,255,255,.25)"
                          strokeWidth="6"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r={28}
                          fill="none"
                          stroke="#fff"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 28}
                          strokeDashoffset={
                            2 * Math.PI * 28 * (1 - pathPct / 100)
                          }
                        />
                      </svg>
                      <b>{confirmedPracticalHours}h</b>
                    </div>
                  </div>
                  <div className="rmMeta !mt-3">
                    <span>{applicationsList.length} applications</span>
                    <span>
                      {myPassportRecords.length} passport records ·{" "}
                      {myMemberships.length} org roles
                    </span>
                  </div>
                </div>

                <div className="sSecHead !mt-4">
                  <h3>All Options</h3>
                  <span>Scroll vertically</span>
                </div>

                {/* Card 1: Applications */}
                <div
                  className="opp cursor-pointer"
                  onClick={() => setOptionsActiveSection("applications")}
                >
                  <div className="top">
                    <span className="otype">Applications &amp; Roles</span>
                    <span className="pill">
                      {applicationsList.length} total
                    </span>
                  </div>
                  <h4>Applications</h4>
                  <p>
                    Track your submitted opportunity applications, review
                    candidate submissions, and publish new tourism roles.
                  </p>
                  <div className="bot">
                    <div className="facts">
                      <span>Submitted applications</span>
                      {myMemberships.length > 0 && <span>+ Post Role</span>}
                    </div>
                    <button
                      type="button"
                      className="fol"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOptionsActiveSection("applications");
                      }}
                    >
                      Open
                    </button>
                  </div>
                </div>

                {/* Card 2: Talent Passport */}
                <div
                  className="opp cursor-pointer"
                  onClick={() => setOptionsActiveSection("passport")}
                >
                  <div className="top">
                    <span className="otype vol">Verified Career Evidence</span>
                    <span className="pill">
                      {myPassportRecords.length} records
                    </span>
                  </div>
                  <h4>Talent Passport</h4>
                  <p>
                    Manage your verified credentials, submit skills &amp;
                    placements for verification, and inspect private evidence
                    vault records.
                  </p>
                  <div className="bot">
                    <div className="facts">
                      <span>Skills verification</span>
                      <span>Placements</span>
                      <span>Credentials</span>
                    </div>
                    <button
                      type="button"
                      className="fol"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOptionsActiveSection("passport");
                      }}
                    >
                      Open
                    </button>
                  </div>
                </div>

                {/* Card 3: Edit Profile & Org Role (Merged Page) */}
                <div
                  className="opp cursor-pointer"
                  onClick={() => setOptionsActiveSection("edit")}
                >
                  <div className="top">
                    <span className="otype">Profile &amp; Organisation</span>
                    <span className="pill">
                      {myMemberships.length} org roles
                    </span>
                  </div>
                  <h4>Edit Profile &amp; Org Role</h4>
                  <p>
                    Update your personal bio, career stage, location, privacy
                    preferences, and manage or register organisation roles in
                    one place.
                  </p>
                  <div className="bot">
                    <div className="facts">
                      <span>Edit Profile</span>
                      <span>Privacy</span>
                      <span>+ Org Role</span>
                    </div>
                    <button
                      type="button"
                      className="fol"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOptionsActiveSection("edit");
                      }}
                    >
                      Open
                    </button>
                  </div>
                </div>

                {/* Card 4: Adaptive Career Questionnaire */}
                <div
                  className="opp cursor-pointer"
                  onClick={() => {
                    setShowAccountMenuModal(false);
                    setShowFullQuestionnaireModal(true);
                  }}
                >
                  <div className="top">
                    <span className="otype vol">Career Onboarding</span>
                    <span className="pill">5 steps</span>
                  </div>
                  <h4>Adaptive Career Questionnaire</h4>
                  <p>
                    Retake the conversational 5-step tourism career-stage
                    questionnaire to tailor your recommended pathway and
                    checklist.
                  </p>
                  <div className="bot">
                    <div className="facts">
                      <span>{currentUser?.careerStage}</span>
                      <span>Pathway matching</span>
                    </div>
                    <button
                      type="button"
                      className="fol"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAccountMenuModal(false);
                        setShowFullQuestionnaireModal(true);
                      }}
                    >
                      Start
                    </button>
                  </div>
                </div>

                {/* Card 5: Account & Demo Persona Switcher */}
                <div
                  className="opp cursor-pointer"
                  onClick={() => setOptionsActiveSection("account")}
                >
                  <div className="top">
                    <span className="otype">Account &amp; RBAC</span>
                    <span className="pill">{activeDemoPersona}</span>
                  </div>
                  <h4>Account &amp; Demo Roles</h4>
                  <p>
                    Switch between fictional demo personas (Student, Employer
                    Supervisor, Training Institution, Platform Admin) or manage
                    sign-in.
                  </p>
                  <div className="bot">
                    <div className="facts">
                      <span>Role-based access</span>
                      <span>Sign in / out</span>
                    </div>
                    <button
                      type="button"
                      className="fol"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOptionsActiveSection("account");
                      }}
                    >
                      Open
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: APPLICATIONS OPTION (Embedded directly in Options Page) */}
            {optionsActiveSection === "applications" && (
              <OpportunitiesAndPlacementsView
                currentUser={currentUser}
                memberships={myMemberships}
                opportunities={opportunitiesList}
                applications={applicationsList}
                placements={placementsList}
                myPassportRecords={myPassportRecords}
                onRefresh={loadAllData}
                apiFetch={apiFetch}
                onOpenOrgModal={(orgId) => setSelectedOrgModalId(orgId)}
                onNavigateToSearchOpportunities={() => {
                  setShowAccountMenuModal(false);
                  setActiveTab("search");
                  setSearchFilter("opps");
                }}
              />
            )}

            {/* SECTION 3: TALENT PASSPORT & PORTFOLIO OPTION (Passport, Portfolio, Pathway tabs) */}
            {optionsActiveSection === "passport" && (
              <ProfileAndPassportView
                currentUser={currentUser}
                viewedUserId={viewedProfileUserId || currentUser?.id}
                myMemberships={myMemberships}
                allOrganisations={organisationsList}
                opportunities={opportunitiesList}
                placements={placementsList}
                viewMode="passport"
                dataSaverMode={Boolean(currentUser?.dataSaverMode)}
                apiFetch={apiFetch}
                onRefreshSession={loadAllData}
                onOpenOnboardingEdit={() => {
                  setShowAccountMenuModal(false);
                  setShowFullQuestionnaireModal(true);
                }}
                onNavigateTab={() => {
                  setShowAccountMenuModal(false);
                  setActiveTab("search");
                  setSearchFilter("opps");
                }}
                onOpenMessagingWithUser={(uid) => {
                  setActiveChatPartnerId(uid);
                  setShowAccountMenuModal(false);
                  setShowNotificationsModal(true);
                }}
                onOpenOrgModal={(orgId) => setSelectedOrgModalId(orgId)}
              />
            )}

            {/* SECTION 4: MERGED EDIT PROFILE & ORG ROLE OPTION */}
            {optionsActiveSection === "edit" && (
              <ProfileAndPassportView
                currentUser={currentUser}
                viewedUserId={currentUser?.id}
                myMemberships={myMemberships}
                allOrganisations={organisationsList}
                opportunities={opportunitiesList}
                placements={placementsList}
                viewMode="edit"
                dataSaverMode={Boolean(currentUser?.dataSaverMode)}
                apiFetch={apiFetch}
                onRefreshSession={loadAllData}
                onOpenOnboardingEdit={() => {
                  setShowAccountMenuModal(false);
                  setShowFullQuestionnaireModal(true);
                }}
                onNavigateTab={() => {
                  setShowAccountMenuModal(false);
                  setActiveTab("search");
                  setSearchFilter("opps");
                }}
                onOpenMessagingWithUser={(uid) => {
                  setActiveChatPartnerId(uid);
                  setShowAccountMenuModal(false);
                  setShowNotificationsModal(true);
                }}
                onOpenOrgModal={(orgId) => setSelectedOrgModalId(orgId)}
              />
            )}

            {/* SECTION 5: ACCOUNT & DEMO ROLES OPTION */}
            {optionsActiveSection === "account" && (
              <div className="sSec space-y-4">
                <div>
                  <div className="sSecHead">
                    <h3>Switch Fictional Demo Persona</h3>
                    <span>RBAC &amp; Verification</span>
                  </div>
                  {DEMO_PERSONA_LIST.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => {
                        setActiveDemoPersona(p.key);
                        setViewedProfileUserId(null);
                        setShowAccountMenuModal(false);
                        if (p.key === "demo-admin") {
                          setShowAdminModal(true);
                        }
                        showToast(`Switched to ${p.label}`);
                      }}
                      className={`pc w-full text-left ${
                        activeDemoPersona === p.key ? "on" : ""
                      }`}
                    >
                      <div className="row">
                        <h3>{p.label}</h3>
                        {activeDemoPersona === p.key && (
                          <span className="match">Active</span>
                        )}
                      </div>
                      <p>{p.sub}</p>
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  {currentUser?.platformRole === "admin" && (
                    <button
                      type="button"
                      className="obBtn !bg-[#e8734a]"
                      onClick={() => {
                        setShowAccountMenuModal(false);
                        setShowAdminModal(true);
                      }}
                    >
                      Open Platform Administrator Workspace
                    </button>
                  )}

                  {firebaseUser ? (
                    <button
                      type="button"
                      className="pBtn w-full"
                      onClick={() => firebaseSignOut(auth)}
                    >
                      Sign Out ({firebaseUser.email})
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="pBtn w-full"
                      onClick={() => signInWithPopup(auth, googleAuthProvider)}
                    >
                      Sign In with Google
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Notifications & Direct Messages Modal */}
      {showNotificationsModal && (
        <div className="ob show">
          <div className="pbar">
            <b>Notifications &amp; Messages</b>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowNotificationsModal(false)}
            >
              &times;
            </button>
          </div>
          <div className="obBody space-y-5">
            <div>
              <h3 className="text-sm font-bold mb-2">Direct Messages</h3>
              <div className="sChips !pt-0">
                {messagesData.partners.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveChatPartnerId(p.id)}
                    className={`sChip ${
                      activeChatPartnerId === p.id ? "on" : ""
                    }`}
                  >
                    {p.name.split(" ")[0]}
                  </button>
                ))}
              </div>
              <div className="space-y-2 my-2 max-h-48 overflow-y-auto p-3 rounded-2xl bg-[#f5f6f8]">
                {messagesData.messages
                  .filter(
                    (m: any) =>
                      m.senderId === activeChatPartnerId ||
                      m.receiverId === activeChatPartnerId
                  )
                  .slice()
                  .reverse()
                  .map((m: any) => (
                    <div
                      key={m.id}
                      className={`p-2.5 rounded-xl text-xs max-w-[85%] ${
                        m.senderId === currentUser?.id
                          ? "ml-auto bg-[#0b5d66] text-white"
                          : "bg-white text-[#0f1720]"
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  placeholder="Write a message to connection or employer…"
                  className="fld !py-2 flex-1"
                />
                <button type="submit" className="fol !h-auto !px-4">
                  Send
                </button>
              </form>
            </div>

            <div>
              <h3 className="text-sm font-bold mb-2">Recent Notifications</h3>
              {notificationsList.map((n: any) => (
                <div key={n.id} className="opp">
                  <span className="otype">{n.category}</span>
                  <h4>{n.title}</h4>
                  <p>{n.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Applications & Role Publishing Modal (Placements unified into Talent Passport) */}
      {showOpportunitiesWorkspaceModal && (
        <div className="ob show">
          <div className="pbar">
            <b>Applications &amp; Role Publishing</b>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowOpportunitiesWorkspaceModal(false)}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div className="obBody !p-0">
            <OpportunitiesAndPlacementsView
              currentUser={currentUser}
              memberships={myMemberships}
              opportunities={opportunitiesList}
              applications={applicationsList}
              placements={placementsList}
              myPassportRecords={myPassportRecords}
              onRefresh={loadAllData}
              apiFetch={apiFetch}
              onOpenOrgModal={(orgId) => setSelectedOrgModalId(orgId)}
              onNavigateToSearchOpportunities={() => {
                setShowOpportunitiesWorkspaceModal(false);
                setActiveTab("search");
                setSearchFilter("opps");
              }}
            />
          </div>
        </div>
      )}

      {/* 4. Full Talent Passport Modal (Pathway, Portfolio & Passport tabs removed) */}
      {showFullPassportModal && (
        <div className="ob show">
          <div className="pbar">
            <b>Talent Passport</b>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowFullPassportModal(false)}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div className="obBody !p-0">
            <ProfileAndPassportView
              currentUser={currentUser}
              viewedUserId={viewedProfileUserId || currentUser?.id}
              myMemberships={myMemberships}
              allOrganisations={organisationsList}
              opportunities={opportunitiesList}
              placements={placementsList}
              viewMode="passport"
              dataSaverMode={Boolean(currentUser?.dataSaverMode)}
              apiFetch={apiFetch}
              onRefreshSession={loadAllData}
              onOpenOnboardingEdit={() => {
                setShowFullPassportModal(false);
                setShowFullQuestionnaireModal(true);
              }}
              onNavigateTab={() => {
                setShowFullPassportModal(false);
                setActiveTab("search");
                setSearchFilter("opps");
              }}
              onOpenMessagingWithUser={(uid) => {
                setActiveChatPartnerId(uid);
                setShowFullPassportModal(false);
                setShowNotificationsModal(true);
              }}
              onOpenOrgModal={(orgId) => setSelectedOrgModalId(orgId)}
            />
          </div>
        </div>
      )}

      {/* 4B. Merged Edit Profile & Organisation Role Page Modal */}
      {showEditProfileModal && (
        <div className="ob show">
          <div className="pbar">
            <b>Edit Profile &amp; Org Role</b>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowEditProfileModal(false)}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div className="obBody !p-0">
            <ProfileAndPassportView
              currentUser={currentUser}
              viewedUserId={currentUser?.id}
              myMemberships={myMemberships}
              allOrganisations={organisationsList}
              opportunities={opportunitiesList}
              placements={placementsList}
              viewMode="edit"
              dataSaverMode={Boolean(currentUser?.dataSaverMode)}
              apiFetch={apiFetch}
              onRefreshSession={loadAllData}
              onOpenOnboardingEdit={() => {
                setShowEditProfileModal(false);
                setShowFullQuestionnaireModal(true);
              }}
              onNavigateTab={() => {
                setShowEditProfileModal(false);
                setActiveTab("search");
                setSearchFilter("opps");
              }}
              onOpenMessagingWithUser={(uid) => {
                setActiveChatPartnerId(uid);
                setShowEditProfileModal(false);
                setShowNotificationsModal(true);
              }}
              onOpenOrgModal={(orgId) => setSelectedOrgModalId(orgId)}
            />
          </div>
        </div>
      )}

      {/* 5. Full 5-Step Adaptive Career-Stage Questionnaire Modal */}
      {showFullQuestionnaireModal && (
        <div className="ob show">
          <div className="pbar">
            <b>Adaptive Career Questionnaire</b>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowFullQuestionnaireModal(false)}
            >
              &times;
            </button>
          </div>
          <div className="obBody !p-0">
            <OnboardingWizard
              user={currentUser}
              onSaveOnboarding={async (payload, completed) => {
                await apiFetch("/api/onboarding", {
                  method: "PUT",
                  body: JSON.stringify(payload),
                });
                await loadAllData();
                if (completed) {
                  setShowFullQuestionnaireModal(false);
                  showToast("Career profile & preferences updated");
                }
              }}
              onClose={() => setShowFullQuestionnaireModal(false)}
            />
          </div>
        </div>
      )}

      {/* 6. Platform Administrator Workspace Modal */}
      {showAdminModal && (
        <div className="ob show">
          <div className="pbar">
            <b>Administrator Workspace</b>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowAdminModal(false)}
            >
              &times;
            </button>
          </div>
          <div className="obBody">
            <AdminWorkspaceView
              apiFetch={apiFetch}
              onRefreshGlobal={loadAllData}
            />
          </div>
        </div>
      )}

      {/* 7. Company / Organisation Detail Modal */}
      {selectedOrgModalId &&
        (() => {
          const org = organisationsList.find((o) => o.id === selectedOrgModalId);
          if (!org) return null;
          const orgOpps = opportunitiesList.filter(
            (o) => o.organisationId === org.id
          );
          return (
            <div className="ob show">
              <div className="pbar">
                <b>{org.name.replace(/\s*\(Fictional Demo\)/i, "")}</b>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setSelectedOrgModalId(null)}
                >
                  &times;
                </button>
              </div>
              <div className="obBody space-y-4">
                <div className="opp">
                  <span className="otype">{org.orgType}</span>
                  <h4>{org.name}</h4>
                  <p>
                    {org.location} · Status: {org.verificationStatus}
                  </p>
                  <p className="mt-2 text-xs text-[#0f1720]">
                    {org.description}
                  </p>
                  <div className="bot">
                    <div className="facts">
                      {(org.servicesOrProgrammes || []).map((s: string) => (
                        <span key={s}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-bold">
                  Open Opportunities ({orgOpps.length})
                </h3>
                {orgOpps.map((o) => (
                  <div key={o.id} className="opp">
                    <span className="otype">{o.opportunityType}</span>
                    <h4>{o.title}</h4>
                    <p>
                      {o.location} · {o.expectedHours} hrs · {o.compensationType}
                    </p>
                    <div className="bot">
                      <div className="facts">
                        <span>Deadline: {o.applicationDeadline}</span>
                      </div>
                      <button
                        type="button"
                        className="fol"
                        onClick={() => {
                          setSelectedOrgModalId(null);
                          handleQuickApply(o);
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

      {/* 8. Roadmap Skill Verification / Self-Declaration Slide-Up Sheet (.cp) */}
      <div className={`cp ${roadmapSkillModal ? "show" : ""}`}>
        <div className="cpHead">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setRoadmapSkillModal(null)}
            aria-label="Close"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <b>
            {roadmapSkillModal?.mode === "submit_verification"
              ? "Submit Skill for Verification"
              : "Self-Declare Skill Verification"}
          </b>
          <button
            type="button"
            className="cpPost"
            onClick={handleSubmitRoadmapSkill}
          >
            Submit
          </button>
        </div>

        {roadmapSkillModal && (
          <div className="cpBody">
            <div className="opp !mt-0">
              <div className="top">
                <span className="otype">
                  Skill {roadmapSkillModal.stepIndex + 1} of{" "}
                  {activePath.steps.length}
                </span>
                <span className="pill">
                  {roadmapSkillModal.mode === "submit_verification"
                    ? "Submitted for verification"
                    : "Self-declared"}
                </span>
              </div>
              <h4>{roadmapSkillModal.skillTitle}</h4>
              <p>
                Career Path: {activePath.name} · Unlocks next roadmap skill upon
                submission
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="ctypes mt-3">
              <button
                type="button"
                className={`ctype ${
                  roadmapSkillModal.mode === "submit_verification" ? "on" : ""
                }`}
                onClick={() =>
                  setRoadmapSkillModal({
                    ...roadmapSkillModal,
                    mode: "submit_verification",
                  })
                }
              >
                <span>Submit for Verification</span>
              </button>
              <button
                type="button"
                className={`ctype ${
                  roadmapSkillModal.mode === "self_declare" ? "on" : ""
                }`}
                onClick={() =>
                  setRoadmapSkillModal({
                    ...roadmapSkillModal,
                    mode: "self_declare",
                  })
                }
              >
                <span>Self-Declare Verification</span>
              </button>
            </div>

            <div className="hint">
              {roadmapSkillModal.mode === "submit_verification"
                ? "Select the host organisation or training institution to review and confirm your practical skill evidence."
                : "Record a self-declared skill milestone in your Talent Passport to unlock the next roadmap skill. Self-declared records are clearly labelled until verified by an authorised supervisor."}
            </div>

            <label className="lab">Practical Hours Practiced</label>
            <div className="rng">
              <input
                type="range"
                min={4}
                max={120}
                value={rmClaimedHours}
                onChange={(e) => setRmClaimedHours(Number(e.target.value))}
              />
              <b>{rmClaimedHours}h</b>
            </div>

            {roadmapSkillModal.mode === "submit_verification" && (
              <>
                <label className="lab">Verifying Organisation</label>
                <select
                  className="fld"
                  value={rmOrgId}
                  onChange={(e) => {
                    const org = organisationsList.find(
                      (o) => o.id === Number(e.target.value)
                    );
                    setRmOrgId(e.target.value);
                    if (org) {
                      setRmIssuerName(
                        org.name.replace(/\s*\(Fictional Demo\)/i, "")
                      );
                    }
                  }}
                >
                  <option value="">Select organisation or institution…</option>
                  {organisationsList.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name.replace(/\s*\(Fictional Demo\)/i, "")} (
                      {o.orgType})
                    </option>
                  ))}
                </select>
              </>
            )}

            <label className="lab">
              {roadmapSkillModal.mode === "submit_verification"
                ? "Host Organisation / Supervisor Name"
                : "Context / Where You Practiced This Skill"}
            </label>
            <input
              type="text"
              className="fld"
              value={rmIssuerName}
              onChange={(e) => setRmIssuerName(e.target.value)}
              placeholder="e.g. Zambezi Canopy Eco-Lodge or Practical Coursework"
            />

            <label className="lab">Completion Summary &amp; Tasks</label>
            <textarea
              rows={3}
              className="fld"
              value={rmEvidenceSummary}
              onChange={(e) => setRmEvidenceSummary(e.target.value)}
              placeholder="Describe how you demonstrated this skill…"
            />

            <label className="lab">
              Private Evidence Vault Note (Optional — Protected)
            </label>
            <textarea
              rows={2}
              className="fld"
              value={rmPrivateNote}
              onChange={(e) => setRmPrivateNote(e.target.value)}
              placeholder="Logbook reference, supervisor contact or certificate ID…"
            />
          </div>
        )}
      </div>

      {/* 9. Apply with Talent Passport Slide-Up Sheet (.cp) */}
      <div className={`cp ${applyingOppModal ? "show" : ""}`}>
        <div className="cpHead">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setApplyingOppModal(null)}
            aria-label="Close"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <b>Apply with Talent Passport</b>
          <button
            type="button"
            className="cpPost"
            onClick={async () => {
              if (!applyingOppModal) return;
              try {
                await apiFetch(
                  `/api/opportunities/${applyingOppModal.id}/apply`,
                  {
                    method: "POST",
                    body: JSON.stringify({
                      coverMessage:
                        applySupportingMsg ||
                        "Applying with my verified TourBridge profile and Talent Passport records.",
                      highlightedRecordIds: applyPassportIds,
                    }),
                  }
                );
                await loadAllData();
                const appliedTitle = applyingOppModal.title;
                setApplyingOppModal(null);
                showToast(
                  `Applied to ${appliedTitle} with Talent Passport!`
                );
              } catch (err: any) {
                showToast(err.message || "Could not submit application");
              }
            }}
          >
            Submit
          </button>
        </div>

        {applyingOppModal && (
          <div className="cpBody">
            <div className="opp !mt-0">
              <div className="top">
                <span className="otype">
                  {applyingOppModal.opportunityType}
                </span>
                <span className="pill">{applyingOppModal.location}</span>
              </div>
              <h4>{applyingOppModal.title}</h4>
              <p>
                {applyingOppModal.organisation?.name?.replace(
                  /\s*\(Fictional Demo\)/i,
                  ""
                )}{" "}
                · {applyingOppModal.expectedHours} hrs ·{" "}
                {applyingOppModal.compensationType}
              </p>
            </div>

            <div className="hint">
              Your profile, career stage ({currentUser?.careerStage}) and
              selected Talent Passport records will be shared with{" "}
              {applyingOppModal.organisation?.name?.replace(
                /\s*\(Fictional Demo\)/i,
                ""
              )}
              .
            </div>

            <label className="lab">
              Highlight Relevant Talent Passport Records
            </label>
            <div className="space-y-2">
              {myPassportRecords.map((rec: any) => {
                const isSelected = applyPassportIds.includes(rec.id);
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() =>
                      setApplyPassportIds((prev: number[]) =>
                        isSelected
                          ? prev.filter((id: number) => id !== rec.id)
                          : [...prev, rec.id]
                      )
                    }
                    className={`opt w-full text-left ${
                      isSelected ? "pick" : ""
                    }`}
                  >
                    <div className="ic">
                      <GlyphSvg name="award" size={18} />
                    </div>
                    <div className="tx">
                      <b>{rec.title}</b>
                      <span>
                        {rec.recordType} · {rec.verificationStatus}
                      </span>
                    </div>
                    <div className="chk" />
                  </button>
                );
              })}
            </div>

            <label className="lab">Short Application Note</label>
            <textarea
              rows={4}
              value={applySupportingMsg}
              onChange={(e) => setApplySupportingMsg(e.target.value)}
              placeholder="Explain why you're excited for this hospitality/tourism opportunity and highlight your practical skills…"
              className="fld"
            />
          </div>
        )}
      </div>

      {/* 10. + Passport Record Slide-Up Sheet (.cp) triggered from Profile -> Passport tab */}
      <div className={`cp ${showAddPassportSheet ? "show" : ""}`}>
        <div className="cpHead">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowAddPassportSheet(false)}
            aria-label="Close"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <b>+ Passport Record</b>
          <button
            type="button"
            className="cpPost"
            disabled={
              !quickPassportForm.title.trim() ||
              !quickPassportForm.issuerOrOrganisationName.trim()
            }
            onClick={async () => {
              try {
                await apiFetch("/api/passport", {
                  method: "POST",
                  body: JSON.stringify({
                    recordCategory: quickPassportForm.recordCategory,
                    title: quickPassportForm.title,
                    issuerOrOrganisationName:
                      quickPassportForm.issuerOrOrganisationName,
                    organisationId: quickPassportForm.organisationId
                      ? Number(quickPassportForm.organisationId)
                      : null,
                    startDate: "2026-09",
                    endDate: "2026-10",
                    skillsDemonstrated: quickPassportForm.skillsText
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                    publicSummary: quickPassportForm.publicSummary,
                    evidenceReference: `TP-${Date.now().toString().slice(-5)}`,
                    submitForReview: quickPassportForm.submitForReview,
                    privateDocFileName: "passport_evidence.txt",
                    privateDocContent: quickPassportForm.privateDocContent,
                  }),
                });
                setShowAddPassportSheet(false);
                setQuickPassportForm({
                  ...quickPassportForm,
                  title: "",
                  publicSummary: "",
                  privateDocContent: "",
                });
                await loadAllData();
                showToast("Added record to Talent Passport!");
              } catch (err: any) {
                showToast(err.message || "Could not add Passport record");
              }
            }}
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
                value={quickPassportForm.recordCategory}
                onChange={(e) =>
                  setQuickPassportForm({
                    ...quickPassportForm,
                    recordCategory: e.target.value,
                  })
                }
              >
                <option value="Education">Education</option>
                <option value="Certificate">Certificate</option>
                <option value="Achievement">Achievement</option>
                <option value="Practical experience">
                  Practical experience
                </option>
              </select>
            </div>
            <div>
              <label className="lab">Issuing Organisation</label>
              <select
                className="fld"
                value={quickPassportForm.organisationId}
                onChange={(e) => {
                  const org = organisationsList.find(
                    (o) => o.id === Number(e.target.value)
                  );
                  setQuickPassportForm({
                    ...quickPassportForm,
                    organisationId: e.target.value,
                    issuerOrOrganisationName: org
                      ? org.name.replace(/\s*\(Fictional Demo\)/i, "")
                      : quickPassportForm.issuerOrOrganisationName,
                  });
                }}
              >
                <option value="">Unlisted / Self-declared</option>
                {organisationsList.map((o) => (
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
            value={quickPassportForm.title}
            onChange={(e) =>
              setQuickPassportForm({
                ...quickPassportForm,
                title: e.target.value,
              })
            }
          />

          <label className="lab">Issuer or Organisation Name</label>
          <input
            type="text"
            className="fld"
            placeholder="e.g. Bulawayo School of Hospitality"
            value={quickPassportForm.issuerOrOrganisationName}
            onChange={(e) =>
              setQuickPassportForm({
                ...quickPassportForm,
                issuerOrOrganisationName: e.target.value,
              })
            }
          />

          <label className="lab">
            Skills Demonstrated (Select from Tours Roadmap or Comma-separated)
          </label>
          <div className="sChips !pt-0 !pb-2">
            {activePath.steps.map((stObj) => {
              const sk = stObj.t;
              const currentSkills = quickPassportForm.skillsText
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
                    setQuickPassportForm({
                      ...quickPassportForm,
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
            value={quickPassportForm.skillsText}
            onChange={(e) =>
              setQuickPassportForm({
                ...quickPassportForm,
                skillsText: e.target.value,
              })
            }
          />

          <label className="lab">Submission Option</label>
          <div className="ctypes mt-1.5">
            <button
              type="button"
              className={`ctype ${
                quickPassportForm.submitForReview ? "on" : ""
              }`}
              onClick={() =>
                setQuickPassportForm({
                  ...quickPassportForm,
                  submitForReview: true,
                })
              }
            >
              <span>Submit Review</span>
            </button>
            <button
              type="button"
              className={`ctype ${
                !quickPassportForm.submitForReview ? "on" : ""
              }`}
              onClick={() =>
                setQuickPassportForm({
                  ...quickPassportForm,
                  submitForReview: false,
                })
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
            value={quickPassportForm.publicSummary}
            onChange={(e) =>
              setQuickPassportForm({
                ...quickPassportForm,
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
            value={quickPassportForm.privateDocContent}
            onChange={(e) =>
              setQuickPassportForm({
                ...quickPassportForm,
                privateDocContent: e.target.value,
              })
            }
          />
        </div>
      </div>

      {/* Toast Indicator */}
      <div className={`toast ${toastMsg ? "show" : ""}`}>{toastMsg}</div>
    </div>
  );
}
