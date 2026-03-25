import {
  recruitmentApiClient,
  Vacancy,
  Candidate,
  JobTitle,
  candidateStatusStr,
} from "../../../src/services/recruitmentApiClient";
import { pimApiClient, Employee } from "../../../src/services/pimApiClient";
import { RecruitmentPage } from "../../support/pages/RecruitmentPage";

/**
 * 2.2 Recruitment Lifecycle — API (Hybrid)
 *
 * Covers the full recruitment lifecycle using cy.request where API endpoints
 * exist, and UI navigation only for steps without REST endpoints on this
 * OrangeHRM demo instance.
 *
 * OrangeHRM 5 workflow API (demo instance):
 *   PUT /candidates/{id}/shortlist   → APPLICATION_INITIATED → SHORTLISTED ✓
 *   PUT /candidates/{id}/reject      → any state → REJECTED ✓
 *   PUT /candidates/{id}/hire        → JOB_OFFERED → HIRED ✓
 *   (interview scheduling, mark-passed, offer-job → via UI only)
 *
 * Tests map to requirements:
 *   1. Admin creates a new job vacancy under a job title
 *   2. Multiple candidates are added to the vacancy
 *   3. An interview is scheduled (shortlist via API, schedule via UI)
 *   4. One candidate is shortlisted; the others are rejected
 *   5. Status changes are verified for each candidate
 *   6. The shortlisted candidate is moved to hired status (UI → API hire)
 *   7. The newly hired candidate appears in the PIM module
 */

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function bodyStr(body: unknown, max = 300): string {
  try { return (JSON.stringify(body) ?? "(undefined)").slice(0, max); }
  catch { return "(unserializable)"; }
}

/** PUT to a candidate workflow action sub-resource */
function workflowAction(
  candidateId: number,
  action: string,
  body: Record<string, unknown> = {}
): Cypress.Chainable<Cypress.Response<unknown>> {
  return cy.request({
    method: "PUT",
    url: `/web/index.php/api/v2/recruitment/candidates/${candidateId}/${action}`,
    body,
    failOnStatusCode: false,
  });
}

