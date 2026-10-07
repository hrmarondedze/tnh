import React, { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Sparkles, Building2, Compass } from "lucide-react";
import { CURATED_CAREER_PATHWAYS } from "../constants/pathways.ts";

interface OnboardingWizardProps {
  user: any;
  onSaveOnboarding: (payload: any, completed: boolean) => Promise<void>;
  onClose?: () => void;
}

const CAREER_STAGES = [
  {
    id: "Exploring tourism careers",
    title: "Exploring tourism careers",
    desc: "Curious about guiding, hospitality, food, events or conservation and looking for a starting point.",
  },
  {
    id: "Currently studying",
    title: "Currently studying",
    desc: "Enrolled at a university, polytechnic, hotel school or vocational training programme.",
  },
  {
    id: "Intern or apprentice",
    title: "Intern or apprentice",
    desc: "Completing an industrial attachment, hotel rotation, or learner guide apprenticeship.",
  },
  {
    id: "Recently graduated",
    title: "Recently graduated",
    desc: "Completed a qualification and looking to build verified work experience or secure a role.",
  },
  {
    id: "Working professional",
    title: "Working professional",
    desc: "Active in safari guiding, front office, culinary arts, travel operations, events or marketing.",
  },
  {
    id: "Self-employed or running a tourism business",
    title: "Self-employed or running a tourism business",
    desc: "Independent tour guide, freelance chef, event planner, or boutique operator.",
  },
  {
    id: "Returning to work or changing careers",
    title: "Returning to work or changing careers",
    desc: "Bringing transferable experience into Zimbabwe's tourism and hospitality sector.",
  },
];

const ZIM_REGIONS = [
  "Victoria Falls, Matabeleland North",
  "Hwange, Matabeleland North",
  "Harare",
  "Bulawayo",
  "Nyanga / Mutare, Eastern Highlands",
  "Masvingo / Great Zimbabwe",
  "Kariba / Mana Pools, Zambezi Valley",
  "Gweru / Midlands",
];

