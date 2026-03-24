import { apiClient } from "../../../src/services/apiClient";
import { pimApiClient } from "../../../src/services/pimApiClient";
import { leaveApiClient } from "../../../src/services/leaveApiClient";

interface TestData {
  credentials: { admin: { username: string; password: string } };
  employee: { firstName: string; lastName: string };
}

// ── Thresholds (ms) ──────────────────────────────────────────────────────────
const THRESHOLDS = {
  loginPageLoad: 2000,
  dashboardLoad: 3000,
  employeeListLoad: 3000,
  createEmployeeApi: 2000,
  applyLeaveSubmit: 2000,
  employeeSearchApi: 1000,
  reportGeneration: 5000,
};

// ── Helper ───────────────────────────────────────────────────────────────────
function assertTiming(label: string, elapsedMs: number, thresholdMs: number): void {
  const status = elapsedMs < thresholdMs ? "PASS" : "FAIL";
  cy.log(`[${status}] ${label}: ${elapsedMs}ms (limit: ${thresholdMs}ms)`);
  expect(
    elapsedMs,
    `"${label}" must complete in < ${thresholdMs}ms — actual: ${elapsedMs}ms`
  ).to.be.lessThan(thresholdMs);
}

// ── Suite ────────────────────────────────────────────────────────────────────
describe("Performance Benchmarks", () => {
  let adminUsername: string;
  let adminPassword: string;

  before(() => {
    cy.fixture("testData").then((data: TestData) => {
      adminUsername = data.credentials.admin.username;
      adminPassword = data.credentials.admin.password;
    });
  });

  // Tag every test in this suite as Performance so they appear under their own
  // top-level section in the Allure report Suites tree.
  beforeEach(() => {
    cy.allure().parentSuite("Performance Benchmarks").tag("performance");
  });

  // ── 1. Login page load ────────────────────────────────────────────────────
  it("login page loads in under 2 seconds (TTFB + DOM)", () => {
    cy.allure().suite("Page Load").story("Login page");
    let start: number;
    cy.wrap(null).then(() => {
      start = Date.now();
    });
    cy.visit("/web/index.php/auth/login");
    cy.get('button[type="submit"]')
      .should("be.visible")
      .then(() => {
        assertTiming("Login page load", Date.now() - start, THRESHOLDS.loginPageLoad);
      });
  });

  // ── 2. Dashboard load after login ─────────────────────────────────────────
  it("dashboard loads in under 3 seconds after submitting credentials", () => {
    cy.allure().suite("Page Load").story("Dashboard");
    let start: number;
    cy.visit("/web/index.php/auth/login");
    cy.get('input[name="username"]').type(adminUsername);
    cy.get('input[name="password"]').type(adminPassword, { log: false });
    cy.wrap(null).then(() => {
      start = Date.now();
    });
    cy.get('button[type="submit"]').click();
    // Wait for the authenticated shell (main nav + at least one dashboard widget)
    cy.get(".oxd-main-menu", { timeout: 25000 }).should("be.visible");
    cy.get(".oxd-layout-context", { timeout: 25000 })
      .should("be.visible")
      .then(() => {
        assertTiming("Dashboard load after login", Date.now() - start, THRESHOLDS.dashboardLoad);
      });
  });

  // ── Authenticated flows ───────────────────────────────────────────────────
  context("authenticated", () => {
    beforeEach(() => {
      apiClient.authenticate({ username: adminUsername, password: adminPassword });
    });

    // ── 3. Employee list page load ──────────────────────────────────────────
    it("employee list page loads in under 3 seconds", () => {
      cy.allure().suite("Page Load").story("Employee list");
      let start: number;
      cy.wrap(null).then(() => {
        start = Date.now();
      });
      cy.visit("/web/index.php/pim/viewEmployeeList");
      cy.get(".oxd-table-body", { timeout: THRESHOLDS.employeeListLoad + 3000 })
        .should("be.visible")
        .then(() => {
          assertTiming("Employee list page load", Date.now() - start, THRESHOLDS.employeeListLoad);
        });
    });

    // ── 4. Create employee — API response ───────────────────────────────────
    it("create employee API responds in under 2 seconds", () => {
      cy.allure().suite("API Response Time").story("Create employee");
      const ts = Date.now();
      pimApiClient
        .createEmployee({ firstName: `Perf${ts}`, lastName: "PerfTest" })
        .then((res) => {
          expect(res.status).to.eq(200);
          assertTiming("Create employee API response", res.duration, THRESHOLDS.createEmployeeApi);
          const empNumber = (res.body as { data: { empNumber: number } }).data.empNumber;
          pimApiClient.deleteEmployees([empNumber]);
        });
    });

    // ── 5. Apply leave — API response ───────────────────────────────────────
    it("apply leave API responds in under 2 seconds", () => {
      cy.allure().suite("API Response Time").story("Apply leave");
      leaveApiClient.getLeaveTypes().then((typesRes) => {
        const leaveTypes = (typesRes.body as { data: { id: number; name: string }[] }).data;
        expect(leaveTypes.length, "at least one leave type must exist").to.be.greaterThan(0);
        const leaveTypeId = leaveTypes[0].id;

        const future = new Date();
        future.setDate(future.getDate() + 30);
        while (future.getDay() === 0 || future.getDay() === 6) {
          future.setDate(future.getDate() + 1);
        }
        const dateStr = future.toISOString().split("T")[0];

        leaveApiClient
          .applyLeave({ leaveTypeId, fromDate: dateStr, toDate: dateStr })
          .then((applyRes) => {
            expect(applyRes.status).to.be.oneOf([200, 400, 422]);
            assertTiming("Apply leave API response", applyRes.duration, THRESHOLDS.applyLeaveSubmit);
          });
      });
    });

    // ── 6. Employee search results — API response ───────────────────────────
    it("employee search API responds in under 1 second", () => {
      cy.allure().suite("API Response Time").story("Employee search");
      pimApiClient.searchEmployees("Admin").then((res) => {
        expect(res.status).to.eq(200);
        assertTiming("Employee search API response", res.duration, THRESHOLDS.employeeSearchApi);
      });
    });

    // ── 7. Report generation ────────────────────────────────────────────────
    it("report generation page loads in under 5 seconds", () => {
      cy.allure().suite("Page Load").story("Report generation");
      let start: number;
      cy.wrap(null).then(() => {
        start = Date.now();
      });
      cy.visit("/web/index.php/pim/viewDefinedPredefinedReports");
      cy.get(".oxd-table-body", { timeout: THRESHOLDS.reportGeneration + 3000 })
        .should("be.visible")
        .then(() => {
          assertTiming("Report generation page load", Date.now() - start, THRESHOLDS.reportGeneration);
        });
    });
  });
});
