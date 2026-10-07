/**
 * TourBridge Zimbabwe — Automated Verification & Acceptance Test Suite
 *
 * Verifies all server-side RBAC, privacy, and state-transition invariants:
 * 1. Unauthorised users cannot edit another member or organisation.
 * 2. Pending organisations cannot publish opportunities.
 * 3. Members cannot verify their own experience.
 * 4. Private evidence is inaccessible to unauthorised users.
 * 5. Closed opportunities reject new applications.
 * 6. Finalised placements cannot double-count hours.
 * 7. Likes and follower counts do not affect skill verification.
 * 8. Application and verification states follow allowed transitions.
 * 9. Complete End-to-End Scenario: Member creates profile/portfolio -> applies to approved employer opportunity -> accepted -> completes placement -> supervisor assesses hours & skills -> finalised into Talent Passport.
 */

const BASE_URL = "http://127.0.0.1:3000";

async function req(
  persona: string,
  path: string,
  method = "GET",
  body?: Record<string, any>
) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer demo-persona:${persona}`,
      "x-demo-persona": persona,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

async function runTests() {
  console.log("=== Running TourBridge Acceptance & Security Verification Suite ===");

  // Warm up & load demo accounts
  const studentMe = await req("demo-student", "/api/me");
  const guideMe = await req("demo-guide", "/api/me");
  const chefMe = await req("demo-hospitality", "/api/me");
  const employerMe = await req("demo-employer", "/api/me");

  assert(studentMe.status === 200, "Seed data & student session loaded");
  const studentId = studentMe.data.user.id;
  const guideId = guideMe.data.user.id;

  // TEST 1: Unauthorised users cannot edit another member or organisation
  const editOtherMember = await req("demo-student", `/api/members/${guideId}`, "PUT", {
    bio: "Unauthorized hijack attempt",
  });
  assert(
    editOtherMember.status === 403,
    "Unauthorised user cannot edit another member's profile (403)"
  );

  const orgsRes = await req("demo-student", "/api/organisations");
  const approvedLodge = orgsRes.data.organisations.find(
    (o: any) => o.slug === "zambezi-canopy-ecolodge-demo"
  );
  const pendingOrg = orgsRes.data.organisations.find(
    (o: any) => o.slug === "eastern-highlands-trails-demo"
  );

  const editOtherOrg = await req(
    "demo-student",
    `/api/organisations/${approvedLodge.id}`,
    "PUT",
    { description: "Unauthorized org edit" }
  );
  assert(
    editOtherOrg.status === 403,
    "Unauthorised user cannot edit another organisation (403)"
  );

  // TEST 2: Pending organisations cannot publish opportunities
  const publishByPendingOrg = await req("demo-hospitality", "/api/opportunities", "POST", {
    organisationId: pendingOrg.id,
    title: "Unauthorized Trekking Guide",
    opportunityType: "Skill2Shift",
    location: "Nyanga",
    compensationType: "Stipend / Allowance",
    description: "Should fail because org is pending",
  });
  assert(
    publishByPendingOrg.status === 403,
    "Pending organisations cannot publish opportunities (403)"
  );

  // TEST 3: Members cannot verify their own experience
  const createSelfPassport = await req("demo-student", "/api/passport", "POST", {
    recordCategory: "Certificate",
    title: "Self-Declared Guiding Workshop",
    issuerOrOrganisationName: "Zambezi Canopy Eco-Lodge (Fictional Demo)",
    organisationId: approvedLodge.id,
    publicSummary: "Testing self-verification block",
  });
  const selfRecordId = createSelfPassport.data.record.id;

  const selfVerifyAttempt = await req(
    "demo-student",
    `/api/passport/${selfRecordId}/verify`,
    "POST",
    { action: "confirm", confirmedHours: 50 }
  );
  assert(
    selfVerifyAttempt.status === 403,
    "Members cannot verify their own Talent Passport experience (403)"
  );

  // TEST 4: Private evidence is inaccessible to unauthorised users
  const studentPassportWithPrivateDoc = studentMe.data.metrics.records.find(
    (r: any) => r.privateEvidenceDocId
  );
  const privateDocId = studentPassportWithPrivateDoc.privateEvidenceDocId;

  const ownerDocAccess = await req(
    "demo-student",
    `/api/private-documents/${privateDocId}`
  );
  assert(ownerDocAccess.status === 200, "Document owner can access their private evidence");

  const unauthorizedDocAccess = await req(
    "demo-hospitality",
    `/api/private-documents/${privateDocId}`
  );
  assert(
    unauthorizedDocAccess.status === 403,
    "Private evidence is inaccessible to unauthorised users (403)"
  );

  // TEST 5: Closed opportunities reject new applications
  const createTestOpp = await req("demo-employer", "/api/opportunities", "POST", {
    organisationId: approvedLodge.id,
    title: "E2E Scenario: 16-Hour Sunset Barge Concierge Shift",
    opportunityType: "Skill2Shift",
    location: "Victoria Falls",
    description: "Practical shift for E2E verification",
    requiredSkills: [
      "Guest Check-In & Concierge Protocol",
      "Cross-Cultural Communication",
    ],
    expectedHours: 16,
    compensationType: "Stipend / Allowance",
    compensationAmount: "USD $50",
    applicationDeadline: "2026-11-30",
  });
  const testOppId = createTestOpp.data.opportunity.id;

  // Close it first to test rejection
  await req("demo-employer", `/api/opportunities/${testOppId}/status`, "PUT", {
    status: "closed",
  });
  const applyToClosed = await req(
    "demo-student",
    `/api/opportunities/${testOppId}/apply`,
    "POST",
    { supportingMessage: "Trying to apply to closed listing" }
  );
  assert(
    applyToClosed.status === 400,
    "Closed opportunities reject new applications (400)"
  );

  // Reopen listing for complete E2E journey
  await req("demo-employer", `/api/opportunities/${testOppId}/status`, "PUT", {
    status: "open",
  });

  // TEST 6: Likes and follower counts do not affect skill verification
  const beforeMetrics = (await req("demo-student", "/api/me")).data.metrics;
  const feedPosts = (await req("demo-guide", "/api/posts")).data.posts;
  const studentPost = feedPosts.find((p: any) => p.author.id === studentId);
  if (studentPost) {
    await req("demo-guide", `/api/posts/${studentPost.id}/interact`, "POST", {
      interactionType: "like",
    });
  }
  await req("demo-hospitality", "/api/relationships", "POST", {
    targetId: studentId,
    relType: "follow",
    action: "create",
  });
  const afterMetrics = (await req("demo-student", "/api/me")).data.metrics;
  assert(
    beforeMetrics.confirmedPracticalHours === afterMetrics.confirmedPracticalHours &&
      beforeMetrics.assessedSkills.length === afterMetrics.assessedSkills.length,
    "Likes and follower counts do not affect confirmed hours or skill verification"
  );

  // TEST 7 & 8: Complete End-to-End Scenario + Single-Count Finalisation Invariant
  // Step A: Student publishes portfolio evidence
  const newPortfolio = await req("demo-student", "/api/portfolio", "POST", {
    title: "Barge Boarding Safety & Manifest Checklist",
    description: "Created a manifest template for sunset river cruises.",
    skillTags: ["Guest Check-In & Concierge Protocol"],
  });
  assert(newPortfolio.status === 201, "Student published portfolio evidence");

  // Step B: Student applies to approved employer's open opportunity
  const applyRes = await req(
    "demo-student",
    `/api/opportunities/${testOppId}/apply`,
    "POST",
    {
      supportingMessage: "Applying with my portfolio and Talent Passport.",
      attachedPassportIds: [selfRecordId],
    }
  );
  assert(applyRes.status === 201, "Student applied to open opportunity");
  const appId = applyRes.data.application.id;

  // Step C: Employer shortlists and accepts candidate -> initializes placement in 'Terms confirmed'
  const shortlistRes = await req(
    "demo-employer",
    `/api/applications/${appId}/status`,
    "PUT",
    { nextStatus: "Shortlisted" }
  );
  assert(
    shortlistRes.data.application.status === "Shortlisted",
    "Application transitioned Submitted -> Shortlisted"
  );

  const acceptRes = await req(
    "demo-employer",
    `/api/applications/${appId}/status`,
    "PUT",
    { nextStatus: "Accepted" }
  );
  assert(
    acceptRes.data.application.status === "Accepted" && acceptRes.data.placement,
    "Application transitioned Shortlisted -> Accepted and initialised Placement"
  );
  const placementId = acceptRes.data.placement.id;

  // Step D: Start placement -> Submit completion -> Supervisor reviews hours & specific skills -> Member accepts to finalise
  await req("demo-student", `/api/placements/${placementId}/transition`, "POST", {
    action: "start_in_progress",
  });
  await req("demo-student", `/api/placements/${placementId}/transition`, "POST", {
    action: "submit_completion",
    claimedHours: 16,
    memberCompletionSummary: "Completed 16 hours on barge manifest and guest check-in.",
  });
  const supReview = await req(
    "demo-employer",
    `/api/placements/${placementId}/transition`,
    "POST",
    {
      action: "supervisor_review",
      supervisorConfirmedHours: 16,
      supervisorAssessedSkills: [
        {
          skill: "Guest Check-In & Concierge Protocol",
          proficiency: "Demonstrated independently",
          note: "Handled 45 guest boardings smoothly",
        },
      ],
      supervisorReviewNote: "Confirmed 16 attendance hours and assessed 1 skill.",
    }
  );
  assert(
    supReview.data.placement.workflowState === "Supervisor reviewed",
    "Supervisor reviewed placement hours and specific assessed skills"
  );

  const hoursBeforeFinal = (await req("demo-student", "/api/me")).data.metrics
    .confirmedPracticalHours;

  const finaliseRes = await req(
    "demo-student",
    `/api/placements/${placementId}/transition`,
    "POST",
    { action: "member_accept_finalise" }
  );
  assert(
    finaliseRes.status === 200 &&
      finaliseRes.data.placement.workflowState === "Finalised",
    "Member accepted supervisor review and finalised placement"
  );

  const hoursAfterFinal = (await req("demo-student", "/api/me")).data.metrics
    .confirmedPracticalHours;
  assert(
    hoursAfterFinal === hoursBeforeFinal + 16,
    "Confirmed placement hours (+16 hrs) entered Talent Passport upon finalisation"
  );

  // Try to finalise a second time to verify double-counting is blocked
  const doubleFinaliseAttempt = await req(
    "demo-student",
    `/api/placements/${placementId}/transition`,
    "POST",
    { action: "member_accept_finalise" }
  );
  assert(
    doubleFinaliseAttempt.status === 400,
    "Finalised placements cannot double-count hours (400 rejected on repeat finalisation)"
  );

  console.log("=== ALL TOURBRIDGE ACCEPTANCE & SECURITY CHECKS PASSED ===");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