const TOURISM_INTEREST_OPTIONS = [
  "Wildlife & Safari Guiding",
  "Hospitality & Front Office",
  "Food & Beverage / Culinary Arts",
  "Conservation-Related Tourism",
  "Events & MICE Coordination",
  "Tourism Digital Marketing",
  "Travel Agency & Itinerary Operations",
  "Cultural & Heritage Interpretation",
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  user,
  onSaveOnboarding,
  onClose,
}) => {
  const initialAnswers = user?.onboardingAnswers || {};
  const [step, setStep] = useState<number>(user?.onboardingStep || 1);
  const [saving, setSaving] = useState(false);

  // Step 1: Purpose
  const [accountPurpose, setAccountPurpose] = useState<string>(
    user?.accountPurpose || "career"
  );

  // Step 2: Career Stage
  const [careerStage, setCareerStage] = useState<string>(
    user?.careerStage || "Currently studying"
  );

  // Step 3: Branch-specific answers
  const [branchAnswers, setBranchAnswers] = useState<Record<string, any>>(initialAnswers);

  // Step 4: Shared preferences
  const [preferredName, setPreferredName] = useState<string>(
    user?.preferredName || user?.name?.split(" ")[0] || ""
  );
  const [location, setLocation] = useState<string>(
    user?.location || "Victoria Falls, Matabeleland North"
  );
  const [willingToRelocate, setWillingToRelocate] = useState<boolean>(
    user?.willingToRelocate ?? true
  );
  const [preferredLocations, setPreferredLocations] = useState<string[]>(
    Array.isArray(user?.preferredLocations) && user.preferredLocations.length > 0
      ? user.preferredLocations
      : ["Victoria Falls, Matabeleland North", "Hwange, Matabeleland North"]
  );
  const [tourismInterests, setTourismInterests] = useState<string[]>(
    Array.isArray(user?.tourismInterests) && user.tourismInterests.length > 0
      ? user.tourismInterests
      : ["Hospitality & Front Office", "Wildlife & Safari Guiding"]
  );
  const [immediateCareerGoal, setImmediateCareerGoal] = useState<string>(
    user?.immediateCareerGoal ||
      "Gain confirmed practical hours and verified competency assessments"
  );
  const [selectedPathwayId, setSelectedPathwayId] = useState<string>(
    user?.selectedPathwayId || "front-office"
  );
  const [opportunityTypes, setOpportunityTypes] = useState<string[]>(
    Array.isArray(user?.opportunityTypes) && user.opportunityTypes.length > 0
      ? user.opportunityTypes
      : ["Internship", "Skill2Shift"]
  );
  const [availability, setAvailability] = useState<string>(
    user?.availability || "Flexible / Weekends & Attachments"
  );
  const [profileVisibility, setProfileVisibility] = useState<string>(
    user?.profileVisibility || "public"
  );
  const [employerDiscoverable, setEmployerDiscoverable] = useState<boolean>(
    user?.employerDiscoverable ?? true
  );
  const [bio, setBio] = useState<string>(user?.bio || "");

  // Organisation onboarding branch state
  const [orgSetup, setOrgSetup] = useState({
    name: "",
    orgType:
      accountPurpose === "institution" ? "Training Institution" : "Lodge / Camp",
    roleInOrg: "",
    location: "Victoria Falls, Matabeleland North",
    contactEmail: user?.email || "",
    contactPhone: "",
    website: "",
    description: "",
    servicesOrProgrammesText: "",
    verificationEvidenceNote: "",
  });

  useEffect(() => {
    if (accountPurpose === "institution") {
      setOrgSetup((prev) => ({ ...prev, orgType: "Training Institution" }));
    }
  }, [accountPurpose]);

  const updateBranch = (key: string, val: any) => {
    setBranchAnswers((prev) => ({ ...prev, [key]: val }));
  };

  // When career stage changes, remove stale branch answers from active recommendations
  const handleSelectCareerStage = (newStage: string) => {
    setCareerStage(newStage);
    setBranchAnswers({
      purpose: accountPurpose,
      careerStage: newStage,
    });
    if (newStage === "Currently studying") {
      setSelectedPathwayId("front-office");
      setOpportunityTypes(["Internship", "Skill2Shift"]);
    } else if (newStage === "Intern or apprentice") {
      setOpportunityTypes(["Apprenticeship", "Skill2Shift"]);
    } else if (newStage === "Working professional") {
      setSelectedPathwayId("safari-guide");
      setOpportunityTypes(["Job", "Skill2Shift"]);
    }
  };

  const toggleItem = (list: string[], item: string, setter: (v: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  const totalSteps = accountPurpose === "career" ? 5 : 3;

  const handleSaveStep = async (nextStep: number, markComplete = false) => {
    setSaving(true);
    try {
      const payload: any = {
        step: nextStep,
        completed: markComplete,
        accountPurpose,
        careerStage,
        onboardingAnswers: branchAnswers,
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
      };

      if (
        markComplete &&
        (accountPurpose === "business" ||
          accountPurpose === "institution" ||
          branchAnswers.wantsOrgSetup) &&
        orgSetup.name.trim()
      ) {
        payload.organisationSetup = {
          ...orgSetup,
          servicesOrProgrammes: orgSetup.servicesOrProgrammesText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        };
      }

      await onSaveOnboarding(payload, markComplete);
      if (!markComplete) {
        setStep(nextStep);
      } else if (onClose) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white border border-[#E6E0D3] rounded-2xl p-6 sm:p-8 shadow-sm">
        {/* Progress bar & Header */}
        <div className="flex items-center justify-between border-b border-[#E6E0D3] pb-4 mb-6">
          <div>
            <p className="text-xs font-medium text-[#4A5B50]">
              Adaptive Onboarding · Step {step} of {totalSteps}
            </p>
            <h2 className="text-xl sm:text-2xl font-display font-semibold text-[#14241B] mt-0.5">
              {step === 1 && "How would you like to use TourBridge?"}
              {step === 2 &&
                accountPurpose === "career" &&
                "Where are you in your tourism journey?"}
              {step === 2 &&
                accountPurpose !== "career" &&
                "Register your organisation or institution"}
              {step === 3 &&
                accountPurpose === "career" &&
                `Tell us about your ${careerStage.toLowerCase()} stage`}
              {step === 3 &&
                accountPurpose !== "career" &&
                "Confirm organisation & representative profile"}
              {step === 4 && "Your career preferences & visibility"}
              {step === 5 && "Review & personalise your TourBridge experience"}
            </h2>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={() => handleSaveStep(step, false).then(onClose)}
              className="px-3 py-2 min-h-[44px] text-xs font-medium text-[#4A5B50] hover:text-[#14241B] border border-[#E6E0D3] rounded-lg transition-colors whitespace-nowrap"
            >
              Save & Resume Later
            </button>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="w-full bg-[#F1ECE1] h-2 rounded-full mb-6 overflow-hidden">
          <div
            className="bg-[#163A2B] h-full transition-transform duration-200 origin-left"
            style={{ transform: `scaleX(${step / totalSteps})` }}
          />
        </div>

        {/* STEP 1: IDENTIFY PURPOSE */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-[#4A5B50]">
              Select your primary starting purpose. You can always add an organisation
              role later without creating another account.
            </p>

            <div className="space-y-3">
              {[
                {
                  id: "career",
                  title: "Build my tourism career",
                  desc: "Share work, record skills in your Talent Passport, find placements or jobs, and earn verified experience.",
                },
                {
                  id: "business",
                  title: "Recruit or represent a tourism business",
                  desc: "Showcase your lodge, hotel, tour operator or agency, publish opportunities, and confirm completed placements.",
                },
                {
                  id: "institution",
                  title: "Represent a training institution",
                  desc: "Represent a university, hotel school or vocational centre, verify student qualifications, and support industrial attachments.",
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAccountPurpose(opt.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    accountPurpose === opt.id
                      ? "border-[#163A2B] bg-[#163A2B]/5"
                      : "border-[#E6E0D3] hover:border-[#163A2B]/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#14241B] text-base">
                      {opt.title}
                    </span>
                    {accountPurpose === opt.id && (
                      <Check className="w-5 h-5 text-[#163A2B]" />
                    )}
                  </div>
                  <p className="text-xs text-[#4A5B50] mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveStep(2, false)}
                className="px-5 py-2.5 min-h-[44px] bg-[#163A2B] text-[#FAF7F2] text-sm font-medium rounded-xl hover:bg-[#1E4D38] transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 (CAREER): IDENTIFY CURRENT CAREER STAGE */}
        {step === 2 && accountPurpose === "career" && (
          <div className="space-y-4">
            <p className="text-sm text-[#4A5B50]">
              Career stage is an editable profile attribute used to tailor your career
              guidance and checklist—it never restricts your account permissions.
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              {CAREER_STAGES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleSelectCareerStage(st.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                    careerStage === st.id
                      ? "border-[#163A2B] bg-[#163A2B]/5"
                      : "border-[#E6E0D3] hover:border-[#163A2B]/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#14241B]">
                      {st.title}
                    </span>
                    {careerStage === st.id && (
                      <Check className="w-4 h-4 text-[#163A2B]" />
                    )}
                  </div>
                  <p className="text-xs text-[#4A5B50] mt-0.5">{st.desc}</p>
                </button>
              ))}
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 min-h-[44px] text-sm font-medium text-[#14241B] border border-[#E6E0D3] rounded-xl hover:bg-[#F1ECE1] transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveStep(3, false)}
                className="px-5 py-2.5 min-h-[44px] bg-[#163A2B] text-[#FAF7F2] text-sm font-medium rounded-xl hover:bg-[#1E4D38] transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 (ORG/INSTITUTION): ORGANISATION ONBOARDING */}
        {step === 2 && accountPurpose !== "career" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#F1ECE1] border border-[#E6E0D3] text-xs text-[#4A5B50]">
              <strong className="text-[#14241B]">Privacy & Approval Note:</strong> Your
              organisation will be saved as <strong>Pending</strong> until administrator
              approval. Verification notes remain strictly private and are only visible to
              platform administrators.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Organisation Name *
                </label>
                <input
                  type="text"
                  value={orgSetup.name}
                  onChange={(e) => setOrgSetup({ ...orgSetup, name: e.target.value })}
                  placeholder="e.g., Matobo Hills Safari Camp"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E6E0D3] rounded-xl bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Organisation Type *
                </label>
                <select
                  value={orgSetup.orgType}
                  onChange={(e) => setOrgSetup({ ...orgSetup, orgType: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E6E0D3] rounded-xl bg-white"
                >
                  <option value="Lodge / Camp">Lodge / Camp</option>
                  <option value="Hotel / Resort">Hotel / Resort</option>
                  <option value="Tour Operator">Tour Operator</option>
                  <option value="Travel Agency">Travel Agency</option>
                  <option value="Training Institution">Training Institution</option>
                  <option value="Conservation Partner">Conservation Partner</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Your Role in the Organisation *
                </label>
                <input
                  type="text"
                  value={orgSetup.roleInOrg}
                  onChange={(e) =>
                    setOrgSetup({ ...orgSetup, roleInOrg: e.target.value })
                  }
                  placeholder="e.g., General Manager / Academic Registrar"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E6E0D3] rounded-xl bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Business Location (Town / Region) *
                </label>
                <input
                  type="text"
                  value={orgSetup.location}
                  onChange={(e) => setOrgSetup({ ...orgSetup, location: e.target.value })}
                  placeholder="e.g., Victoria Falls, Zimbabwe"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E6E0D3] rounded-xl bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Official Contact Email *
                </label>
                <input
                  type="email"
                  value={orgSetup.contactEmail}
                  onChange={(e) =>
                    setOrgSetup({ ...orgSetup, contactEmail: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E6E0D3] rounded-xl bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Contact Phone (Public on Org Page)
                </label>
                <input
                  type="text"
                  value={orgSetup.contactPhone}
                  onChange={(e) =>
                    setOrgSetup({ ...orgSetup, contactPhone: e.target.value })
                  }
                  placeholder="+263 ..."
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E6E0D3] rounded-xl bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#14241B] mb-1">
                Description & Relevant Services or Programmes (Public)
              </label>
              <textarea
                rows={3}
                value={orgSetup.description}
                onChange={(e) =>
                  setOrgSetup({ ...orgSetup, description: e.target.value })
                }
                placeholder="Describe your hospitality operations, safari programmes, or accredited courses..."
                className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#14241B] mb-1">
                Evidence for Organisation Verification (Private — Admin Only)
              </label>
              <textarea
                rows={2}
                value={orgSetup.verificationEvidenceNote}
                onChange={(e) =>
                  setOrgSetup({
                    ...orgSetup,
                    verificationEvidenceNote: e.target.value,
                  })
                }
                placeholder="Provide ZTA operator registration reference, institutional charter number, or trade license details..."
                className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl bg-white"
              />
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 min-h-[44px] text-sm font-medium text-[#14241B] border border-[#E6E0D3] rounded-xl hover:bg-[#F1ECE1] transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveStep(3, false)}
                className="px-5 py-2.5 min-h-[44px] bg-[#163A2B] text-[#FAF7F2] text-sm font-medium rounded-xl hover:bg-[#1E4D38] transition-colors flex items-center gap-2"
              >
                <span>Continue to Summary</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 (CAREER): ADAPTIVE FOLLOW-UP QUESTIONS BY STAGE */}
        {step === 3 && accountPurpose === "career" && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-[#F1ECE1] text-xs text-[#4A5B50]">
              All questions on this screen are <strong>self-declared</strong> and help
              personalise your career guidance. Optional questions can be skipped. They
              do not create verified skills automatically.
            </div>

            {/* Branch A: Exploring tourism careers */}
            {careerStage === "Exploring tourism careers" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1.5">
                    Preferred type of tourism work (Used for recommendations)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["People & Guest Service", "Food & Culinary", "Wildlife & Nature", "Technology & Digital", "Events & Festivals", "Business Operations"].map(
                      (w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => updateBranch("preferredWorkFocus", w)}
                          className={`px-3 py-2 text-xs rounded-xl border transition-colors ${
                            branchAnswers.preferredWorkFocus === w
                              ? "bg-[#163A2B] text-white border-[#163A2B]"
                              : "bg-white text-[#14241B] border-[#E6E0D3]"
                          }`}
                        >
                          {w}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Highest education level (Optional — Private)
                  </label>
                  <input
                    type="text"
                    value={branchAnswers.educationLevel || ""}
                    onChange={(e) => updateBranch("educationLevel", e.target.value)}
                    placeholder="e.g., O-Level, A-Level, National Certificate, or Exploring"
                    className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Any previous customer service, volunteer or practical experience? (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={branchAnswers.previousExperience || ""}
                    onChange={(e) => updateBranch("previousExperience", e.target.value)}
                    placeholder="No institution, employer or certificate is required..."
                    className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    What do you want next?
                  </label>
                  <select
                    value={branchAnswers.whatNext || "Career guidance & practical exposure"}
                    onChange={(e) => updateBranch("whatNext", e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E6E0D3] rounded-xl bg-white"
                  >
                    <option value="Career guidance & practical exposure">
                      Career guidance & practical exposure
                    </option>
                    <option value="Vocational training or hospitality school">
                      Vocational training or hospitality school
                    </option>
                    <option value="Short entry-level Skill2Shift assignments">
                      Short entry-level Skill2Shift assignments
                    </option>
                  </select>
                </div>
              </div>
            )}

            {/* Branch B: Currently studying */}
            {careerStage === "Currently studying" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Institution Name (Public on Profile)
                    </label>
                    <input
                      type="text"
                      value={branchAnswers.institution || ""}
                      onChange={(e) => updateBranch("institution", e.target.value)}
                      placeholder="e.g., Bulawayo School of Hospitality"
                      className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Programme / Course
                    </label>
                    <input
                      type="text"
                      value={branchAnswers.programme || ""}
                      onChange={(e) => updateBranch("programme", e.target.value)}
                      placeholder="e.g., BSc Tourism & Hospitality"
                      className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Study Level or Year
                    </label>
                    <input
                      type="text"
                      value={branchAnswers.studyYear || ""}
                      onChange={(e) => updateBranch("studyYear", e.target.value)}
                      placeholder="e.g., Year 2 / Attachment Year"
                      className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Expected Completion Date (Optional)
                    </label>
                    <input
                      type="text"
                      value={branchAnswers.completionDate || ""}
                      onChange={(e) => updateBranch("completionDate", e.target.value)}
                      placeholder="e.g., November 2027"
                      className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Existing projects or practical experience (Students may already have work experience!)
                  </label>
                  <textarea
                    rows={2}
                    value={branchAnswers.existingProjects || ""}
                    onChange={(e) => updateBranch("existingProjects", e.target.value)}
                    placeholder="Describe any campus events, part-time shifts, or practical coursework..."
                    className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    What are you looking for alongside your studies?
                  </label>
                  <select
                    value={
                      branchAnswers.wantsPlacements ||
                      "Industrial attachment & weekend Skill2Shift assignments"
                    }
                    onChange={(e) => updateBranch("wantsPlacements", e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E6E0D3] rounded-xl bg-white"
                  >
                    <option value="Industrial attachment & weekend Skill2Shift assignments">
                      Industrial attachment & weekend Skill2Shift assignments
                    </option>
                    <option value="Industry mentorship & career guidance">
                      Industry mentorship & career guidance
                    </option>
                    <option value="Part-time hospitality shifts during semester breaks">
                      Part-time hospitality shifts during semester breaks
                    </option>
                  </select>
                </div>
              </div>
            )}

            {/* Branch C: Intern or apprentice */}
            {careerStage === "Intern or apprentice" && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E6E0D3] text-xs text-[#4A5B50]">
                  Organisation names entered here remain <strong>Self-declared</strong>{" "}
                  until confirmed by an authorised supervisor. We will never automatically
                  contact your supervisor without your request.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Placement Organisation (If applicable)
                    </label>
                    <input
                      type="text"
                      value={branchAnswers.placementOrgName || ""}
                      onChange={(e) => updateBranch("placementOrgName", e.target.value)}
                      placeholder="e.g., Zambezi Canopy Eco-Lodge"
                      className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Department or Role
                    </label>
                    <input
                      type="text"
                      value={branchAnswers.placementRole || ""}
                      onChange={(e) => updateBranch("placementRole", e.target.value)}
                      placeholder="e.g., Front Office & Reservations Intern"
                      className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Placement Dates
                    </label>
                    <input
                      type="text"
                      value={branchAnswers.placementDates || ""}
                      onChange={(e) => updateBranch("placementDates", e.target.value)}
                      placeholder="e.g., May 2026 – November 2026"
                      className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      What do you hope to do after the placement?
                    </label>
                    <input
                      type="text"
                      value={branchAnswers.postPlacementGoal || ""}
                      onChange={(e) => updateBranch("postPlacementGoal", e.target.value)}
                      placeholder="e.g., Complete final year or join full-time lodge team"
                      className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2.5 text-xs text-[#14241B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(branchAnswers.recordExistingPlacement)}
                    onChange={(e) =>
                      updateBranch("recordExistingPlacement", e.target.checked)
                    }
                    className="w-4 h-4 rounded accent-[#163A2B]"
                  />
                  <span>
                    Add this placement to my Talent Passport as a Self-declared record so
                    I can log my hours
                  </span>
                </label>
              </div>
            )}

            {/* Branch D: Recently graduated */}
            {careerStage === "Recently graduated" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Qualification & Institution
                    </label>
                    <input
                      type="text"
                      value={branchAnswers.qualification || ""}
                      onChange={(e) => updateBranch("qualification", e.target.value)}
                      placeholder="e.g., National Diploma in Culinary Arts"
                      className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Graduation Year
                    </label>
                    <input
                      type="text"
                      value={branchAnswers.graduationYear || ""}
                      onChange={(e) => updateBranch("graduationYear", e.target.value)}
                      placeholder="e.g., 2026"
                      className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Previous placements, projects or practical work
                  </label>
                  <textarea
                    rows={2}
                    value={branchAnswers.gradProjects || ""}
                    onChange={(e) => updateBranch("gradProjects", e.target.value)}
                    placeholder="Summarise your industrial attachment or capstone project..."
                    className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Skills you want to strengthen & verify next
                  </label>
                  <input
                    type="text"
                    value={branchAnswers.skillsToStrengthen || ""}
                    onChange={(e) => updateBranch("skillsToStrengthen", e.target.value)}
                    placeholder="e.g., PMS Reservations, Bush Dining Logistics, Safari Guiding"
                    className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Branch E: Working professional */}
            {careerStage === "Working professional" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Current Role & Tourism Specialisation
                    </label>
                    <input
                      type="text"
                      value={branchAnswers.currentRole || ""}
                      onChange={(e) => updateBranch("currentRole", e.target.value)}
                      placeholder="e.g., Senior Safari Guide / Front Office Manager"
                      className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Current Employment Status (Not all professionals are currently employed)
                    </label>
                    <select
                      value={branchAnswers.employmentStatus || "Employed full-time"}
                      onChange={(e) => updateBranch("employmentStatus", e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-[#E6E0D3] rounded-xl bg-white"
                    >
                      <option value="Employed full-time">Employed full-time</option>
                      <option value="Seasonal / Contract guide or hospitality staff">
                        Seasonal / Contract guide or hospitality staff
                      </option>
                      <option value="Between contracts / Actively seeking">
                        Between contracts / Actively seeking
                      </option>
                      <option value="Part-time & studying simultaneously">
                        Part-time & studying simultaneously
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Experience Range
                    </label>
                    <select
                      value={branchAnswers.experienceRange || "3–5 years"}
                      onChange={(e) => updateBranch("experienceRange", e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-[#E6E0D3] rounded-xl bg-white"
                    >
                      <option value="1–2 years">1–2 years</option>
                      <option value="3–5 years">3–5 years</option>
                      <option value="5–10 years">5–10 years</option>
                      <option value="10+ years">10+ years</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Current Professional Goal
                    </label>
                    <select
                      value={branchAnswers.professionalGoal || "Career progression & mentoring"}
                      onChange={(e) => updateBranch("professionalGoal", e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-[#E6E0D3] rounded-xl bg-white"
                    >
                      <option value="Career progression & mentoring">
                        Career progression & mentoring
                      </option>
                      <option value="Changing roles or specialisation">
                        Changing roles or specialisation
                      </option>
                      <option value="Industry networking & showcasing portfolio">
                        Industry networking & showcasing portfolio
                      </option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Relevant Qualifications or Licenses (Optional — Employer info can remain private)
                  </label>
                  <input
                    type="text"
                    value={branchAnswers.qualifications || ""}
                    onChange={(e) => updateBranch("qualifications", e.target.value)}
                    placeholder="e.g., Learner Guide License, HACCP Certificate (Optional)"
                    className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Branch F: Self-employed or running a tourism business */}
            {careerStage === "Self-employed or running a tourism business" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Tourism Services Offered
                    </label>
                    <input
                      type="text"
                      value={branchAnswers.servicesOffered || ""}
                      onChange={(e) => updateBranch("servicesOffered", e.target.value)}
                      placeholder="e.g., Private Birding Transfers, Event Catering"
                      className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#14241B] mb-1">
                      Operating Mode
                    </label>
                    <select
                      value={branchAnswers.operatingMode || "Working independently"}
                      onChange={(e) => updateBranch("operatingMode", e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-[#E6E0D3] rounded-xl bg-white"
                    >
                      <option value="Working independently">Working independently</option>
                      <option value="Representing a registered tourism business">
                        Representing a registered tourism business
                      </option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2.5 text-xs text-[#14241B] cursor-pointer p-3 rounded-xl bg-[#FAF7F2] border border-[#E6E0D3]">
                  <input
                    type="checkbox"
                    checked={Boolean(branchAnswers.wantsOrgSetup)}
                    onChange={(e) => updateBranch("wantsOrgSetup", e.target.checked)}
                    className="w-4 h-4 rounded accent-[#163A2B]"
                  />
                  <span>
                    I also want to recruit candidates or publish opportunities (Note:
                    Publishing opportunities requires separate organisation approval by an
                    administrator)
                  </span>
                </label>
              </div>
            )}

            {/* Branch G: Returning to work or changing careers */}
            {careerStage === "Returning to work or changing careers" && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E6E0D3] text-xs text-[#4A5B50]">
                  We focus on your transferable strengths and future goals—you are never
                  required to explain career breaks.
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Previous Work or Study Background (Optional)
                  </label>
                  <input
                    type="text"
                    value={branchAnswers.previousWork || ""}
                    onChange={(e) => updateBranch("previousWork", e.target.value)}
                    placeholder="e.g., Retail Administration, Teaching, Accounting, Logistics"
                    className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Transferable Skills You Bring
                  </label>
                  <input
                    type="text"
                    value={branchAnswers.transferableSkills || ""}
                    onChange={(e) => updateBranch("transferableSkills", e.target.value)}
                    placeholder="e.g., Customer Care, Financial Reconciliation, Event Planning, Languages"
                    className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#14241B] mb-1">
                    Training or Practical Experience Needed Next
                  </label>
                  <input
                    type="text"
                    value={branchAnswers.trainingNeeded || ""}
                    onChange={(e) => updateBranch("trainingNeeded", e.target.value)}
                    placeholder="e.g., Short Skill2Shift front-office rotation or PMS refresher"
                    className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 min-h-[44px] text-sm font-medium text-[#14241B] border border-[#E6E0D3] rounded-xl hover:bg-[#F1ECE1] transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveStep(4, false)}
                  className="px-4 py-2 min-h-[44px] text-xs font-medium text-[#4A5B50] hover:text-[#14241B] transition-colors"
                >
                  Skip Optional
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveStep(4, false)}
                  className="px-5 py-2.5 min-h-[44px] bg-[#163A2B] text-[#FAF7F2] text-sm font-medium rounded-xl hover:bg-[#1E4D38] transition-colors flex items-center gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 (CAREER): SHARED PREFERENCES & DATA VISIBILITY EXPLANATIONS */}
        {step === 4 && accountPurpose === "career" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Preferred Name <span className="text-[#4A5B50]">(Public on profile)</span>
                </label>
                <input
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Town or Region <span className="text-[#4A5B50]">(Public & Filters)</span>
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl bg-white"
                >
                  {ZIM_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                  <option value="Other / Multiple Regions in Zimbabwe">
                    Other / Multiple Regions in Zimbabwe
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#14241B] mb-1.5">
                Tourism Interests{" "}
                <span className="text-[#4A5B50]">(Public & Used for pathway recommendations)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TOURISM_INTEREST_OPTIONS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() =>
                      toggleItem(tourismInterests, interest, setTourismInterests)
                    }
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      tourismInterests.includes(interest)
                        ? "bg-[#163A2B] text-white border-[#163A2B]"
                        : "bg-white text-[#14241B] border-[#E6E0D3]"
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Curated Career Pathway{" "}
                  <span className="text-[#4A5B50]">(Used for skill tracking)</span>
                </label>
                <select
                  value={selectedPathwayId}
                  onChange={(e) => setSelectedPathwayId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl bg-white"
                >
                  {CURATED_CAREER_PATHWAYS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Availability <span className="text-[#4A5B50]">(Visible to employers)</span>
                </label>
                <input
                  type="text"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  placeholder="e.g., Immediately / Weekends / Semester Break"
                  className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#14241B] mb-1.5">
                Opportunity Types You Want{" "}
                <span className="text-[#4A5B50]">(Used for opportunity filters)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {["Job", "Internship", "Apprenticeship", "Skill2Shift"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      toggleItem(opportunityTypes, t, setOpportunityTypes)
                    }
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      opportunityTypes.includes(t)
                        ? "bg-[#163A2B] text-white border-[#163A2B]"
                        : "bg-white text-[#14241B] border-[#E6E0D3]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E6E0D3]">
              <div>
                <label className="block text-xs font-medium text-[#14241B] mb-1">
                  Profile Visibility <span className="text-[#4A5B50]">(Privacy control)</span>
                </label>
                <select
                  value={profileVisibility}
                  onChange={(e) => setProfileVisibility(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-[#E6E0D3] rounded-xl bg-white"
                >
                  <option value="public">Public to Tourism Community</option>
                  <option value="connections_only">Connections & Employers Only</option>
                  <option value="private">Private (Only visible to me)</option>
                </select>
              </div>
              <div className="flex flex-col justify-center space-y-2 pt-3">
                <label className="flex items-center gap-2 text-xs text-[#14241B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={employerDiscoverable}
                    onChange={(e) => setEmployerDiscoverable(e.target.checked)}
                    className="w-4 h-4 accent-[#163A2B]"
                  />
                  <span>Allow approved employers to discover my profile</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[#14241B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={willingToRelocate}
                    onChange={(e) => setWillingToRelocate(e.target.checked)}
                    className="w-4 h-4 accent-[#163A2B]"
                  />
                  <span>Willing to relocate for lodge or park placements</span>
                </label>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 min-h-[44px] text-sm font-medium text-[#14241B] border border-[#E6E0D3] rounded-xl hover:bg-[#F1ECE1] transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveStep(5, false)}
                className="px-5 py-2.5 min-h-[44px] bg-[#163A2B] text-[#FAF7F2] text-sm font-medium rounded-xl hover:bg-[#1E4D38] transition-colors flex items-center gap-2"
              >
                <span>Review Summary</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 (CAREER) OR STEP 3 (ORG): CONFIRM & PERSONALISE */}
        {((step === 5 && accountPurpose === "career") ||
          (step === 3 && accountPurpose !== "career")) && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-[#F1ECE1] border border-[#E6E0D3] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#163A2B]">
                  Editable Onboarding Summary
                </span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-[#163A2B] underline hover:no-underline"
                >
                  Change Answers
                </button>
              </div>
              <div className="text-xs text-[#14241B] space-y-1">
                <p>
                  <strong>Preferred Name:</strong> {preferredName} ·{" "}
                  <strong>Location:</strong> {location}
                </p>
                <p>
                  <strong>Purpose:</strong> {accountPurpose} ·{" "}
                  <strong>Career Stage:</strong> {careerStage}
                </p>
                <p>
                  <strong>Selected Pathway:</strong>{" "}
                  {CURATED_CAREER_PATHWAYS.find((p) => p.id === selectedPathwayId)
                    ?.title || selectedPathwayId}
                </p>
                <p>
                  <strong>Opportunity Filters Initialised:</strong>{" "}
                  {opportunityTypes.join(" · ") || "All"} ·{" "}
                  <strong>Visibility:</strong> {profileVisibility}
                </p>
                {orgSetup.name && (
                  <p className="pt-1 text-[#163A2B]">
                    <strong>Pending Organisation to Register:</strong> {orgSetup.name} (
                    {orgSetup.orgType})
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E6E0D3] space-y-2">
              <h3 className="text-sm font-semibold text-[#14241B]">
                Rule-Based Personalisation Preview
              </h3>
              <p className="text-xs text-[#4A5B50]">
                {careerStage === "Currently studying" &&
                  "“Explore placements, add a project and choose a career pathway.”"}
                {careerStage === "Intern or apprentice" &&
                  "“Add your current placement and start recording your experience.”"}
                {careerStage !== "Currently studying" &&
                  careerStage !== "Intern or apprentice" &&
                  "“Showcase your expertise and explore your next career move.”"}
              </p>
              <p className="text-xs text-[#4A5B50]">
                Note: All questionnaire answers are stored as self-declared profile
                attributes. Confirmed hours and verified skills are only earned through
                authorised supervisor or institutional verification.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(accountPurpose === "career" ? 4 : 2)}
                className="px-4 py-2 min-h-[44px] text-sm font-medium text-[#14241B] border border-[#E6E0D3] rounded-xl hover:bg-[#F1ECE1] transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveStep(totalSteps, true)}
                className="px-6 py-2.5 min-h-[44px] bg-[#163A2B] text-[#FAF7F2] text-sm font-medium rounded-xl hover:bg-[#1E4D38] transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? "Saving..." : "Complete & Enter TourBridge"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
