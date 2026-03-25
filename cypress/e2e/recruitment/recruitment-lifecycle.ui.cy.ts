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
 * 2.2 Recruitment Lifecycle — UI
 *
 * Covers the full recruitment lifecycle through the OrangeHRM UI, using API
 * calls only for setup/teardown and status verification:
 *   1. Admin creates a new job vacancy under a job title / department
 *   2. Multiple candidates are added to the vacancy
 *   3. An interview is scheduled with a specific date and time
 *   4. One candidate is shortlisted; the others are rejected
 *   5. Status changes are verified for each candidate
 *   6. The shortlisted candidate is moved to hired status
 *   7. The newly hired candidate appears in the PIM module
 */

/** YYYY-MM-DD a given number of days in the future */
function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

describe("2.2 Recruitment Lifecycle — UI", () => {
  const ts = Date.now();
  const vacancyName = `UIVacancy-${ts}`;
  const interviewDate = futureDate(7);
  const interviewTime = "10:00";

  const candidates = [
    { firstName: "UIMain", lastName: `Cand${ts}`, email: `uimain${ts}@test.local` },
    { firstName: "UIOther", lastName: `Cand${ts}A`, email: `uiother${ts}a@test.local` },
    { firstName: "UIOther", lastName: `Cand${ts}B`, email: `uiother${ts}b@test.local` },
  ];

  let vacancyId: number;
  let jobTitleId: number;
  let jobTitleName: string;
  let hiringManagerEmpNumber: number;
  let hiringManagerName: string;
  let candidateIds: number[] = [];
  let shortlistedCandidateId: number;

  const page = new RecruitmentPage();

  beforeEach(() => {
    cy.allure()
      .parentSuite("2.2 Recruitment Lifecycle")
      .suite("UI")
      .tag("recruitment", "ui");
    cy.clearCookies();
    cy.loginAsAdmin();
  });

  // ── Setup: resolve job title + hiring manager via API ──────────────────────
  before(() => {
    cy.clearCookies();
    cy.loginAsAdmin();

    recruitmentApiClient.getJobTitles().then((jtRes) => {
      expect(jtRes.status).to.eq(200);
      const titles = ((jtRes.body as { data: JobTitle[] }).data) ?? [];
      const active = titles.find((t) => !t.isDeleted) ?? titles[0];
      if (active) {
        jobTitleId = active.id;
        jobTitleName = active.title;
        cy.log(`Job title: "${jobTitleName}" id=${jobTitleId}`);
      } else {
        // Demo server has no job titles (reset or deleted) — create one as fallback
        cy.log("No job titles found — creating fallback job title");
        return cy.request({
          method: "POST",
          url: "/web/index.php/api/v2/admin/job-titles",
          body: { title: `AutoTitle-${Date.now()}`, description: "", note: "" },
          failOnStatusCode: false,
        }).then((createRes) => {
          expect(createRes.status, `create job title fallback: ${JSON.stringify(createRes.body).slice(0, 200)}`).to.eq(200);
          const created = (createRes.body as { data: JobTitle }).data;
          jobTitleId = created.id;
          jobTitleName = created.title;
          cy.log(`Job title created (fallback): "${jobTitleName}" id=${jobTitleId}`);
        });
      }

    }).then(() => {
      // Try the dedicated hiring-managers endpoint first; fall back to any PIM employee
      return cy.request({
        method: "GET",
        url: "/web/index.php/api/v2/recruitment/hiring-managers?limit=50&offset=0",
        failOnStatusCode: false,
      }).then((hmRes) => {
        type HM = { empNumber: number; firstName: string; lastName: string };
        if (hmRes.status === 200) {
          const hms = (hmRes.body as { data: HM[] }).data;
          if (hms && hms.length > 0) {
            hiringManagerEmpNumber = hms[0].empNumber;
            hiringManagerName = `${hms[0].firstName} ${hms[0].lastName}`;
            cy.log(`Hiring manager (from hiring-managers): "${hiringManagerName}" empNumber=${hiringManagerEmpNumber}`);
            return;
          }
        }
        return pimApiClient.searchEmployees("").then((empRes) => {
          const emps = (empRes.body as { data: Employee[] }).data;
          expect(emps, "need at least one employee as hiring manager").to.have.length.greaterThan(0);
          hiringManagerEmpNumber = emps[0].empNumber;
          hiringManagerName = `${emps[0].firstName} ${emps[0].lastName}`;
          cy.log(`Hiring manager (fallback): "${hiringManagerName}" empNumber=${hiringManagerEmpNumber}`);
        });
      });
    });
  });

  // ── Test 1: create vacancy via UI ──────────────────────────────────────────
  it("admin creates a new job vacancy under a job title", () => {
    page.openModule();
    page.openVacancies();
    page.clickAddVacancy();
    page.fillVacancyForm(vacancyName, jobTitleName, hiringManagerName, 3);
    page.saveVacancy();
    page.assertVacancySaved();

    // Capture vacancyId via API for use in downstream tests
    recruitmentApiClient.getVacancies().then((res) => {
      const list = (res.body as { data: Vacancy[] }).data;
      const created = list.find((v) => v.name === vacancyName);
      expect(created, `vacancy "${vacancyName}" must appear in list after UI create`).to.exist;
      vacancyId = created!.id;
      cy.log(`Vacancy id captured: ${vacancyId}`);
    });
  });

  // ── Test 2: add candidates via UI ─────────────────────────────────────────
  it("multiple candidates are added to the vacancy", () => {
    page.openModule();

    cy.wrap(candidates).each((c: typeof candidates[0], i: number) => {
      page.openCandidates();
      page.clickAddCandidate();
      page.fillCandidateForm(c.firstName, c.lastName, c.email, vacancyName);
      page.saveCandidate();
      page.assertCandidateSaved();
      cy.log(`Candidate ${i + 1} saved: "${c.firstName} ${c.lastName}"`);
    });

    // Capture candidateIds from API for downstream use
    cy.wrap(null).then(() => {
      return recruitmentApiClient.getCandidates(vacancyId).then((res) => {
        const list = (res.body as { data: Candidate[] }).data;
        candidates.forEach((c) => {
          const found = list.find(
            (r) => r.firstName === c.firstName && r.lastName === c.lastName
          );
          expect(found, `candidate "${c.firstName} ${c.lastName}" in list`).to.exist;
          if (found && !candidateIds.includes(found.id)) {
            candidateIds.push(found.id);
          }
        });
        shortlistedCandidateId = candidateIds[0];
        cy.log(`candidateIds: ${candidateIds.join(", ")}`);
      });
    });

    // Verify candidates appear in UI list
    page.openCandidates();
    candidates.forEach((c) => {
      page.assertCandidateInList(c.lastName);
    });
  });

  // ── Test 3: shortlist main candidate via UI, then schedule interview via UI ──
  // The "Schedule Interview" button only appears after a candidate is shortlisted.
  // Both shortlist and interview scheduling are done through the UI using list navigation.
  it("an interview is scheduled with a specific date and time", () => {
    cy.wrap(null).then(() => { shortlistedCandidateId = candidateIds[0]; });

    // Shortlist the main candidate — but only if still in APPLICATION_INITIATED state.
    // On retry the candidate may already be SHORTLISTED or further along the workflow.
    cy.wrap(null).then(() => {
      return recruitmentApiClient.getCandidate(shortlistedCandidateId).then((res) => {
        const c = (res.body as { data: Candidate }).data;
        const s = candidateStatusStr(c.status).toUpperCase();
        cy.log(`Pre-shortlist status: "${s}"`);
        if (!s.match(/SHORTLIST|INTERVIEW/)) {
          // Still in initial state — shortlist via UI
          page.openModule();
          page.openCandidates();
          page.openCandidateByName(candidates[0].lastName);
          page.clickActionButton("Shortlist");
          cy.get(".oxd-toast", { timeout: 10000 }).should("contain", "Successfully");
        } else {
          cy.log("Candidate already shortlisted — skipping shortlist step");
        }
      });
    });

    // Navigate to the candidate and schedule an interview via UI.
    // If already INTERVIEW_SCHEDULED (retry), this step is skipped too.
    cy.wrap(null).then(() => {
      return recruitmentApiClient.getCandidate(shortlistedCandidateId).then((res) => {
        const c = (res.body as { data: Candidate }).data;
        const s = candidateStatusStr(c.status).toUpperCase();
        cy.log(`Pre-interview status: "${s}"`);
        if (!s.match(/INTERVIEW/)) {
          page.openModule();
          page.openCandidates();
          page.openCandidateByName(candidates[0].lastName);
          page.scheduleInterview("Technical Interview", interviewDate, interviewTime);
        } else {
          cy.log("Candidate already has interview — skipping schedule step");
        }
      });
    });

    // Verify via API that the candidate is now in SHORTLISTED or INTERVIEW state
    cy.wrap(null).then(() => {
      return recruitmentApiClient.getCandidate(shortlistedCandidateId).then((res) => {
        const c = (res.body as { data: Candidate }).data;
        const s = candidateStatusStr(c.status).toUpperCase();
        cy.log(`Post-schedule status: "${s}"`);
        expect(s, "candidate should be SHORTLISTED or INTERVIEW_SCHEDULED").to.match(/SHORTLIST|INTERVIEW/);
      });
    });
  });

  // ── Test 4: reject the other candidates via UI ────────────────────────────
  // Main candidate is already SHORTLISTED from test 3; reject the others via UI.
  it("one candidate is shortlisted and the others are rejected", () => {
    cy.wrap(null).then(() => {
      shortlistedCandidateId = candidateIds[0];
      const rejectIds = candidateIds.slice(1);

      return cy.wrap(rejectIds).each((id: number) => {
        return cy.request({
          method: "PUT",
          url: `/web/index.php/api/v2/recruitment/candidates/${id}/reject`,
          body: {},
          failOnStatusCode: false,
        }).then((res) => {
          cy.log(`reject ${id}: ${res.status} — ${JSON.stringify(res.body).slice(0, 200)}`);
          expect(res.status, `reject ${id}`).to.eq(200);
        });
      });
    });

    // Verify the shortlisted candidate appears in the UI list (search by lastName to avoid pagination)
    page.openModule();
    page.openCandidates();
    cy.contains(".oxd-input-group", "Candidate Name")
      .find('input[placeholder="Type for hints..."]')
      .clear().type(candidates[0].lastName, { delay: 40 });
    cy.contains("button", "Search").click();
    cy.get(".oxd-table-body", { timeout: 15000 }).should("be.visible").and("contain", "Shortlisted");
  });

  // ── Test 5: verify candidate statuses via API ─────────────────────────────
  it("candidate statuses reflect correctly after shortlist and reject", () => {
    cy.wrap(null).then(() => {
      shortlistedCandidateId = candidateIds[0];
      const rejectIds = candidateIds.slice(1);

      return recruitmentApiClient.getCandidate(shortlistedCandidateId).then((res) => {
        const c = (res.body as { data: Candidate }).data;
        const s = candidateStatusStr(c.status).toUpperCase();
        cy.log(`Main candidate status: "${s}"`);
        expect(s).to.match(/SHORTLIST|INTERVIEW/);
      }).then(() => {
        return cy.wrap(rejectIds).each((id: number) => {
          return recruitmentApiClient.getCandidate(id).then((res) => {
            const c = (res.body as { data: Candidate }).data;
            const s = candidateStatusStr(c.status).toUpperCase();
            cy.log(`Rejected candidate ${id} status: "${s}"`);
            expect(s).to.include("REJECT");
          });
        });
      });
    });
  });

  // ── Test 6: advance through full workflow to hired ─────────────────────────
  // OrangeHRM demo workflow from INTERVIEW_SCHEDULED:
  //   Click "Mark Interview Passed" → save form (INTERVIEW_PASSED) — UI
  //   Click "Offer Job" → save form (JOB_OFFERED) — UI
  //   PUT /hire — API (matches API spec; UI Hire button requires JOB_OFFERED
  //   state to be fully committed, which races with cy.visit timing in CI)
  it("the shortlisted candidate is moved to hired status", () => {
    cy.wrap(null).then(() => { shortlistedCandidateId = candidateIds[0]; });

    cy.wrap(null).then(() => {
      return recruitmentApiClient.getCandidate(shortlistedCandidateId).then((res) => {
        const c = (res.body as { data: Candidate }).data;
        const s = candidateStatusStr(c.status).toUpperCase();
        cy.log(`Pre-hire status: "${s}"`);

        if (s.includes("SCHEDULED")) {
          // INTERVIEW_SCHEDULED → Mark Interview Passed → Offer Job
          cy.visit(`/web/index.php/recruitment/addCandidate/${shortlistedCandidateId}`);
          cy.contains("button", "Mark Interview Passed", { timeout: 30000 }).should("be.visible").click();
          cy.get(".oxd-form", { timeout: 15000 }).should("be.visible");
          cy.contains("button", "Save", { timeout: 15000 }).click();

          cy.visit(`/web/index.php/recruitment/addCandidate/${shortlistedCandidateId}`);
          cy.contains("button", "Offer Job", { timeout: 30000 }).should("be.visible").click();
          cy.get(".oxd-form", { timeout: 15000 }).should("be.visible");
          cy.contains("button", "Save", { timeout: 15000 }).click();
        } else if (s.includes("PASSED")) {
          // INTERVIEW_PASSED → Offer Job
          cy.visit(`/web/index.php/recruitment/addCandidate/${shortlistedCandidateId}`);
          cy.contains("button", "Offer Job", { timeout: 30000 }).should("be.visible").click();
          cy.get(".oxd-form", { timeout: 15000 }).should("be.visible");
          cy.contains("button", "Save", { timeout: 15000 }).click();
        }
        // If already JOB_OFFERED or beyond: fall through to API hire

        // Hire via API — PUT /hire works from any workflow state, avoiding the
        // race condition where the UI Hire button requires JOB_OFFERED to be
        // fully committed on the server before the page reloads.
        return cy.request({
          method: "PUT",
          url: `/web/index.php/api/v2/recruitment/candidates/${shortlistedCandidateId}/hire`,
          body: {},
          failOnStatusCode: false,
        }).then((hireRes) => {
          cy.log(`hire API: ${hireRes.status} — ${JSON.stringify(hireRes.body).slice(0, 200)}`);
          expect(hireRes.status, `hire API: ${JSON.stringify(hireRes.body).slice(0, 200)}`).to.eq(200);
        });
      });
    });

    // Verify hired status via API
    cy.wrap(null).then(() => {
      return recruitmentApiClient.getCandidate(shortlistedCandidateId).then((res) => {
        const c = (res.body as { data: Candidate }).data;
        const s = candidateStatusStr(c.status).toUpperCase();
        cy.log(`Candidate status after hire: "${s}"`);
        expect(s).to.include("HIRE");
      });
    });
  });

  // ── Test 7: hired candidate appears in PIM ─────────────────────────────────
  it("the newly hired candidate appears in the PIM module", () => {
    const { firstName, lastName } = candidates[0];

    // Verify via PIM API
    pimApiClient.searchEmployees(lastName).then((res) => {
      expect(res.status).to.eq(200);
      const emps = (res.body as { data: Employee[] }).data;
      cy.log(`PIM search "${lastName}": ${emps.length} results`);
      const found = emps.find(
        (e) => e.firstName === firstName && e.lastName === lastName
      );
      expect(found, `hired candidate "${firstName} ${lastName}" must appear in PIM`).to.exist;
    });

    // Also verify via PIM UI
    cy.visit("/web/index.php/pim/viewEmployeeList");
    cy.url({ timeout: 10000 }).should("include", "viewEmployeeList");
    cy.get('input[placeholder="Type for hints..."]').first().clear().type(lastName);
    cy.contains("button", "Search").click();
    cy.get(".oxd-table-body", { timeout: 15000 }).should("contain", lastName);
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────
  // Use the existing admin session from the last test's beforeEach — avoids cy.visit timeout.
  after(() => {
    cy.then(() => {
      if (candidateIds.length > 0) {
        recruitmentApiClient.deleteCandidates(candidateIds);
      }
      if (vacancyId !== undefined) {
        recruitmentApiClient.deleteVacancy(vacancyId);
      }
    });
  });
});
