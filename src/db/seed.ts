import { db } from "./index.ts";
import {
  users,
  organisations,
  organisationMemberships,
  posts,
  postComments,
  portfolioItems,
  passportRecords,
  opportunities,
  applications,
  placements,
  socialRelationships,
  messages,
  notifications,
  reports,
  auditEvents,
  privateDocuments,
} from "./schema.ts";
import { eq } from "drizzle-orm";
import { CURATED_CAREER_PATHWAYS } from "../constants/pathways.ts";

export { CURATED_CAREER_PATHWAYS };

export async function ensureSeedData() {
  try {
    const existingDemo = await db
      .select()
      .from(users)
      .where(eq(users.uid, "demo-student-tariro"));

    if (existingDemo.length > 0) {
      return;
    }

    console.log("Seeding TourBridge Zimbabwe fictional demonstration data...");

    // 1. Create the 6 required fictional demo accounts
    const insertedUsers = await db
      .insert(users)
      .values([
        {
          uid: "demo-student-tariro",
          email: "tariro.moyo@demo.tourbridge.zw",
          name: "Tariro Moyo",
          preferredName: "Tariro",
          avatarUrl: "/src/assets/images/avatar_tourism_member_1791386464667.jpg",
          bio: "Final-year BSc Tourism & Hospitality student in Bulawayo. Passionate about sustainable lodge operations, front-office excellence, and heritage interpretation.",
          location: "Bulawayo, Zimbabwe",
          willingToRelocate: true,
          preferredLocations: ["Victoria Falls", "Hwange", "Bulawayo", "Nyanga"],
          accountPurpose: "career",
          careerStage: "Currently studying",
          tourismInterests: ["Hospitality & Front Office", "Eco-Tourism", "Cultural Heritage"],
          immediateCareerGoal: "Secure a verified 120-hour industrial attachment at a Victoria Falls or Hwange eco-lodge",
          selectedPathwayId: "front-office",
          opportunityTypes: ["Internship", "Skill2Shift", "Apprenticeship"],
          availability: "Weekends & Semester Attachments (May–August)",
          profileVisibility: "public",
          employerDiscoverable: true,
          messagingPrivacy: "connections_and_employers",
          onboardingCompleted: true,
          onboardingStep: 5,
          onboardingAnswers: {
            purpose: "Build my tourism career",
            careerStage: "Currently studying",
            institution: "Bulawayo School of Hospitality & Tourism (Fictional Demo)",
            programme: "BSc (Hons) Tourism & Hospitality Management",
            studyYear: "Year 3 (Industrial Attachment Year)",
            completionDate: "November 2027",
            areasToExplore: ["Front-Office Operations", "Eco-Lodge Guest Relations"],
            existingProjects: "Coordinated the 2026 Matobo Cultural Heritage Student Symposium for 140 delegates",
            wantsPlacements: "Placements, practical shifts, and industry mentorship",
          },
          platformRole: "member",
          isDemo: true,
        },
        {
          uid: "demo-guide-farai",
          email: "farai.ndlovu@demo.tourbridge.zw",
          name: "Farai Ndlovu",
          preferredName: "Farai",
          avatarUrl: "/src/assets/images/hwange_safari_guiding_1791386430930.jpg",
          bio: "Field Safari Guide & Walking Track Specialist with 7 years in Hwange National Park and Mana Pools. Dedicated to mentoring apprentice guides and ethical wildlife viewing.",
          location: "Hwange, Matabeleland North",
          willingToRelocate: false,
          preferredLocations: ["Hwange", "Victoria Falls", "Mana Pools"],
          accountPurpose: "career",
          careerStage: "Working professional",
          tourismInterests: ["Wildlife & Safari Guiding", "Conservation Education", "Birding"],
          immediateCareerGoal: "Lead senior walking safari trails and mentor incoming learner guides",
          selectedPathwayId: "safari-guide",
          opportunityTypes: ["Job", "Skill2Shift"],
          availability: "Full-time seasonal rotations",
          profileVisibility: "public",
          employerDiscoverable: true,
          messagingPrivacy: "anyone",
          onboardingCompleted: true,
          onboardingStep: 5,
          onboardingAnswers: {
            purpose: "Build my tourism career",
            careerStage: "Working professional",
            currentRole: "Senior Field Guide",
            specialisation: "Walking Safaris & Track Interpretation",
            employmentStatus: "Employed full-time",
            experienceRange: "5–10 years",
            mainSkills: ["Wildlife Track & Sign Interpretation", "Guest Safety & Bush Briefing", "Bird Identification & Ecology"],
            goals: "Progression and mentoring junior guides",
          },
          platformRole: "member",
          isDemo: true,
        },
        {
          uid: "demo-hospitality-nyasha",
          email: "nyasha.chikwanda@demo.tourbridge.zw",
          name: "Nyasha Chikwanda",
          preferredName: "Nyasha",
          avatarUrl: "/src/assets/images/harare_culinary_plating_1791386442823.jpg",
          bio: "Sous Chef & Bush Dining Coordinator blending indigenous Zimbabwean grains and wild botanicals with modern culinary techniques across Harare and Nyanga.",
          location: "Nyanga, Eastern Highlands",
          willingToRelocate: true,
          preferredLocations: ["Nyanga", "Harare", "Victoria Falls"],
          accountPurpose: "career",
          careerStage: "Working professional",
          tourismInterests: ["Food & Beverage", "Culinary Arts", "Event Catering"],
          immediateCareerGoal: "Transition into an Executive Sous Chef role at a luxury safari camp",
          selectedPathwayId: "food-beverage",
          opportunityTypes: ["Job", "Skill2Shift"],
          availability: "Available with 1 month notice",
          profileVisibility: "public",
          employerDiscoverable: true,
          messagingPrivacy: "connections_and_employers",
          onboardingCompleted: true,
          onboardingStep: 5,
          onboardingAnswers: {
            purpose: "Build my tourism career",
            careerStage: "Working professional",
            currentRole: "Sous Chef & Banqueting Lead",
            specialisation: "Contemporary African Gastronomy",
            employmentStatus: "Employed full-time",
            experienceRange: "3–5 years",
          },
          platformRole: "member",
          isDemo: true,
        },
        {
          uid: "demo-employer-zambezi",
          email: "recruitment@zambezisands.demo.zw",
          name: "Kudzai Sibanda",
          preferredName: "Kudzai",
          avatarUrl: "/src/assets/images/vicfalls_lodge_safari_1791386419455.jpg",
          bio: "Operations & Talent Director at Zambezi Canopy Eco-Lodge (Fictional Demo). Committed to structured hospitality placements and fair competency verification.",
          location: "Victoria Falls, Zimbabwe",
          willingToRelocate: false,
          preferredLocations: ["Victoria Falls"],
          accountPurpose: "business",
          careerStage: "Working professional",
          tourismInterests: ["Eco-Lodge Operations", "Hospitality Training", "Sustainable Tourism"],
          immediateCareerGoal: "Recruit verified front-office interns and Skill2Shift bush dining staff",
          selectedPathwayId: "front-office",
          opportunityTypes: ["Internship", "Skill2Shift", "Job"],
          availability: "Recruiting year-round",
          profileVisibility: "public",
          employerDiscoverable: true,
          messagingPrivacy: "anyone",
          onboardingCompleted: true,
          onboardingStep: 5,
          platformRole: "member",
          isDemo: true,
        },
        {
          uid: "demo-institution-byo",
          email: "registrar@bulawayohospitality.demo.zw",
          name: "Dr. Chipo Mutasa",
          preferredName: "Dr. Mutasa",
          avatarUrl: "/src/assets/images/nyanga_front_office_1791386453942.jpg",
          bio: "Industrial Attachment Coordinator & Academic Registrar at Bulawayo School of Hospitality & Tourism (Fictional Demo). Issuing verified academic credentials.",
          location: "Bulawayo, Zimbabwe",
          willingToRelocate: false,
          preferredLocations: ["Bulawayo"],
          accountPurpose: "institution",
          careerStage: "Working professional",
          tourismInterests: ["Curriculum Development", "Student Placements", "Hospitality Standards"],
          immediateCareerGoal: "Connect diploma and degree cohorts with verified industry attachments",
          selectedPathwayId: "front-office",
          opportunityTypes: ["Internship", "Apprenticeship"],
          availability: "Academic Office Hours",
          profileVisibility: "public",
          employerDiscoverable: false,
          messagingPrivacy: "anyone",
          onboardingCompleted: true,
          onboardingStep: 5,
          platformRole: "member",
          isDemo: true,
        },
        {
          uid: "demo-admin-trust",
          email: "admin@tourbridge.demo.zw",
          name: "Tendai Gumbo",
          preferredName: "Tendai",
          avatarUrl: "/src/assets/images/avatar_tourism_member_1791386464667.jpg",
          bio: "TourBridge Platform Trust, Moderation & Verification Dispute Administrator (Fictional Demo Account).",
          location: "Harare, Zimbabwe",
          willingToRelocate: false,
          preferredLocations: ["Harare"],
          accountPurpose: "career",
          careerStage: "Working professional",
          tourismInterests: ["Platform Governance", "Credential Integrity"],
          immediateCareerGoal: "Safeguard fair verification and review organisation approvals",
          selectedPathwayId: "front-office",
          opportunityTypes: [],
          availability: "Platform Governance",
          profileVisibility: "public",
          employerDiscoverable: false,
          messagingPrivacy: "anyone",
          onboardingCompleted: true,
          onboardingStep: 5,
          platformRole: "admin",
          isDemo: true,
        },
      ])
      .returning();

    const [studentUser, guideUser, chefUser, employerUser, institutionUser, adminUser] =
      insertedUsers;

    // 2. Create Fictional Demo Organisations (Approved Lodge, Approved Institution, and Pending Tour Operator)
    const insertedOrgs = await db
      .insert(organisations)
      .values([
        {
          name: "Zambezi Canopy Eco-Lodge (Fictional Demo)",
          slug: "zambezi-canopy-ecolodge-demo",
          orgType: "Lodge / Camp",
          location: "Victoria Falls, Matabeleland North",
          contactEmail: "careers@zambezicanopy.demo.zw",
          contactPhone: "+263 83 284 0000",
          website: "https://zambezicanopy.demo.zw",
          description:
            "Fictional demonstration 24-suite solar-powered luxury eco-lodge on the upper Zambezi River offering structured hospitality placements, guiding apprenticeships, and Skill2Shift assignments.",
          servicesOrProgrammes: [
            "Luxury Riverfront Accommodation",
            "Guided Canoe & Walking Safaris",
            "Farm-to-Table Zambezi Bush Dining",
            "Structured Hospitality Attachments",
          ],
          logoUrl: "/src/assets/images/vicfalls_lodge_safari_1791386419455.jpg",
          bannerUrl: "/src/assets/images/vicfalls_lodge_safari_1791386419455.jpg",
          verificationStatus: "approved",
          verificationEvidenceNote:
            "Fictional Demo Verification: ZTA Demo Operator Reg #DEMO-ZTA-2026-091 verified by Platform Admin.",
          verifiedByAdminId: adminUser.id,
          verifiedAt: new Date(),
          isDemo: true,
        },
        {
          name: "Bulawayo School of Hospitality & Tourism (Fictional Demo)",
          slug: "bulawayo-hospitality-school-demo",
          orgType: "Training Institution",
          location: "Bulawayo, Zimbabwe",
          contactEmail: "registry@bulawayohospitality.demo.zw",
          contactPhone: "+263 29 226 1111",
          website: "https://bulawayohospitality.demo.zw",
          description:
            "Fictional demonstration tertiary training institution educating culinary chefs, front-office leaders, and heritage tourism managers across southern Zimbabwe.",
          servicesOrProgrammes: [
            "BSc (Hons) Tourism & Hospitality Management",
            "National Diploma in Professional Cookery",
            "Certificate in Front-Office & PMS Operations",
          ],
          logoUrl: "/src/assets/images/nyanga_front_office_1791386453942.jpg",
          bannerUrl: "/src/assets/images/nyanga_front_office_1791386453942.jpg",
          verificationStatus: "approved",
          verificationEvidenceNote:
            "Fictional Demo Verification: Higher Education Training Charter #DEMO-HET-402.",
          verifiedByAdminId: adminUser.id,
          verifiedAt: new Date(),
          isDemo: true,
        },
        {
          name: "Eastern Highlands Trails & Expeditions (Fictional Demo)",
          slug: "eastern-highlands-trails-demo",
          orgType: "Tour Operator",
          location: "Mutare / Nyanga, Manicaland",
          contactEmail: "ops@highlandstrails.demo.zw",
          contactPhone: "+263 20 206 5555",
          website: "https://highlandstrails.demo.zw",
          description:
            "Fictional demonstration mountain trekking and cultural tour operator awaiting administrator verification before publishing opportunities.",
          servicesOrProgrammes: [
            "Mount Nyangani Guided Treks",
            "Bvumba Botanical Birding Tours",
          ],
          logoUrl: "/src/assets/images/hwange_safari_guiding_1791386430930.jpg",
          bannerUrl: "/src/assets/images/hwange_safari_guiding_1791386430930.jpg",
          verificationStatus: "pending",
          verificationEvidenceNote:
            "Submitted fictional tour operator registration certificate awaiting admin review.",
          isDemo: true,
        },
      ])
      .returning();

    const [lodgeOrg, institutionOrg, pendingOrg] = insertedOrgs;

    // 3. Create Organisation Memberships (Multiple staff can manage an org; members can also belong to an org)
    await db.insert(organisationMemberships).values([
      {
        organisationId: lodgeOrg.id,
        userId: employerUser.id,
        roleTitle: "Operations & Talent Director",
        permissionLevel: "owner",
        isActive: true,
      },
      {
        organisationId: lodgeOrg.id,
        userId: guideUser.id,
        roleTitle: "Lead Field Guide & Placement Supervisor",
        permissionLevel: "supervisor",
        isActive: true,
      },
      {
        organisationId: institutionOrg.id,
        userId: institutionUser.id,
        roleTitle: "Academic Registrar & Attachment Lead",
        permissionLevel: "owner",
        isActive: true,
      },
      {
        organisationId: pendingOrg.id,
        userId: chefUser.id,
        roleTitle: "Expedition Catering Partner",
        permissionLevel: "owner",
        isActive: true,
      },
    ]);

    // 4. Create Private Documents (Evidence Vault)
    const insertedDocs = await db
      .insert(privateDocuments)
      .values([
        {
          ownerUserId: studentUser.id,
          organisationId: institutionOrg.id,
          fileName: "Tariro_Moyo_Year2_Academic_Transcript_DEMO.pdf",
          mimeType: "application/pdf",
          fileSizeBytes: 184320,
          dataUriOrContent:
            "FICTIONAL DEMO PRIVATE EVIDENCE DOCUMENT: Bulawayo School of Hospitality & Tourism — Official Transcript Ref #DEMO-BSHT-2026-884. Passed Front Office Operations (Distinction) and Tourism Marketing (Merit).",
          documentPurpose: "passport_evidence",
        },
        {
          ownerUserId: employerUser.id,
          organisationId: lodgeOrg.id,
          fileName: "Zambezi_Canopy_Operator_License_DEMO.pdf",
          mimeType: "application/pdf",
          fileSizeBytes: 245100,
          dataUriOrContent:
            "FICTIONAL DEMO ORGANISATION VERIFICATION DOCUMENT: Zimbabwe Tourism Authority Fictional Demo License #DEMO-ZTA-2026-091 for Zambezi Canopy Eco-Lodge.",
          documentPurpose: "org_verification",
        },
      ])
      .returning();

    // 5. Create Portfolio Items
    const insertedPortfolios = await db
      .insert(portfolioItems)
      .values([
        {
          userId: studentUser.id,
          title: "Guest Arrival & Sunset Cruise Concierge Workflow Redesign",
          description:
            "Designed a streamlined check-in and dietary preference briefing card during my practical front-office simulation project, reducing guest check-in wait times from 12 minutes to 4 minutes.",
          mediaUrl: "/src/assets/images/nyanga_front_office_1791386453942.jpg",
          mediaType: "image",
          skillTags: [
            "Guest Check-In & Concierge Protocol",
            "Property Management Systems (PMS)",
            "Itinerary & Transfer Coordination",
          ],
          roleContext: "Student Lead — Hospitality Operations Lab",
          projectDate: "August 2026",
        },
        {
          userId: guideUser.id,
          title: "Hwange Dry-Season Waterhole Elephant Behaviour Log",
          description:
            "Six-month photographic and ecological tracking guide created for apprentice guides to interpret herd stress signals and maintain safe walking safari buffer zones.",
          mediaUrl: "/src/assets/images/hwange_safari_guiding_1791386430930.jpg",
          mediaType: "image",
          skillTags: [
            "Wildlife Track & Sign Interpretation",
            "Guest Safety & Bush Briefing",
            "Conservation Ethics & Community Liaison",
          ],
          roleContext: "Senior Field Guide",
          projectDate: "July 2026",
        },
        {
          userId: chefUser.id,
          title: "Tasting Menu: Sorghum Risotto, Baobab Glaze & Nyanga Trout",
          description:
            "Developed a 5-course indigenous tasting menu sourcing 90% of ingredients from smallholder farmers in Manicaland while maintaining strict HACCP allergen documentation.",
          mediaUrl: "/src/assets/images/harare_culinary_plating_1791386442823.jpg",
          mediaType: "image",
          skillTags: [
            "Contemporary Zimbabwean Menu Plating",
            "Food Safety & HACCP Hygiene",
            "Kitchen Inventory & Cost Control",
          ],
          roleContext: "Sous Chef",
          projectDate: "September 2026",
        },
      ])
      .returning();

    // 6. Create Talent Passport Records across all explicit evidence statuses
    const insertedPassports = await db
      .insert(passportRecords)
      .values([
        {
          userId: studentUser.id,
          recordCategory: "Education",
          title: "BSc (Hons) Tourism & Hospitality Management (Years 1–2 Completed)",
          issuerOrOrganisationName: "Bulawayo School of Hospitality & Tourism (Fictional Demo)",
          organisationId: institutionOrg.id,
          startDate: "2024-09",
          endDate: "2026-06",
          confirmedHours: 0,
          skillsDemonstrated: [
            "Property Management Systems (PMS)",
            "Cross-Cultural Communication",
          ],
          publicSummary:
            "Fictional Demo Verification: Completed Years 1 & 2 foundational modules in Front-Office Management, Tourism Economics, and Food & Beverage Service.",
          evidenceReference: "DEMO-BSHT-TRANSCRIPT-2026-884",
          privateEvidenceDocId: insertedDocs[0].id,
          evidenceStatus: "Institution-issued credential",
          verifierUserId: institutionUser.id,
          verifierNameAndRole: "Dr. Chipo Mutasa — Academic Registrar (Fictional Demo)",
          verifiedAt: new Date(),
          isDemo: true,
          verificationHistory: [
            {
              date: "2026-07-10",
              actor: "Tariro Moyo",
              action: "Submitted academic transcript for institutional verification",
              status: "Submitted for review",
            },
            {
              date: "2026-07-14",
              actor: "Dr. Chipo Mutasa (Fictional Demo Institution)",
              action: "Confirmed enrolment and academic standing",
              status: "Institution-issued credential",
              note: "Fictional demo endorsement — does not represent a real university record.",
            },
          ],
        },
        {
          userId: studentUser.id,
          recordCategory: "Practical experience",
          title: "Victoria Falls Conservation Conference — Guest Registration Shift",
          issuerOrOrganisationName: "Zambezi Canopy Eco-Lodge (Fictional Demo)",
          organisationId: lodgeOrg.id,
          startDate: "2026-08-14",
          endDate: "2026-08-16",
          confirmedHours: 24,
          skillsDemonstrated: ["Guest Check-In & Concierge Protocol", "Delegate Registration & Logistics"],
          publicSummary:
            "Fictional Demo Verification: Completed 24 confirmed practical hours managing arrival desk and shuttle dispatch for 85 regional conservation delegates.",
          evidenceReference: "DEMO-ZCL-SHIFT-2026-19",
          evidenceStatus: "Confirmed by an authorised organisation representative",
          verifierUserId: employerUser.id,
          verifierNameAndRole: "Kudzai Sibanda — Operations Director (Fictional Demo)",
          verifiedAt: new Date(),
          isDemo: true,
          verificationHistory: [
            {
              date: "2026-08-17",
              actor: "Tariro Moyo",
              action: "Submitted placement completion (24 hours)",
              status: "Submitted for review",
            },
            {
              date: "2026-08-18",
              actor: "Kudzai Sibanda (Fictional Demo Employer)",
              action: "Confirmed attendance hours (24 hrs)",
              status: "Confirmed by an authorised organisation representative",
              note: "Fictional demo verification.",
            },
          ],
        },
        {
          userId: studentUser.id,
          recordCategory: "Skill assessment",
          title: "Assessed Competency: Guest Check-In & Concierge Protocol",
          issuerOrOrganisationName: "Zambezi Canopy Eco-Lodge (Fictional Demo)",
          organisationId: lodgeOrg.id,
          startDate: "2026-08-16",
          endDate: "2026-08-16",
          confirmedHours: 0,
          skillsDemonstrated: ["Guest Check-In & Concierge Protocol", "Cross-Cultural Communication"],
          publicSummary:
            "Fictional Demo Verification: Separately assessed during the August conference shift. Demonstrated calm, accurate guest check-in and transfer briefing.",
          evidenceReference: "DEMO-ASSESS-2026-19B",
          evidenceStatus: "Confirmed by an authorised organisation representative",
          verifierUserId: employerUser.id,
          verifierNameAndRole: "Kudzai Sibanda — Operations Director (Fictional Demo)",
          verifiedAt: new Date(),
          isDemo: true,
          verificationHistory: [
            {
              date: "2026-08-18",
              actor: "Kudzai Sibanda (Fictional Demo Employer)",
              action: "Recorded separate skill assessment following shift completion",
              status: "Confirmed by an authorised organisation representative",
            },
          ],
        },
        {
          userId: studentUser.id,
          recordCategory: "Certificate",
          title: "Elementary Wilderness First Aid & CPR Workshop",
          issuerOrOrganisationName: "Matabeleland Red Cross Training Centre (Self-declared)",
          startDate: "2026-09-02",
          endDate: "2026-09-04",
          confirmedHours: 0,
          skillsDemonstrated: ["Wilderness First Aid"],
          publicSummary:
            "Attended a 2-day practical first aid workshop covering heat exhaustion, CPR, and remote evacuation procedures.",
          evidenceReference: "CERT-SELF-902",
          evidenceStatus: "Self-declared",
          isDemo: true,
          verificationHistory: [
            {
              date: "2026-09-05",
              actor: "Tariro Moyo",
              action: "Added self-declared certificate record",
              status: "Self-declared",
            },
          ],
        },
        {
          userId: guideUser.id,
          recordCategory: "Practical experience",
          title: "Senior Walking Safari Guide — Hwange & Zambezi Sector",
          issuerOrOrganisationName: "Zambezi Canopy Eco-Lodge (Fictional Demo)",
          organisationId: lodgeOrg.id,
          startDate: "2023-04-01",
          endDate: "2026-10-01",
          confirmedHours: 1420,
          skillsDemonstrated: [
            "Wildlife Track & Sign Interpretation",
            "Guest Safety & Bush Briefing",
            "4x4 Off-Road Vehicle Handling",
            "Bird Identification & Ecology",
          ],
          publicSummary:
            "Fictional Demo Verification: Led over 350 morning walking safaris and river bank interpretive drives with zero safety incidents.",
          evidenceReference: "DEMO-ZCL-GUIDE-004",
          evidenceStatus: "Confirmed by an authorised organisation representative",
          verifierUserId: employerUser.id,
          verifierNameAndRole: "Kudzai Sibanda — Operations Director (Fictional Demo)",
          verifiedAt: new Date(),
          isDemo: true,
          verificationHistory: [
            {
              date: "2026-09-01",
              actor: "Kudzai Sibanda",
              action: "Confirmed cumulative field guiding hours",
              status: "Confirmed by an authorised organisation representative",
            },
          ],
        },
        {
          userId: chefUser.id,
          recordCategory: "Certificate",
          title: "National Diploma in Professional Cookery & Culinary Arts",
          issuerOrOrganisationName: "Bulawayo School of Hospitality & Tourism (Fictional Demo)",
          organisationId: institutionOrg.id,
          startDate: "2020-01",
          endDate: "2022-11",
          confirmedHours: 600,
          skillsDemonstrated: [
            "Food Safety & HACCP Hygiene",
            "Contemporary Zimbabwean Menu Plating",
            "Kitchen Inventory & Cost Control",
          ],
          publicSummary:
            "Fictional Demo Verification: Graduated with Distinction in Professional Cookery, Pastry, and Kitchen Hygiene Management.",
          evidenceReference: "DEMO-BSHT-ND-2022-112",
          evidenceStatus: "Institution-issued credential",
          verifierUserId: institutionUser.id,
          verifierNameAndRole: "Dr. Chipo Mutasa — Academic Registrar (Fictional Demo)",
          verifiedAt: new Date(),
          isDemo: true,
          verificationHistory: [
            {
              date: "2022-12-01",
              actor: "Dr. Chipo Mutasa",
              action: "Issued verified institutional credential",
              status: "Institution-issued credential",
            },
          ],
        },
      ])
      .returning();

    // 7. Create Opportunities (Jobs, Internships, Apprenticeships, Skill2Shift)
    const insertedOpps = await db
      .insert(opportunities)
      .values([
        {
          organisationId: lodgeOrg.id,
          createdByUserId: employerUser.id,
          title: "Skill2Shift: 5-Day Zambezi Conservation Symposium Guest Desk & Concierge",
          opportunityType: "Skill2Shift",
          location: "Victoria Falls, Matabeleland North",
          description:
            "Short practical assignment supporting our front-office team during the annual Zambezi River Conservation Symposium. Ideal for tourism students or recent graduates seeking verified PMS check-in and guest briefing experience.",
          tasks: [
            "Manage digital guest arrivals and room key allocation on our Property Management System",
            "Coordinate airport shuttle manifests and sunset barge boarding schedules",
            "Brief international delegates on eco-lodge solar and wildlife safety protocols",
          ],
          requiredSkills: [
            "Guest Check-In & Concierge Protocol",
            "Property Management Systems (PMS)",
            "Cross-Cultural Communication",
          ],
          eligibility: "Open to tourism & hospitality students, interns, or recent graduates in Zimbabwe.",
          startDate: "2026-11-10",
          endDate: "2026-11-14",
          expectedHours: 40,
          compensationType: "Stipend / Allowance",
          compensationAmount: "USD $120 shift allowance",
          transportProvided: true,
          mealsProvided: true,
          accommodationProvided: true,
          applicationDeadline: "2026-10-30",
          supervisorNameAndRole: "Kudzai Sibanda — Operations & Talent Director",
          assessmentExpectations:
            "Attendance hours (40 hrs) confirmed upon shift completion. Separate competency assessment conducted on PMS Check-In accuracy and Guest Safety Briefing.",
          status: "open",
          isDemo: true,
        },
        {
          organisationId: lodgeOrg.id,
          createdByUserId: employerUser.id,
          title: "3-Month Wet-Season Learner Guide & Conservation Apprenticeship",
          opportunityType: "Apprenticeship",
          location: "Victoria Falls / Hwange Corridor",
          description:
            "Hands-on field guiding apprenticeship paired with Senior Field Guide Farai Ndlovu. Apprentices assist with vehicle readiness, birding logs, and conservation track monitoring.",
          tasks: [
            "Assist senior guides with pre-drive safety briefings and 4x4 vehicle inspections",
            "Record daily wildlife sightings and camera-trap data for conservation partners",
            "Practice botanical and bird identification during afternoon nature walks",
          ],
          requiredSkills: [
            "Wildlife Track & Sign Interpretation",
            "Guest Safety & Bush Briefing",
            "Bird Identification & Ecology",
          ],
          eligibility: "Aspiring guides with Learner Guide license or conservation background.",
          startDate: "2026-12-01",
          endDate: "2027-02-28",
          expectedHours: 360,
          compensationType: "Stipend / Allowance",
          compensationAmount: "USD $350 / month training stipend",
          transportProvided: true,
          mealsProvided: true,
          accommodationProvided: true,
          applicationDeadline: "2026-11-15",
          supervisorNameAndRole: "Farai Ndlovu — Lead Field Guide & Supervisor",
          assessmentExpectations:
            "Monthly logbook hour verification plus practical field assessment on track interpretation and bush briefing.",
          status: "open",
          isDemo: true,
        },
        {
          organisationId: lodgeOrg.id,
          createdByUserId: employerUser.id,
          title: "Senior Bush Dining & Lodge Sous Chef",
          opportunityType: "Job",
          location: "Victoria Falls, Matabeleland North",
          description:
            "Full-time culinary leadership role overseeing our riverfront restaurant and signature boma bush dinners. Note: Ordinary job applications do not automatically generate placement records.",
          tasks: [
            "Lead a brigade of 6 commis chefs across breakfast, high tea, and 4-course dinner service",
            "Maintain strict HACCP food hygiene and cold-chain logs in a remote solar camp",
            "Design seasonal menus celebrating local Zimbabwean produce",
          ],
          requiredSkills: [
            "Contemporary Zimbabwean Menu Plating",
            "Food Safety & HACCP Hygiene",
            "Bush Dinner & Remote Catering Logistics",
          ],
          eligibility: "Minimum 3 years professional kitchen experience and culinary qualification.",
          startDate: "2026-11-20",
          endDate: "Permanent",
          expectedHours: 160,
          compensationType: "Paid salary/wage",
          compensationAmount: "USD $1,100 – $1,350 / month + camp live-in package",
          transportProvided: true,
          mealsProvided: true,
          accommodationProvided: true,
          applicationDeadline: "2026-11-05",
          supervisorNameAndRole: "Kudzai Sibanda — Operations Director",
          assessmentExpectations: "Standard employment contract with 3-month probation review.",
          status: "open",
          isDemo: true,
        },
        {
          organisationId: institutionOrg.id,
          createdByUserId: institutionUser.id,
          title: "Hospitality Training Lab — Unpaid Peer Mentorship & Culinary Prep Practicum",
          opportunityType: "Internship",
          location: "Bulawayo, Zimbabwe",
          description:
            "Structured campus practicum for hospitality students wanting supervised kitchen and front-desk simulation hours prior to industrial attachment. Explicitly unpaid learning opportunity with campus meals provided.",
          tasks: [
            "Prepare mise-en-place for the training restaurant lunch service",
            "Operate the front-of-house training reception desk for visiting guests",
          ],
          requiredSkills: [
            "Food Safety & HACCP Hygiene",
            "Guest Check-In & Concierge Protocol",
          ],
          eligibility: "Enrolled diploma or degree students in Bulawayo.",
          startDate: "2026-10-20",
          endDate: "2026-11-20",
          expectedHours: 60,
          compensationType: "Unpaid learning placement",
          compensationAmount: "Unpaid academic practicum (Lunch & uniform provided)",
          transportProvided: false,
          mealsProvided: true,
          accommodationProvided: false,
          applicationDeadline: "2026-10-18",
          supervisorNameAndRole: "Dr. Chipo Mutasa — Academic Registrar",
          assessmentExpectations:
            "Confirmed practicum hours logged separately from practical skill rubrics.",
          status: "open",
          isDemo: true,
        },
      ])
      .returning();

    // 8. Create an Active Application & Placement in progress for Tariro so the user can test every stage immediately
    const insertedApps = await db
      .insert(applications)
      .values([
        {
          opportunityId: insertedOpps[0].id,
          applicantUserId: studentUser.id,
          supportingMessage:
            "Good day Mr. Sibanda, I am a 3rd-year BSc Tourism & Hospitality student with verified experience from the August conservation shift and a portfolio project on PMS guest arrival redesign. I would love to complete this 40-hour Skill2Shift assignment.",
          attachedPassportIds: [insertedPassports[0].id, insertedPassports[1].id],
          status: "Accepted",
          employerNotes:
            "Strong candidate with verified prior shift attendance and clear front-office portfolio evidence.",
        },
        {
          opportunityId: insertedOpps[2].id,
          applicantUserId: chefUser.id,
          supportingMessage:
            "Submitting my verified National Diploma and indigenous tasting menu portfolio for the Senior Bush Dining & Lodge Sous Chef role.",
          attachedPassportIds: [insertedPassports[5].id],
          status: "Shortlisted",
          employerNotes: "Shortlisted for tasting trial.",
        },
      ])
      .returning();

    await db.insert(placements).values([
      {
        applicationId: insertedApps[0].id,
        opportunityId: insertedOpps[0].id,
        organisationId: lodgeOrg.id,
        memberUserId: studentUser.id,
        workflowState: "In progress",
        memberCompletionSummary:
          "Completed 38 hours managing PMS check-ins, airport transfers, and eco-lodge safety briefings for 90 symposium guests.",
        claimedHours: 38,
        supervisorUserId: employerUser.id,
        supervisorConfirmedHours: 0,
        supervisorAssessedSkills: [],
        supervisorReviewNote: "",
        hoursEnteredToPassport: false,
        auditLog: [
          {
            date: "2026-10-02",
            actor: "Kudzai Sibanda (Zambezi Canopy Eco-Lodge)",
            state: "Terms confirmed",
            detail: "Application accepted and placement terms initialised (40 expected hours).",
          },
          {
            date: "2026-10-05",
            actor: "Tariro Moyo",
            state: "In progress",
            detail: "Member confirmed shift schedule, transport, and assessment expectations.",
          },
        ],
      },
    ]);

    // 9. Create Social Posts (Chronological feed with Work showcase, Learning update, Achievement, Industry update)
    const insertedPosts = await db
      .insert(posts)
      .values([
        {
          authorId: studentUser.id,
          postType: "Work showcase",
          caption:
            "Redesigned the guest arrival and sunset cruise briefing workflow during our front-office lab in Bulawayo! By preparing pre-arrival dietary & transfer cards, we cut simulated reception queue times by over 60%. Linked to my Portfolio case study for feedback from front-office managers.",
          mediaUrl: "/src/assets/images/nyanga_front_office_1791386453942.jpg",
          mediaType: "image",
          skillTags: [
            "Guest Check-In & Concierge Protocol",
            "Property Management Systems (PMS)",
            "Itinerary & Transfer Coordination",
          ],
          locationTag: "Bulawayo, Zimbabwe",
          linkedPortfolioId: insertedPortfolios[0].id,
          linkedPassportId: insertedPassports[1].id,
          likesCount: 18,
          commentsCount: 2,
          savesCount: 7,
          isDemo: true,
        },
        {
          authorId: guideUser.id,
          organisationId: lodgeOrg.id,
          postType: "Learning update",
          caption:
            "Early morning walking trail in Hwange sector. When mentoring learner guides, we always practise reading wind direction with ash bags and interpreting fresh elephant spoor before approaching any pan. Note: We have a 3-month Wet-Season Learner Guide Apprenticeship open at Zambezi Canopy Eco-Lodge!",
          mediaUrl: "/src/assets/images/hwange_safari_guiding_1791386430930.jpg",
          mediaType: "image",
          skillTags: [
            "Wildlife Track & Sign Interpretation",
            "Guest Safety & Bush Briefing",
            "Conservation Ethics & Community Liaison",
          ],
          locationTag: "Hwange National Park, Zimbabwe",
          linkedPortfolioId: insertedPortfolios[1].id,
          linkedOpportunityId: insertedOpps[1].id,
          likesCount: 34,
          commentsCount: 1,
          savesCount: 15,
          isDemo: true,
        },
        {
          authorId: chefUser.id,
          postType: "Achievement",
          caption:
            "Plating test from our autumn Eastern Highlands tasting menu: smoked Nyanga rainbow trout over creamy pearl millet & sorghum risotto with a tangy baobab reduction. Proud to have my National Diploma in Professional Cookery verified in my Talent Passport.",
          mediaUrl: "/src/assets/images/harare_culinary_plating_1791386442823.jpg",
          mediaType: "image",
          skillTags: [
            "Contemporary Zimbabwean Menu Plating",
            "Food Safety & HACCP Hygiene",
            "Bush Dinner & Remote Catering Logistics",
          ],
          locationTag: "Nyanga, Eastern Highlands",
          linkedPortfolioId: insertedPortfolios[2].id,
          linkedPassportId: insertedPassports[5].id,
          likesCount: 29,
          commentsCount: 1,
          savesCount: 11,
          isDemo: true,
        },
        {
          authorId: employerUser.id,
          organisationId: lodgeOrg.id,
          postType: "Industry update",
          caption:
            "Golden hour on the upper Zambezi deck. As green season approaches in Victoria Falls, we are expanding our Skill2Shift practical assignments so hospitality students can earn confirmed hours and competency assessments without relocating permanently.",
          mediaUrl: "/src/assets/images/vicfalls_lodge_safari_1791386419455.jpg",
          mediaType: "image",
          skillTags: [
            "Guest Check-In & Concierge Protocol",
            "Bush Dinner & Remote Catering Logistics",
          ],
          locationTag: "Victoria Falls, Zimbabwe",
          linkedOpportunityId: insertedOpps[0].id,
          likesCount: 42,
          commentsCount: 0,
          savesCount: 19,
          isDemo: true,
        },
      ])
      .returning();

    // 10. Create Post Comments
    await db.insert(postComments).values([
      {
        postId: insertedPosts[0].id,
        authorId: employerUser.id,
        content:
          "Impressive attention to transfer manifests, Tariro. Pre-arrival briefing cards make a huge difference when flights land simultaneously in Victoria Falls.",
      },
      {
        postId: insertedPosts[0].id,
        authorId: institutionUser.id,
        content:
          "Well done Tariro! Great example of translating classroom PMS theory into practical guest service.",
      },
      {
        postId: insertedPosts[1].id,
        authorId: studentUser.id,
        content:
          "Thank you for sharing these field safety principles, Farai. The apprenticeship listing looks like a wonderful opportunity for guiding students.",
      },
      {
        postId: insertedPosts[2].id,
        authorId: employerUser.id,
        content:
          "Exceptional local sourcing, Chef Nyasha! Looking forward to reviewing your application for our Victoria Falls kitchen.",
      },
    ]);

    // 11. Create Social Relationships (Follows & Accepted Connections)
    await db.insert(socialRelationships).values([
      {
        requesterId: studentUser.id,
        targetId: guideUser.id,
        relType: "follow",
        status: "accepted",
      },
      {
        requesterId: studentUser.id,
        targetId: employerUser.id,
        relType: "follow",
        status: "accepted",
      },
      {
        requesterId: studentUser.id,
        targetId: chefUser.id,
        relType: "follow",
        status: "accepted",
      },
      {
        requesterId: studentUser.id,
        targetId: guideUser.id,
        relType: "connection",
        status: "accepted",
      },
      {
        requesterId: chefUser.id,
        targetId: studentUser.id,
        relType: "connection",
        status: "pending",
      },
    ]);

    // 12. Create Messages & Notifications
    await db.insert(messages).values([
      {
        senderId: employerUser.id,
        receiverId: studentUser.id,
        applicationContextId: insertedApps[0].id,
        content:
          "Hello Tariro, welcome to the Skill2Shift assignment at Zambezi Canopy Eco-Lodge! Once you complete your shifts, submit your completion summary in the Placements tracker so I can confirm your hours and assess your front-office skills.",
        isRead: false,
      },
      {
        senderId: studentUser.id,
        receiverId: employerUser.id,
        applicationContextId: insertedApps[0].id,
        content:
          "Thank you Mr. Sibanda! I have confirmed the placement terms and am recording my reception desk shifts now.",
        isRead: true,
      },
      {
        senderId: guideUser.id,
        receiverId: studentUser.id,
        content:
          "Hi Tariro, happy to connect on TourBridge. Let me know if you ever want tips on combining front-office guest relations with safari briefing!",
        isRead: true,
      },
    ]);

    await db.insert(notifications).values([
      {
        userId: studentUser.id,
        category: "placement",
        title: "Placement In Progress: Zambezi Canopy Eco-Lodge",
        body: "Your 40-hour Skill2Shift placement is active. Submit your completion summary when ready for supervisor review.",
        linkTab: "opportunities",
        isRead: false,
      },
      {
        userId: studentUser.id,
        category: "verification",
        title: "Credential Verified by Bulawayo School of Hospitality",
        body: "Dr. Chipo Mutasa verified your BSc Tourism & Hospitality academic transcript (Fictional Demo).",
        linkTab: "profile",
        isRead: false,
      },
      {
        userId: studentUser.id,
        category: "connection",
        title: "Connection Request from Nyasha Chikwanda",
        body: "Sous Chef Nyasha Chikwanda sent you a professional connection request.",
        linkTab: "profile",
        isRead: false,
      },
    ]);

    // 13. Create Moderation Reports & Audit Events for Admin Workspace
    await db.insert(reports).values([
      {
        reporterUserId: guideUser.id,
        targetType: "organisation",
        targetId: pendingOrg.id,
        reason: "Pending Organisation Verification Review",
        details:
          "Eastern Highlands Trails & Expeditions submitted tour operator registration details and is awaiting administrator approval before publishing opportunities.",
        status: "open",
      },
      {
        reporterUserId: employerUser.id,
        targetType: "credential",
        targetId: insertedPassports[3].id,
        reason: "Routine Credential Audit Check",
        details:
          "Sample moderation queue item showing how self-declared certificates remain clearly marked as Self-declared until verified by an authorised issuer.",
        status: "open",
      },
    ]);

    await db.insert(auditEvents).values([
      {
        actorUserId: adminUser.id,
        actorName: "Tendai Gumbo (Platform Admin Demo)",
        actionType: "ORG_APPROVED",
        entityType: "organisation",
        entityId: lodgeOrg.id,
        summary:
          "Approved Zambezi Canopy Eco-Lodge (Fictional Demo) after reviewing private ZTA operator documentation.",
      },
      {
        actorUserId: adminUser.id,
        actorName: "Tendai Gumbo (Platform Admin Demo)",
        actionType: "ORG_APPROVED",
        entityType: "organisation",
        entityId: institutionOrg.id,
        summary:
          "Approved Bulawayo School of Hospitality & Tourism (Fictional Demo) as an authorised credential-issuing training institution.",
      },
      {
        actorUserId: employerUser.id,
        actorName: "Kudzai Sibanda (Fictional Demo Employer)",
        actionType: "PASSPORT_CONFIRMED",
        entityType: "passport_record",
        entityId: insertedPassports[1].id,
        summary:
          "Confirmed 24 practical shift hours for Tariro Moyo (August Conservation Conference).",
      },
    ]);

    console.log("TourBridge seed data populated successfully.");
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}