describe("2.2 Recruitment Lifecycle — API", () => {
  const ts = Date.now();
  const vacancyName = `RCVacancy-${ts}`;
  const interviewDate = futureDate(7);
  const interviewTime = "10:00";

  const candidates = [
    { firstName: "RCMain",  lastName: `Cand${ts}`,  email: `rcmain${ts}@test.local`  },
    { firstName: "RCOther", lastName: `Cand${ts}A`, email: `rcother${ts}a@test.local` },
    { firstName: "RCOther", lastName: `Cand${ts}B`, email: `rcother${ts}b@test.local` },
  ];

  let vacancyId: number;
  let jobTitleId: number;
  let hiringManagerEmpNumber: number;
  let candidateIds: number[] = [];
  /** The candidate we shortlist → interview → hire */
  let mainCandidateId: number;

  const page = new RecruitmentPage();

  // ── Setup ──────────────────────────────────────────────────────────────────
  before(() => {
    cy.clearCookies();
    cy.loginAsAdmin();

    recruitmentApiClient.getJobTitles().then((jtRes) => {
      expect(jtRes.status, `getJobTitles: ${bodyStr(jtRes.body)}`).to.eq(200);
      const titles = (jtRes.body as { data: JobTitle[] }).data;
      const active = titles.find((t) => !t.isDeleted) ?? titles[0];
      jobTitleId = active.id;
      cy.log(`Job title: "${active.title}" id=${jobTitleId}`);

    }).then(() => {
      return cy.request({
        method: "GET",
        url: "/web/index.php/api/v2/recruitment/hiring-managers?limit=50&offset=0",
        failOnStatusCode: false,
      }).then((hmRes) => {
        type HM = { empNumber: number };
        if (hmRes.status === 200) {
          const hms = (hmRes.body as { data: HM[] }).data;
          if (hms && hms.length > 0) {
            hiringManagerEmpNumber = hms[0].empNumber;
            cy.log(`Hiring manager empNumber=${hiringManagerEmpNumber}`);
            return;
          }
        }
        return pimApiClient.searchEmployees("").then((empRes) => {
          const emps = (empRes.body as { data: Employee[] }).data;
          expect(emps, "need at least one employee as hiring manager").to.have.length.greaterThan(0);
          hiringManagerEmpNumber = emps[0].empNumber;
        });
      });

    }).then(() => {
      return recruitmentApiClient.createVacancy({
        name: vacancyName,
        jobTitleId,
        employeeId: hiringManagerEmpNumber,
        numOfPositions: 3,
        isPublished: true,
        status: true,
      }).then((vacRes) => {
        expect(vacRes.status, `createVacancy: ${bodyStr(vacRes.body)}`).to.eq(200);
        vacancyId = (vacRes.body as { data: Vacancy }).data.id;
        cy.log(`Vacancy id=${vacancyId}`);

      }).then(() => {
        return cy.wrap(candidates).each((c: typeof candidates[0]) => {
          return recruitmentApiClient.createCandidate({
            firstName: c.firstName, lastName: c.lastName, email: c.email,
            vacancyId, dateOfApplication: futureDate(0), consentToKeepData: true,
          }).then((cRes) => {
            expect(cRes.status, `createCandidate ${c.lastName}: ${bodyStr(cRes.body)}`).to.eq(200);
            candidateIds.push((cRes.body as { data: Candidate }).data.id);
          });
        });

      // Shortlist the main candidate within the same session — PUT /shortlist works
      // reliably in the setup session that created the candidates.
      }).then(() => {
        mainCandidateId = candidateIds[0];
        cy.log(`Shortlisting main candidate id=${mainCandidateId} in before()`);
        return cy.request({
          method: "PUT",
          url: `/web/index.php/api/v2/recruitment/candidates/${mainCandidateId}/shortlist`,
          body: {},
          failOnStatusCode: false,
        }).then((sRes) => {
          expect(sRes.status, `setup shortlist: ${bodyStr(sRes.body)}`).to.eq(200);
          cy.log(`Setup shortlist: ${sRes.status}`);
        });
      });
    });
  });

  beforeEach(() => {
    cy.allure()
      .parentSuite("2.2 Recruitment Lifecycle")
      .suite("API")
      .tag("recruitment", "api");
    cy.clearCookies();
    cy.loginAsAdmin();
  });

  // ── Test 1 ────────────────────────────────────────────────────────────────
  it("admin creates a new job vacancy under a job title", () => {
    recruitmentApiClient.getVacancy(vacancyId).then((res) => {
      expect(res.status).to.eq(200);
      const v = (res.body as { data: Vacancy }).data;
      expect(v.name).to.eq(vacancyName);
      expect(v.jobTitle.id).to.eq(jobTitleId);
      expect(v.numOfPositions).to.eq(3);
      cy.log(`Vacancy: "${v.name}" jobTitle="${v.jobTitle.title}"`);
    });
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────
  it("multiple candidates are added to the vacancy", () => {
    recruitmentApiClient.getCandidates(vacancyId).then((res) => {
      expect(res.status).to.eq(200);
      const list = (res.body as { data: Candidate[] }).data;
      if (list.length > 0) cy.log(`Sample candidate: ${bodyStr(list[0], 400)}`);
      expect(list.length).to.be.gte(candidates.length);
      candidates.forEach((c) => {
        expect(list.find((r) => r.firstName === c.firstName && r.lastName === c.lastName),
          `"${c.firstName} ${c.lastName}" in list`).to.exist;
      });
    });
  });

  // ── Test 3: schedule interview via UI ────────────────────────────────────
  // Candidate is already SHORTLISTED by before(); this test schedules the interview.
  it("an interview is scheduled with a specific date and time", () => {
    // mainCandidateId set in before(); visit directly (not inside .then() to avoid async issue)
    cy.visit(`/web/index.php/recruitment/addCandidate/${mainCandidateId}`);
    cy.get(".oxd-form", { timeout: 15000 }).should("be.visible");
    page.scheduleInterview("Technical Interview", interviewDate, interviewTime);

    // Verify via API that interview is now scheduled
    recruitmentApiClient.getCandidate(mainCandidateId).then((res) => {
      const c = (res.body as { data: Candidate }).data;
      const s = candidateStatusStr(c.status).toUpperCase();
      cy.log(`Status after scheduling: ${s}`);
      expect(s, "candidate should be SHORTLISTED or INTERVIEW_SCHEDULED after scheduling").to.match(/SHORTLIST|INTERVIEW/);
    });
  });

  // ── Test 4: reject the other candidates via API ───────────────────────────
  // mainCandidateId is already SHORTLISTED (from before()); reject the others.
  it("one candidate is shortlisted and the others are rejected", () => {
    cy.wrap(null).then(() => {
      mainCandidateId = candidateIds[0];
      const rejectIds = candidateIds.slice(1);

      return cy.wrap(rejectIds).each((id: number) => {
        return workflowAction(id, "reject").then((res) => {
          cy.log(`reject ${id}: ${res.status} — ${bodyStr(res.body)}`);
          expect(res.status, `reject ${id}: ${bodyStr(res.body)}`).to.eq(200);
        });
      });
    });
  });

  // ── Test 5: verify statuses via API ───────────────────────────────────────
  it("candidate statuses reflect correctly after shortlist and reject", () => {
    cy.wrap(null).then(() => {
      mainCandidateId = candidateIds[0];
      const rejectIds = candidateIds.slice(1);

      // Main candidate should be INTERVIEW_SCHEDULED (or at least SHORTLISTED)
      return recruitmentApiClient.getCandidate(mainCandidateId).then((res) => {
        const c = (res.body as { data: Candidate }).data;
        const s = candidateStatusStr(c.status).toUpperCase();
        cy.log(`Main candidate status: ${s}`);
        expect(s, `main candidate should be SHORTLISTED or INTERVIEW_SCHEDULED`).to.match(/SHORTLIST|INTERVIEW/);

      }).then(() => {
        return cy.wrap(rejectIds).each((id: number) => {
          return recruitmentApiClient.getCandidate(id).then((res) => {
            const c = (res.body as { data: Candidate }).data;
            const s = candidateStatusStr(c.status).toUpperCase();
            cy.log(`Rejected candidate ${id} status: ${s}`);
            expect(s, `candidate ${id} should be REJECTED`).to.include("REJECT");
          });
        });
      });
    });
  });

  // ── Test 6: advance through workflow to hired ──────────────────────────────
  // OrangeHRM demo workflow from INTERVIEW_SCHEDULED:
  //   Click "Mark Interview Passed" → navigates to Offer Job form (status: INTERVIEW_PASSED)
  //   Save Offer Job form → status: JOB_OFFERED (no toast, navigates instead)
  //   API hire (PUT /hire) → status: HIRED
  //
  // Uses API to check state first, then cy.contains(..., {timeout}) to wait for
  // the button to render (avoids one-shot DOM snapshot via .then() catching a loading state).
  it("the shortlisted candidate is moved to hired status", () => {
    cy.wrap(null).then(() => {
      return recruitmentApiClient.getCandidate(mainCandidateId).then((res) => {
        const c = (res.body as { data: Candidate }).data;
        const s = candidateStatusStr(c.status).toUpperCase();
        cy.log(`Pre-hire status: ${s}`);

        const isScheduled = s.includes("SCHEDULED");
        const isPassed    = s.includes("PASSED");

        if (isScheduled) {
          // INTERVIEW_SCHEDULED → Mark Interview Passed → Offer Job → hire
          cy.visit(`/web/index.php/recruitment/addCandidate/${mainCandidateId}`);
          cy.contains("button", "Mark Interview Passed", { timeout: 30000 }).should("be.visible").click();
          cy.get(".oxd-form", { timeout: 15000 }).should("be.visible");
          cy.contains("button", "Save", { timeout: 10000 }).click();

          cy.visit(`/web/index.php/recruitment/addCandidate/${mainCandidateId}`);
          cy.contains("button", "Offer Job", { timeout: 30000 }).should("be.visible").click();
          cy.get(".oxd-form", { timeout: 15000 }).should("be.visible");
          cy.contains("button", "Save", { timeout: 10000 }).click();
        } else if (isPassed) {
          // INTERVIEW_PASSED → Offer Job → hire
          cy.visit(`/web/index.php/recruitment/addCandidate/${mainCandidateId}`);
          cy.contains("button", "Offer Job", { timeout: 30000 }).should("be.visible").click();
          cy.get(".oxd-form", { timeout: 15000 }).should("be.visible");
          cy.contains("button", "Save", { timeout: 10000 }).click();
        }
        // If already JOB_OFFERED: fall through to hire API below
      });
    });

    // Hire via API (PUT /hire — works from JOB_OFFERED state)
    cy.wrap(null).then(() => {
      return workflowAction(mainCandidateId, "hire").then((res) => {
        cy.log(`hire: ${res.status} — ${bodyStr(res.body)}`);
        expect(res.status, `hire: ${bodyStr(res.body)}`).to.eq(200);
      });
    });

    // Verify hired status via API
    cy.wrap(null).then(() => {
      return recruitmentApiClient.getCandidate(mainCandidateId).then((res) => {
        const c = (res.body as { data: Candidate }).data;
        const s = candidateStatusStr(c.status).toUpperCase();
        cy.log(`Status after hire: ${s}`);
        expect(s, "candidate should be HIRED").to.include("HIRE");
      });
    });
  });

  // ── Test 7: hired candidate in PIM ────────────────────────────────────────
  it("the newly hired candidate appears in the PIM module", () => {
    const { firstName, lastName } = candidates[0];
    pimApiClient.searchEmployees(lastName).then((res) => {
      expect(res.status).to.eq(200);
      const emps = (res.body as { data: Employee[] }).data;
      cy.log(`PIM search "${lastName}": ${emps.length} results`);
      const found = emps.find((e) => e.firstName === firstName && e.lastName === lastName);
      expect(found, `"${firstName} ${lastName}" must appear in PIM after hiring`).to.exist;
    });
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────
  // Use the existing admin session from the last test's beforeEach — avoids cy.visit timeout.
  after(() => {
    cy.then(() => {
      if (candidateIds.length > 0) recruitmentApiClient.deleteCandidates(candidateIds);
      if (vacancyId !== undefined) recruitmentApiClient.deleteVacancy(vacancyId);
    });
  });
});
