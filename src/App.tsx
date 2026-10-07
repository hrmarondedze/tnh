import React, { useState, useEffect, useCallback } from "react";
import {
  Home,
  Compass,
  PlusSquare,
  Briefcase,
  User,
  MessageSquare,
  Bell,
  ShieldCheck,
  Heart,
  Bookmark,
  Share2,
  Flag,
  Trash2,
  Edit3,
  Send,
  LogOut,
  Users,
  Building2,
  CheckCircle2,
  X,
  Lock,
} from "lucide-react";
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, googleAuthProvider } from "./lib/firebase.ts";
import { ResilientImage } from "./components/ResilientImage.tsx";
import { OnboardingWizard } from "./components/OnboardingWizard.tsx";
import { OpportunitiesAndPlacementsView } from "./components/OpportunitiesAndPlacementsView.tsx";
import { ProfileAndPassportView } from "./components/ProfileAndPassportView.tsx";
import { AdminWorkspaceView } from "./components/AdminWorkspaceView.tsx";

const DEMO_PERSONA_LIST = [
  {
    key: "demo-student",
    label: "Tariro Moyo (Tourism Student)",
    sub: "Bulawayo · BSc Tourism & Hospitality",
  },
  {
    key: "demo-guide",
    label: "Farai Ndlovu (Working Safari Guide)",
    sub: "Hwange · Walking Safari & Supervisor",
  },
  {
    key: "demo-hospitality",
    label: "Nyasha Chikwanda (Hospitality Chef)",
    sub: "Nyanga · Sous Chef & Bush Dining",
  },
  {
    key: "demo-employer",
    label: "Kudzai Sibanda (Lodge Employer)",
    sub: "Victoria Falls · Zambezi Canopy Eco-Lodge",
  },
  {
    key: "demo-institution",
    label: "Dr. Chipo Mutasa (Training Institution)",
    sub: "Bulawayo · School of Hospitality Registrar",
  },
  {
    key: "demo-admin",
    label: "Tendai Gumbo (Platform Admin)",
    sub: "Harare · Governance & Verification Disputes",
  },
];

const PRESET_MEDIA_GALLERY = [
  {
    label: "Zambezi Canopy Eco-Lodge Veranda (Victoria Falls)",
    url: "/src/assets/images/vicfalls_lodge_safari_1791386419455.jpg",
  },
  {
    label: "Hwange Walking Safari & Track Interpretation",
    url: "/src/assets/images/hwange_safari_guiding_1791386430930.jpg",
  },
  {
    label: "Contemporary Zimbabwean Culinary Plating",
    url: "/src/assets/images/harare_culinary_plating_1791386442823.jpg",
  },
  {
    label: "Eastern Highlands Boutique Front-Office Reception",
    url: "/src/assets/images/nyanga_front_office_1791386453942.jpg",
  },
];

export default function App() {
  // Auth state (Token kept strictly in memory per Cloud SQL + Firebase Auth security rules; never stored in localStorage)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [activeDemoPersona, setActiveDemoPersona] = useState<string>("demo-student");
  const [authError, setAuthError] = useState<string | null>(null);

  // Navigation & View state
  const [activeNav, setActiveNav] = useState<
    "home" | "explore" | "create" | "opportunities" | "profile" | "admin"
  >("home");
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showMessagesDrawer, setShowMessagesDrawer] = useState(false);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const [selectedOrgModalId, setSelectedOrgModalId] = useState<number | null>(null);

  // Core Data state
  const [sessionData, setSessionData] = useState<any | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [feedView, setFeedView] = useState<"community" | "following">("community");
  const [feedPage, setFeedPage] = useState(1);
  const [feedData, setFeedData] = useState<{
    posts: any[];
    total: number;
    hasMore: boolean;
  }>({ posts: [], total: 0, hasMore: false });

  // Directory, Orgs, Opportunities, Applications & Placements
  const [membersList, setMembersList] = useState<any[]>([]);
  const [organisationsList, setOrganisationsList] = useState<any[]>([]);
  const [opportunitiesList, setOpportunitiesList] = useState<any[]>([]);
  const [applicationsList, setApplicationsList] = useState<any[]>([]);
  const [placementsList, setPlacementsList] = useState<any[]>([]);
  const [viewedProfileUserId, setViewedProfileUserId] = useState<number | null>(null);

  // Messaging & Notifications state
  const [messagesData, setMessagesData] = useState<{
    messages: any[];
    partners: any[];
  }>({ messages: [], partners: [] });
  const [activeChatPartnerId, setActiveChatPartnerId] = useState<number | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [notificationsList, setNotificationsList] = useState<any[]>([]);

  // Create Post Form state
  const [newPostForm, setNewPostForm] = useState({
    postType: "Work showcase",
    caption: "",
    mediaUrl: "/src/assets/images/nyanga_front_office_1791386453942.jpg",
    mediaType: "image",
    skillTagsText:
      "Guest Check-In & Concierge Protocol, Property Management Systems (PMS)",
    locationTag: "Victoria Falls, Zimbabwe",
    linkedPortfolioId: "",
    linkedPassportId: "",
    linkedOpportunityId: "",
  });

  // Comment & Edit Post state
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [reportingItem, setReportingItem] = useState<{
    targetType: string;
    targetId: number;
    title: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Listen to Firebase Auth state
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

  // Unified Authenticated API Fetch Helper
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

      const res = await fetch(url, {
        ...options,
        headers,
      });

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
      const [meRes, feedRes, oppsRes, appsRes, orgsRes, membersRes] =
        await Promise.all([
          apiFetch("/api/me"),
          apiFetch(`/api/posts?view=${feedView}&page=${feedPage}&limit=8`),
          apiFetch("/api/opportunities"),
          apiFetch("/api/applications"),
          apiFetch("/api/organisations"),
          apiFetch("/api/members"),
        ]);

      setSessionData(meRes);
      setFeedData(feedRes);
      setOpportunitiesList(oppsRes.opportunities || []);
      setApplicationsList(appsRes.applications || []);
      setPlacementsList(appsRes.placements || []);
      setOrganisationsList(orgsRes.organisations || []);
      setMembersList(membersRes.members || []);

      if (!viewedProfileUserId && meRes.user?.id) {
        setViewedProfileUserId(meRes.user.id);
      }
    } catch (error: any) {
      console.error("Error loading TourBridge state:", error);
      setAuthError(error.message);
    } finally {
      setLoadingSession(false);
    }
  }, [apiFetch, feedView, feedPage, viewedProfileUserId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const loadMessagesAndNotifications = async () => {
    try {
      const [msgRes, notifRes] = await Promise.all([
        apiFetch("/api/messages"),
        apiFetch("/api/notifications"),
      ]);
      setMessagesData(msgRes);
      setNotificationsList(notifRes.notifications || []);
      if (!activeChatPartnerId && msgRes.partners?.length > 0) {
        setActiveChatPartnerId(msgRes.partners[0].id);
      }
    } catch (err) {
      console.error("Failed loading messages/notifications:", err);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      setIdToken(token);
      setViewedProfileUserId(null);
    } catch (err: any) {
      setAuthError(err.message || "Google Sign-In was cancelled or blocked.");
    }
  };

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    setIdToken(null);
    setActiveDemoPersona("demo-student");
    setViewedProfileUserId(null);
  };

  const handleSwitchDemoPersona = (personaKey: string) => {
    setActiveDemoPersona(personaKey);
    setViewedProfileUserId(null);
    if (personaKey === "demo-admin") {
      setActiveNav("admin");
    } else if (activeNav === "admin") {
      setActiveNav("home");
    }
  };

  const handleSaveOnboarding = async (payload: any, completed: boolean) => {
    await apiFetch("/api/onboarding", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    await loadAllData();
    if (completed) {
      setShowOnboardingModal(false);
      setToastMessage("Adaptive onboarding saved and career recommendations updated.");
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/posts", {
        method: "POST",
        body: JSON.stringify({
          postType: newPostForm.postType,
          caption: newPostForm.caption,
          mediaUrl: newPostForm.mediaUrl,
          mediaType: newPostForm.mediaType,
          skillTags: newPostForm.skillTagsText
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          locationTag: newPostForm.locationTag,
          linkedOpportunityId: newPostForm.linkedOpportunityId
            ? Number(newPostForm.linkedOpportunityId)
            : null,
          linkedPassportId: newPostForm.linkedPassportId
            ? Number(newPostForm.linkedPassportId)
            : null,
        }),
      });
      setNewPostForm({ ...newPostForm, caption: "" });
      setToastMessage(
        "Post published to the community feed! (Note: Claiming a skill in a post does not automatically verify that skill in your Talent Passport.)"
      );
      await loadAllData();
      setActiveNav("home");
    } catch (err: any) {
      setToastMessage(err.message);
    }
  };

  const handleInteractPost = async (postId: number, interactionType: "like" | "save") => {
    await apiFetch(`/api/posts/${postId}/interact`, {
      method: "POST",
      body: JSON.stringify({ interactionType }),
    });
    await loadAllData();
  };

  const handleAddComment = async (postId: number) => {
    const content = commentInputs[postId];
    if (!content || !content.trim()) return;
    await apiFetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    setCommentInputs({ ...commentInputs, [postId]: "" });
    await loadAllData();
  };

  const handleSavePostEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    await apiFetch(`/api/posts/${editingPost.id}`, {
      method: "PUT",
      body: JSON.stringify({
        caption: editingPost.caption,
        postType: editingPost.postType,
        locationTag: editingPost.locationTag,
      }),
    });
    setEditingPost(null);
    await loadAllData();
  };

  const handleDeletePost = async (postId: number) => {
    await apiFetch(`/api/posts/${postId}`, { method: "DELETE" });
    setToastMessage("Post deleted.");
    await loadAllData();
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingItem) return;
    await apiFetch("/api/reports", {
      method: "POST",
      body: JSON.stringify({
        targetType: reportingItem.targetType,
        targetId: reportingItem.targetId,
        reason: reportReason,
        details: `Reported item: ${reportingItem.title}`,
      }),
    });
    setReportingItem(null);
    setReportReason("");
    setToastMessage("Report submitted to Platform Administration.");
  };

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
      await loadMessagesAndNotifications();
    } catch (err: any) {
      setToastMessage(err.message);
    }
  };

  const currentUser = sessionData?.user;
  const myMemberships = sessionData?.memberships || [];
  const myPassportRecords = sessionData?.metrics?.records || [];
  const dataSaverMode = Boolean(currentUser?.dataSaverMode);

  // If user is authenticated via Google and hasn't completed onboarding yet, show wizard
  if (
    currentUser &&
    (!currentUser.onboardingCompleted || showOnboardingModal)
  ) {
    return (
      <OnboardingWizard
        user={currentUser}
        onSaveOnboarding={handleSaveOnboarding}
        onClose={() => setShowOnboardingModal(false)}
      />
    );
  }

  const selectedOrg = organisationsList.find((o) => o.id === selectedOrgModalId);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#14241B] flex flex-col">
      {/* =====================================================================
          TOP BAR CONTRACT (Strictly 3 Zones: Brand Wordmark | 5 Nav Links | 2 Actions)
          Mobile sticky height <= 56px to respect 15% aggregate sticky cap
      ===================================================================== */}
      <header className="sticky top-0 z-30 h-14 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E6E0D3] px-4 lg:px-8 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            setActiveNav("home");
          }}
          className="text-lg font-display font-bold tracking-tight text-[#163A2B] whitespace-nowrap"
        >
          TourBridge
        </a>

        {/* Zone 2: 5 single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#4A5B50]"
        >
          {[
            { id: "home", label: "Home" },
            { id: "explore", label: "Explore" },
            { id: "create", label: "Create" },
            { id: "opportunities", label: "Opportunities" },
            {
              id: "profile",
              label: "Profile",
              onClick: () => {
                if (currentUser?.id) setViewedProfileUserId(currentUser.id);
                setActiveNav("profile");
              },
            },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={
                item.onClick
                  ? item.onClick
                  : () => setActiveNav(item.id as any)
              }
              className={`py-1 transition-colors whitespace-nowrap ${
                activeNav === item.id
                  ? "text-[#163A2B] font-semibold underline underline-offset-8 decoration-2 decoration-[#B8860B]"
                  : "hover:text-[#14241B]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 2 Header Actions (Messages & Notifications as required by spec) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Messages"
            onClick={() => {
              loadMessagesAndNotifications();
              setShowMessagesDrawer(true);
            }}
            className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-medium text-[#14241B] hover:bg-[#F1ECE1] rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <MessageSquare className="w-4 h-4 text-[#163A2B]" />
            <span className="hidden sm:inline">Messages</span>
            {(sessionData?.unreadMessagesCount || 0) > 0 && (
              <span className="font-mono-tabular font-bold text-[#B8860B]">
                ({sessionData.unreadMessagesCount})
              </span>
            )}
          </button>

          <button
            type="button"
            aria-label="Notifications"
            onClick={async () => {
              await loadMessagesAndNotifications();
              setShowNotificationsDrawer(true);
              await apiFetch("/api/notifications/read-all", { method: "POST" });
              await loadAllData();
            }}
            className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-medium text-[#14241B] hover:bg-[#F1ECE1] rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Bell className="w-4 h-4 text-[#163A2B]" />
            <span className="hidden sm:inline">Notifications</span>
            {(sessionData?.unreadNotificationsCount || 0) > 0 && (
              <span className="font-mono-tabular font-bold text-[#B8860B]">
                ({sessionData.unreadNotificationsCount})
              </span>
            )}
          </button>
        </div>
      </header>

      {/* =====================================================================
          MAIN DESKTOP & MOBILE WORKSPACE (Persistent Desktop Sidebar + Main Canvas)
      ===================================================================== */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto flex flex-col lg:flex-row gap-6 px-4 lg:px-8 py-6 pb-24 lg:pb-12">
        {/* PERSISTENT DESKTOP NAVIGATION & DEMO PERSONA SIDEBAR */}
        <aside className="w-full lg:w-72 shrink-0 space-y-5">
          {/* Desktop Persistent Navigation */}
          <div className="hidden lg:block bg-white border border-[#E6E0D3] rounded-2xl p-4 space-y-1">
            <p className="text-xs font-semibold text-[#4A5B50] px-3 pb-2">
              Workspace Navigation
            </p>
            {[
              { id: "home", label: "Home Feed", icon: Home },
              { id: "explore", label: "Explore Community", icon: Compass },
              { id: "create", label: "Publish Work / Post", icon: PlusSquare },
              {
                id: "opportunities",
                label: "Opportunities & Placements",
                icon: Briefcase,
              },
              {
                id: "profile",
                label: "My Profile & Talent Passport",
                icon: User,
                onClick: () => {
                  if (currentUser?.id) setViewedProfileUserId(currentUser.id);
                  setActiveNav("profile");
                },
              },
            ].map((nav) => {
              const Icon = nav.icon;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={
                    nav.onClick
                      ? nav.onClick
                      : () => setActiveNav(nav.id as any)
                  }
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] text-xs font-medium rounded-xl transition-colors whitespace-nowrap ${
                    activeNav === nav.id
                      ? "bg-[#163A2B] text-[#FAF7F2]"
                      : "text-[#14241B] hover:bg-[#F1ECE1]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{nav.label}</span>
                </button>
              );
            })}

            {currentUser?.platformRole === "admin" && (
              <button
                type="button"
                onClick={() => setActiveNav("admin")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] text-xs font-medium rounded-xl transition-colors whitespace-nowrap ${
                  activeNav === "admin"
                    ? "bg-[#B8860B] text-white"
                    : "text-[#8A6200] hover:bg-[#F1ECE1]"
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="truncate">Administrator Workspace</span>
              </button>
            )}
          </div>

          {/* Active Account & Fictional Demo Account Switcher */}
          <div className="bg-white border border-[#E6E0D3] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#163A2B]">
                Active Session & Demo Switcher
              </span>
              {currentUser?.platformRole === "admin" && (
                <button
                  type="button"
                  onClick={() => setActiveNav("admin")}
                  className="lg:hidden text-xs font-semibold text-[#8A6200] underline"
                >
                  Open Admin
                </button>
              )}
            </div>

            {currentUser && (
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E6E0D3] text-xs space-y-1">
                <p className="font-semibold text-[#14241B]">{currentUser.name}</p>
                <p className="text-[#4A5B50]">
                  {currentUser.careerStage} · {currentUser.location}
                </p>
                <p className="font-mono-tabular text-[#163A2B] font-medium">
                  Confirmed Hours:{" "}
                  {sessionData?.metrics?.confirmedPracticalHours || 0} hrs · Assessed
                  Skills: {sessionData?.metrics?.assessedSkills?.length || 0}
                </p>
                <div className="pt-1.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOnboardingModal(true)}
                    className="text-[11px] text-[#163A2B] underline hover:no-underline"
                  >
                    Adaptive Questionnaire
                  </button>
                </div>
              </div>
            )}

            {/* Fictional Demo Persona Switcher (For testing complete student -> employer -> institution -> admin workflows) */}
            {!firebaseUser && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-[#4A5B50]">
                  Switch Fictional Demo Account (Tests RBAC & Verification):
                </label>
                <div className="space-y-1">
                  {DEMO_PERSONA_LIST.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleSwitchDemoPersona(p.key)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors border ${
                        activeDemoPersona === p.key
                          ? "bg-[#163A2B] text-white border-[#163A2B]"
                          : "bg-white text-[#14241B] border-[#E6E0D3] hover:bg-[#F1ECE1]"
                      }`}
                    >
                      <span className="font-semibold block truncate">{p.label}</span>
                      <span
                        className={`text-[10px] block truncate ${
                          activeDemoPersona === p.key
                            ? "text-[#FAF7F2]/80"
                            : "text-[#4A5B50]"
                        }`}
                      >
                        {p.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Google Sign-In / Sign-Out */}
            <div className="pt-2 border-t border-[#E6E0D3]">
              {firebaseUser ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-2 px-3 min-h-[40px] text-xs font-medium text-[#9E2A2B] border border-[#9E2A2B]/30 rounded-xl hover:bg-[#9E2A2B]/5 flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out ({firebaseUser.email})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-2.5 px-3 min-h-[44px] text-xs font-medium bg-[#14241B] text-white rounded-xl hover:bg-[#163A2B] transition-colors"
                >
                  Sign In / Register with Google
                </button>
              )}
              {authError && (
                <p className="text-[11px] text-[#9E2A2B] mt-1.5">{authError}</p>
              )}
            </div>
          </div>
        </aside>

        {/* ===================================================================
            MAIN CONTENT AREA
        =================================================================== */}
        <main className="flex-1 min-w-0 space-y-6">
          {toastMessage && (
            <div className="p-3.5 rounded-xl bg-[#163A2B] text-[#FAF7F2] text-xs flex items-center justify-between shadow-sm">
              <span>{toastMessage}</span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="underline ml-4 whitespace-nowrap"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* VIEW 1: HOME FEED */}
          {activeNav === "home" && (
            <div className="space-y-6">
              {/* Central Journey Guided Banner */}
              <div className="bg-white border border-[#E6E0D3] rounded-2xl p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-[#163A2B]">
                      Zimbabwe Tourism Community & Verified Career Platform
                    </span>
                    <h1 className="text-xl sm:text-2xl font-display font-semibold text-[#14241B] mt-0.5">
                      Create profile → share work → discover opportunity → complete
                      assignment → receive verified experience
                    </h1>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveNav("opportunities")}
                    className="px-4 py-2 min-h-[44px] bg-[#163A2B] text-[#FAF7F2] text-xs font-medium rounded-xl hover:bg-[#1E4D38] transition-colors shrink-0 whitespace-nowrap"
                  >
                    Explore Placements ({opportunitiesList.length})
                  </button>
                </div>

                {/* Feed View Filter Controls (Interactive functional buttons) */}
                <div className="flex items-center justify-between pt-3 border-t border-[#E6E0D3]">
                  <div className="flex items-center gap-1 p-1 bg-[#F1ECE1] rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setFeedView("community");
                        setFeedPage(1);
                      }}
                      className={`px-3.5 py-1.5 min-h-[36px] text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                        feedView === "community"
                          ? "bg-white text-[#14241B] shadow-sm"
                          : "text-[#4A5B50] hover:text-[#14241B]"
                      }`}
                    >
                      Tourism Community View
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFeedView("following");
                        setFeedPage(1);
                      }}
                      className={`px-3.5 py-1.5 min-h-[36px] text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                        feedView === "following"
                          ? "bg-white text-[#14241B] shadow-sm"
                          : "text-[#4A5B50] hover:text-[#14241B]"
                      }`}
                    >
                      Following View
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveNav("create")}
                    className="px-3.5 py-2 min-h-[40px] text-xs font-medium border border-[#163A2B] text-[#163A2B] rounded-xl hover:bg-[#163A2B]/5 whitespace-nowrap"
                  >
                    + Share Work Showcase
                  </button>
                </div>
              </div>

              {/* Chronological Feed Posts */}
              {loadingSession ? (
                <div className="bg-white border border-[#E6E0D3] rounded-2xl p-8 text-center text-xs text-[#4A5B50]">
                  Loading chronological tourism feed...
                </div>
              ) : feedData.posts.length === 0 ? (
                <div className="bg-white border border-[#E6E0D3] rounded-2xl p-8 text-center space-y-2">
                  <p className="text-sm font-medium text-[#14241B]">
                    No posts in this feed view yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFeedView("community")}
                    className="px-4 py-2 text-xs font-medium bg-[#163A2B] text-white rounded-xl"
                  >
                    Switch to Tourism Community View
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {feedData.posts.map((post) => {
                    const isAuthor = post.author?.id === currentUser?.id;
                    return (
                      <article
                        key={post.id}
                        className="bg-white border border-[#E6E0D3] rounded-2xl overflow-hidden"
                      >
                        {/* Author Header */}
                        <div className="p-4 sm:p-5 flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setViewedProfileUserId(post.author.id);
                                setActiveNav("profile");
                              }}
                              className="shrink-0"
                            >
                              <ResilientImage
                                src={post.author?.avatarUrl}
                                alt={post.author?.name || "Author"}
                                dataSaverMode={dataSaverMode}
                                className="w-11 h-11 rounded-xl object-cover border border-[#E6E0D3]"
                              />
                            </button>
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setViewedProfileUserId(post.author.id);
                                  setActiveNav("profile");
                                }}
                                className="text-sm font-semibold text-[#14241B] hover:underline text-left"
                              >
                                {post.author?.name}
                              </button>
                              {/* Zero-Pill Metadata Discipline: Clean unboxed text with · separators */}
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#4A5B50]">
                                <span className="font-medium text-[#163A2B]">
                                  {post.postType}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{post.author?.careerStage}</span>
                                {post.locationTag && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>{post.locationTag}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {isAuthor && (
                              <>
                                <button
                                  type="button"
                                  aria-label="Edit Post"
                                  onClick={() => setEditingPost(post)}
                                  className="p-2 min-h-[40px] min-w-[40px] text-[#4A5B50] hover:text-[#14241B] rounded-lg"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Delete Post"
                                  onClick={() => handleDeletePost(post.id)}
                                  className="p-2 min-h-[40px] min-w-[40px] text-[#9E2A2B] hover:bg-[#9E2A2B]/5 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {!isAuthor && (
                              <button
                                type="button"
                                aria-label="Report Post"
                                onClick={() =>
                                  setReportingItem({
                                    targetType: "post",
                                    targetId: post.id,
                                    title: post.caption.slice(0, 50),
                                  })
                                }
                                className="p-2 min-h-[40px] min-w-[40px] text-[#4A5B50] hover:text-[#9E2A2B] rounded-lg"
                              >
                                <Flag className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Visual Media (Lazy-loaded, no video autoplay) */}
                        {post.mediaUrl && (
                          <div className="border-y border-[#E6E0D3]">
                            {post.mediaType === "video" ? (
                              <video
                                src={post.mediaUrl}
                                controls
                                preload="none"
                                className="w-full max-h-[440px] bg-black"
                              />
                            ) : (
                              <ResilientImage
                                src={post.mediaUrl}
                                alt={post.caption}
                                dataSaverMode={dataSaverMode}
                                className="w-full max-h-[440px] object-cover"
                              />
                            )}
                          </div>
                        )}

                        {/* Caption, Skill Tags & Linked Career Evidence */}
                        <div className="p-4 sm:p-5 space-y-3">
                          <p className="text-sm text-[#14241B] leading-relaxed">
                            {post.caption}
                          </p>

                          {(post.skillTags || []).length > 0 && (
                            <div className="text-xs text-[#4A5B50]">
                              <strong className="text-[#14241B]">
                                Tagged Tourism Skills (Self-declared on post):
                              </strong>{" "}
                              {post.skillTags.join(" · ")}
                            </div>
                          )}

                          {/* Linked Opportunity or Talent Passport Record */}
                          {(post.linkedOpportunityId || post.linkedPassportId) && (
                            <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E6E0D3] flex items-center justify-between text-xs">
                              <div>
                                {post.linkedOpportunityId && (
                                  <span className="text-[#163A2B] font-medium">
                                    Linked to an Open Tourism Opportunity
                                  </span>
                                )}
                                {post.linkedPassportId && !post.linkedOpportunityId && (
                                  <span className="text-[#163A2B] font-medium">
                                    Linked to a Talent Passport Record
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (post.linkedOpportunityId) {
                                    setActiveNav("opportunities");
                                  } else {
                                    setViewedProfileUserId(post.author.id);
                                    setActiveNav("profile");
                                  }
                                }}
                                className="underline font-medium text-[#163A2B]"
                              >
                                View Linked Record
                              </button>
                            </div>
                          )}

                          {/* Action Bar (Likes, Saves, Internal Share) */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#E6E0D3]">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleInteractPost(post.id, "like")}
                                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
                                  post.likedByMe
                                    ? "bg-[#163A2B] text-white"
                                    : "hover:bg-[#F1ECE1] text-[#14241B]"
                                }`}
                              >
                                <Heart className="w-4 h-4" />
                                <span className="font-mono-tabular">
                                  {post.likesCount}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleInteractPost(post.id, "save")}
                                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
                                  post.savedByMe
                                    ? "bg-[#B8860B] text-white"
                                    : "hover:bg-[#F1ECE1] text-[#14241B]"
                                }`}
                              >
                                <Bookmark className="w-4 h-4" />
                                <span className="font-mono-tabular">
                                  {post.savesCount}
                                </span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setToastMessage(
                                  `Internal link copied for ${post.author?.name}'s ${post.postType.toLowerCase()}.`
                                );
                              }}
                              className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium text-[#4A5B50] hover:bg-[#F1ECE1] flex items-center gap-1.5"
                            >
                              <Share2 className="w-4 h-4" />
                              <span>Share in TourBridge</span>
                            </button>
                          </div>

                          {/* Comments List & Input */}
                          <div className="pt-2 space-y-2">
                            {(post.comments || []).map((c: any) => (
                              <div
                                key={c.comment.id}
                                className="text-xs bg-[#FAF7F2] px-3 py-2 rounded-xl"
                              >
                                <strong className="text-[#14241B]">
                                  {c.author.name}:
                                </strong>{" "}
                                <span className="text-[#14241B]">
                                  {c.comment.content}
                                </span>
                              </div>
                            ))}

                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="text"
                                value={commentInputs[post.id] || ""}
                                onChange={(e) =>
                                  setCommentInputs({
                                    ...commentInputs,
                                    [post.id]: e.target.value,
                                  })
                                }
                                placeholder="Add a constructive industry comment..."
                                className="flex-1 px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl bg-[#FAF7F2]"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddComment(post.id)}
                                className="px-3.5 py-2 min-h-[38px] bg-[#163A2B] text-white text-xs font-medium rounded-xl hover:bg-[#1E4D38]"
                              >
                                Post
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between bg-white border border-[#E6E0D3] rounded-2xl p-4 text-xs">
                    <span>
                      Page <strong className="font-mono-tabular">{feedPage}</strong> ·
                      Total Posts:{" "}
                      <strong className="font-mono-tabular">{feedData.total}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={feedPage <= 1}
                        onClick={() => setFeedPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 border border-[#E6E0D3] rounded-lg disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={!feedData.hasMore}
                        onClick={() => setFeedPage((p) => p + 1)}
                        className="px-3 py-1.5 border border-[#E6E0D3] rounded-lg disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: EXPLORE COMMUNITY & ORGANISATIONS */}
          {activeNav === "explore" && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E6E0D3] rounded-2xl p-5">
                <h1 className="text-2xl font-display font-semibold text-[#14241B]">
                  Explore Zimbabwe's Tourism Community & Organisations
                </h1>
                <p className="text-xs text-[#4A5B50] mt-1">
                  Connect with students, working safari guides, chefs, approved lodges,
                  and hospitality training institutions.
                </p>
              </div>

              {/* Approved & Pending Organisations Directory */}
              <div className="space-y-3">
                <h2 className="text-lg font-display font-semibold text-[#14241B]">
                  Tourism Businesses & Training Institutions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {organisationsList.map((org) => (
                    <div
                      key={org.id}
                      className="bg-white border border-[#E6E0D3] rounded-2xl overflow-hidden flex flex-col"
                    >
                      <ResilientImage
                        src={org.bannerUrl}
                        alt={org.name}
                        dataSaverMode={dataSaverMode}
                        className="w-full h-36 object-cover"
                      />
                      <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="text-xs text-[#4A5B50]">
                            <span className="font-semibold text-[#163A2B]">
                              {org.orgType}
                            </span>
                            <span aria-hidden="true"> · </span>
                            <span>{org.location}</span>
                            <span aria-hidden="true"> · </span>
                            <span>Status: {org.verificationStatus}</span>
                          </div>
                          <h3 className="text-base font-display font-semibold text-[#14241B] mt-1">
                            {org.name}
                          </h3>
                          <p className="text-xs text-[#4A5B50] mt-1 line-clamp-2">
                            {org.description}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-[#E6E0D3] flex items-center justify-between">
                          <span className="text-[11px] text-[#4A5B50]">
                            {(org.servicesOrProgrammes || []).slice(0, 2).join(" · ")}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedOrgModalId(org.id)}
                            className="px-3 py-1.5 text-xs font-medium bg-[#163A2B] text-white rounded-lg hover:bg-[#1E4D38] whitespace-nowrap"
                          >
                            View Page
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tourism Members Directory (3-in-a-row desktop grid per reference) */}
              <div className="space-y-3">
                <h2 className="text-lg font-display font-semibold text-[#14241B]">
                  Tourism Students, Guides & Hospitality Professionals
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {membersList.map((m) => (
                    <div
                      key={m.id}
                      className="bg-white border border-[#E6E0D3] rounded-2xl p-5 flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <ResilientImage
                          src={m.avatarUrl}
                          alt={m.name}
                          dataSaverMode={dataSaverMode}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[#E6E0D3]"
                        />
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-[#14241B] truncate">
                            {m.name}
                          </h3>
                          <p className="text-xs text-[#163A2B] font-medium">
                            {m.careerStage}
                          </p>
                          <p className="text-[11px] text-[#4A5B50] truncate">
                            {m.location}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-[#14241B] line-clamp-2">{m.bio}</p>
                      <div className="pt-2 border-t border-[#E6E0D3] flex items-center justify-between">
                        <span className="text-[11px] text-[#4A5B50] truncate max-w-[140px]">
                          {(m.tourismInterests || []).join(" · ")}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setViewedProfileUserId(m.id);
                            setActiveNav("profile");
                          }}
                          className="px-3 py-1.5 text-xs font-medium border border-[#163A2B] text-[#163A2B] rounded-lg hover:bg-[#163A2B]/5 whitespace-nowrap"
                        >
                          Open Passport
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: CREATE / PUBLISH WORK SHOWCASE OR UPDATE */}
          {activeNav === "create" && (
            <div className="bg-white border border-[#E6E0D3] rounded-2xl p-6 space-y-5">
              <div>
                <h1 className="text-2xl font-display font-semibold text-[#14241B]">
                  Publish to the Tourism Community
                </h1>
                <p className="text-xs text-[#4A5B50] mt-0.5">
                  Share a Work Showcase, Learning Update, Achievement, or Industry Update.
                  Note: Claiming a skill in a post never automatically verifies that skill
                  in your Talent Passport.
                </p>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Post Type *
                    </label>
                    <select
                      value={newPostForm.postType}
                      onChange={(e) =>
                        setNewPostForm({ ...newPostForm, postType: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 text-xs border border-[#E6E0D3] rounded-xl bg-white"
                    >
                      <option value="Work showcase">Work showcase</option>
                      <option value="Learning update">Learning update</option>
                      <option value="Achievement">Achievement</option>
                      <option value="Industry update">Industry update</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Location Tag
                    </label>
                    <input
                      type="text"
                      value={newPostForm.locationTag}
                      onChange={(e) =>
                        setNewPostForm({ ...newPostForm, locationTag: e.target.value })
                      }
                      placeholder="e.g., Victoria Falls / Bulawayo / Hwange"
                      className="w-full px-3.5 py-2.5 text-xs border border-[#E6E0D3] rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Caption & Practical Reflection *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={newPostForm.caption}
                    onChange={(e) =>
                      setNewPostForm({ ...newPostForm, caption: e.target.value })
                    }
                    placeholder="Describe the hospitality task, guiding walk, culinary dish, or project you completed..."
                    className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1.5">
                    Select Visual Media (Or paste custom photo/video URL)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    {PRESET_MEDIA_GALLERY.map((img) => (
                      <button
                        key={img.url}
                        type="button"
                        onClick={() =>
                          setNewPostForm({
                            ...newPostForm,
                            mediaUrl: img.url,
                            mediaType: "image",
                          })
                        }
                        className={`p-1.5 rounded-xl border text-left transition-colors ${
                          newPostForm.mediaUrl === img.url
                            ? "border-[#163A2B] bg-[#163A2B]/5"
                            : "border-[#E6E0D3]"
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.label}
                          className="w-full h-16 object-cover rounded-lg mb-1"
                        />
                        <span className="text-[10px] text-[#14241B] line-clamp-1 block">
                          {img.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={newPostForm.mediaUrl}
                    onChange={(e) =>
                      setNewPostForm({ ...newPostForm, mediaUrl: e.target.value })
                    }
                    placeholder="Media path or URL..."
                    className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Tourism Skill Tags (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newPostForm.skillTagsText}
                      onChange={(e) =>
                        setNewPostForm({
                          ...newPostForm,
                          skillTagsText: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Link to an Open Opportunity (Optional)
                    </label>
                    <select
                      value={newPostForm.linkedOpportunityId}
                      onChange={(e) =>
                        setNewPostForm({
                          ...newPostForm,
                          linkedOpportunityId: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 text-xs border border-[#E6E0D3] rounded-xl bg-white"
                    >
                      <option value="">None</option>
                      {opportunitiesList.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 min-h-[44px] bg-[#163A2B] text-white text-xs font-medium rounded-xl hover:bg-[#1E4D38]"
                >
                  Publish to Feed
                </button>
              </form>
            </div>
          )}

          {/* VIEW 4: OPPORTUNITIES, APPLICATIONS & PRACTICAL PLACEMENTS */}
          {activeNav === "opportunities" && (
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
            />
          )}

          {/* VIEW 5: MEMBER PROFILE, PORTFOLIO, TALENT PASSPORT & CAREER JOURNEY */}
          {activeNav === "profile" && (
            <ProfileAndPassportView
              currentUser={currentUser}
              viewedUserId={viewedProfileUserId || currentUser?.id}
              myMemberships={myMemberships}
              allOrganisations={organisationsList}
              opportunities={opportunitiesList}
              dataSaverMode={dataSaverMode}
              apiFetch={apiFetch}
              onRefreshSession={loadAllData}
              onOpenOnboardingEdit={() => setShowOnboardingModal(true)}
              onNavigateTab={(tab) => setActiveNav(tab as any)}
              onOpenMessagingWithUser={async (targetUserId) => {
                await loadMessagesAndNotifications();
                setActiveChatPartnerId(targetUserId);
                setShowMessagesDrawer(true);
              }}
              onOpenOrgModal={(orgId) => setSelectedOrgModalId(orgId)}
            />
          )}

          {/* VIEW 6: ADMINISTRATOR WORKSPACE */}
          {activeNav === "admin" && (
            <AdminWorkspaceView
              apiFetch={apiFetch}
              onRefreshGlobal={loadAllData}
            />
          )}
        </main>
      </div>

      {/* =====================================================================
          MOBILE BOTTOM NAVIGATION BAR (5 Tabs: Home | Explore | Create | Opportunities | Profile)
      ===================================================================== */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-white/95 backdrop-blur-md border-t border-[#E6E0D3] grid grid-cols-5 items-center px-2"
      >
        {[
          { id: "home", label: "Home", icon: Home },
          { id: "explore", label: "Explore", icon: Compass },
          { id: "create", label: "Create", icon: PlusSquare },
          { id: "opportunities", label: "Opportunities", icon: Briefcase },
          {
            id: "profile",
            label: "Profile",
            icon: User,
            onClick: () => {
              if (currentUser?.id) setViewedProfileUserId(currentUser.id);
              setActiveNav("profile");
            },
          },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={
                item.onClick ? item.onClick : () => setActiveNav(item.id as any)
              }
              className={`min-h-[44px] flex flex-col items-center justify-center rounded-xl transition-colors ${
                active ? "text-[#163A2B] font-semibold" : "text-[#4A5B50]"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* =====================================================================
          MODAL: ORGANISATION PAGE (Business Info, Public Posts & Active Opportunities)
      ===================================================================== */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E0D3] rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E6E0D3] pb-3">
              <div>
                <span className="text-xs text-[#163A2B] font-semibold">
                  {selectedOrg.orgType} · {selectedOrg.location} · Status:{" "}
                  {selectedOrg.verificationStatus}
                </span>
                <h2 className="text-lg font-display font-semibold text-[#14241B]">
                  {selectedOrg.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrgModalId(null)}
                className="p-1 text-[#4A5B50]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ResilientImage
              src={selectedOrg.bannerUrl}
              alt={selectedOrg.name}
              dataSaverMode={dataSaverMode}
              className="w-full h-44 object-cover rounded-xl"
            />

            <p className="text-xs text-[#14241B] leading-relaxed">
              {selectedOrg.description}
            </p>

            <div className="text-xs text-[#4A5B50] space-y-1 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E6E0D3]">
              <div>
                <strong className="text-[#14241B]">Services & Programmes:</strong>{" "}
                {(selectedOrg.servicesOrProgrammes || []).join(" · ")}
              </div>
              <div>
                <strong className="text-[#14241B]">Contact:</strong>{" "}
                {selectedOrg.contactEmail} · {selectedOrg.contactPhone}
              </div>
              {selectedOrg.isDemo && (
                <div className="text-[#8A6200]">
                  Fictional Demo Organisation — Created for demonstration only.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-[#14241B]">
                Active Opportunities from {selectedOrg.name}
              </h3>
              {opportunitiesList
                .filter((o) => o.organisationId === selectedOrg.id)
                .map((opp) => (
                  <div
                    key={opp.id}
                    className="p-3 rounded-xl border border-[#E6E0D3] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[#14241B]">
                        {opp.title}
                      </span>
                      <span className="text-[#4A5B50] block">
                        {opp.opportunityType} · {opp.expectedHours} hrs ·{" "}
                        {opp.compensationType}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrgModalId(null);
                        setActiveNav("opportunities");
                      }}
                      className="px-3 py-1.5 bg-[#163A2B] text-white rounded-lg"
                    >
                      View & Apply
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          DRAWER: MESSAGES (Between accepted connections & applicant/employer staff)
      ===================================================================== */}
      {showMessagesDrawer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-md h-full p-5 flex flex-col justify-between border-l border-[#E6E0D3]">
            <div className="space-y-3 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between border-b border-[#E6E0D3] pb-3">
                <h2 className="text-base font-display font-semibold text-[#14241B]">
                  Direct Messages
                </h2>
                <button
                  type="button"
                  onClick={() => setShowMessagesDrawer(false)}
                  className="p-1 text-[#4A5B50]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-[11px] text-[#4A5B50]">
                Messaging is enabled between accepted connections and between opportunity
                applicants and employer representatives.
              </p>

              {/* Conversation Partners */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#E6E0D3]">
                {messagesData.partners.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveChatPartnerId(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap ${
                      activeChatPartnerId === p.id
                        ? "bg-[#163A2B] text-white"
                        : "bg-[#F1ECE1] text-[#14241B]"
                    }`}
                  >
                    {p.name.split(" ")[0]}
                  </button>
                ))}
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto space-y-2 py-2">
                {messagesData.messages
                  .filter(
                    (m: any) =>
                      m.senderId === activeChatPartnerId ||
                      m.receiverId === activeChatPartnerId
                  )
                  .slice()
                  .reverse()
                  .map((m: any) => {
                    const isMine = m.senderId === currentUser?.id;
                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl text-xs max-w-[85%] ${
                          isMine
                            ? "ml-auto bg-[#163A2B] text-white"
                            : "bg-[#FAF7F2] border border-[#E6E0D3] text-[#14241B]"
                        }`}
                      >
                        <p>{m.content}</p>
                      </div>
                    );
                  })}
              </div>
            </div>

            <form
              onSubmit={handleSendMessage}
              className="pt-3 border-t border-[#E6E0D3] flex items-center gap-2"
            >
              <input
                type="text"
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                placeholder="Write a message..."
                className="flex-1 px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
              />
              <button
                type="submit"
                className="px-4 py-2 min-h-[40px] bg-[#163A2B] text-white text-xs font-medium rounded-xl"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          DRAWER: NOTIFICATIONS
      ===================================================================== */}
      {showNotificationsDrawer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-md h-full p-5 flex flex-col border-l border-[#E6E0D3] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6E0D3] pb-3">
              <h2 className="text-base font-display font-semibold text-[#14241B]">
                Notifications
              </h2>
              <button
                type="button"
                onClick={() => setShowNotificationsDrawer(false)}
                className="p-1 text-[#4A5B50]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5">
              {notificationsList.length === 0 ? (
                <p className="text-xs text-[#4A5B50] text-center py-8">
                  No notifications yet.
                </p>
              ) : (
                notificationsList.map((n: any) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      setShowNotificationsDrawer(false);
                      if (n.linkTab) setActiveNav(n.linkTab as any);
                    }}
                    className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E6E0D3] text-xs space-y-1 cursor-pointer hover:border-[#163A2B]"
                  >
                    <span className="font-semibold text-[#163A2B] block">
                      {n.title}
                    </span>
                    <p className="text-[#14241B]">{n.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT POST */}
      {editingPost && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E0D3] rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-display font-semibold text-[#14241B]">
              Edit Post
            </h3>
            <form onSubmit={handleSavePostEdit} className="space-y-3">
              <textarea
                rows={4}
                value={editingPost.caption}
                onChange={(e) =>
                  setEditingPost({ ...editingPost, caption: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
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

      {/* MODAL: REPORT CONTENT */}
      {reportingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E0D3] rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-display font-semibold text-[#14241B]">
              Report to Platform Moderation
            </h3>
            <form onSubmit={handleSubmitReport} className="space-y-3">
              <input
                type="text"
                required
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Reason for report (e.g., Inaccurate claim, spam)..."
                className="w-full px-3 py-2 text-xs border border-[#E6E0D3] rounded-xl"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReportingItem(null)}
                  className="px-4 py-2 text-xs border border-[#E6E0D3] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#9E2A2B] text-white text-xs font-medium rounded-xl"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
