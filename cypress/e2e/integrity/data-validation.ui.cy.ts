import { pimApiClient } from "../../../src/services/pimApiClient";
import { leaveApiClient, pickLeaveTypeForTest } from "../../../src/services/leaveApiClient";
import { PimPage } from "../../support/pages/PimPage";
import { ReportsPage } from "../../support/pages/ReportsPage";
import { LeavePage } from "../../support/pages/LeavePage";
import { AttendancePage } from "../../support/pages/AttendancePage";

/**
 * 2.3 Data Integrity Checks (aligned with OrangeHRM OS 5.x demo UI)
 *
 * Observed app flows (opensource-demo.orangehrmlive.com):
 * - PIM: main menu “PIM” → Employee List; search uses “Type for hints…” + Search.
 * - Time → Reports: main menu “Time”, top bar “Reports” → “Employee Reports” → displayEmployeeReportCriteria.
 *   This report is **timesheet / hours** based; a new employee with no time logged shows “No Records Found”
 *   even though they are a valid report subject (employee name still on the form).
 */

interface FixtureEmployee {
  employee: { firstName: string; lastName: string };
}

const pimPage = new PimPage();
const reportsPage = new ReportsPage();

/** YYYY-MM-DD in local timezone */
function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function reportDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 120);
  return { from: isoDateLocal(from), to: isoDateLocal(to) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Employee → PIM list + Time → Reports → Employee Report (generated grid)
// ─────────────────────────────────────────────────────────────────────────────
describe("2.3a — Employee in PIM and Time Employee Reports", () => {
  let empNumber: number | undefined;
  let firstName: string;
  let lastName: string;
  let employeeFullName: string;
  const ts = Date.now();

  beforeEach(() => {
    cy.allure().parentSuite("2.3 Data Integrity Checks").suite("Employee → Reports").tag("integrity");
  });

  before(() => {
    cy.fixture("testData").then((data: FixtureEmployee) => {
      firstName = data.employee.firstName;
      lastName = `${data.employee.lastName}${ts}`;
      employeeFullName = `${firstName} ${lastName}`;
    });
  });

  it("creates an employee, sees them in PIM, then in Time → Reports → Employee Report", () => {
    cy.loginAsAdmin();

    pimApiClient.createEmployee({ firstName, lastName }).then((res) => {
      expect(res.status).to.eq(200);
      empNumber = (res.body as { data: { empNumber: number } }).data.empNumber;
    });

    // Same path as users: sidebar PIM → Employee List
    pimPage.openModule();
    pimPage.searchByEmployeeName(lastName);
    pimPage.assertEmployeeInList(firstName, lastName);

    // Same path as users: Time → top “Reports” → “Employee Reports” (not PIM Predefined Reports)
    const { from, to } = reportDateRange();
    reportsPage.openViaTopNav();
    reportsPage.fillEmployeeName(employeeFullName);
    reportsPage.setFromDate(from);
    reportsPage.setToDate(to);
    reportsPage.viewReport();
    reportsPage.assertEmployeeTimeReportOutcome(employeeFullName);
  });

  after(() => {
    cy.then(() => {
      if (empNumber !== undefined) pimApiClient.deleteEmployees([empNumber]);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2.3b — Apply leave → verify in Leave List (the authoritative attendance record)
//
// Flow:
//   1. Admin creates a throwaway employee + ESS system user via API.
//   2. Admin grants a leave entitlement for the employee via API.
//   3. ESS session (API login) applies a leave request for a future weekday.
//   4. Admin verifies the Pending leave request appears in Leave → Leave List.
// ─────────────────────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD for a weekday 7 days from today (skips Sat/Sun). */
function nextFutureWeekday(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() + 1); // Sunday → Monday
  if (day === 6) d.setDate(d.getDate() + 2); // Saturday → Monday
  return isoDateLocal(d);
}

/**
 * Programmatic API login via cy.request.
 * Reads the CSRF token from the login page, then POSTs credentials.
 * Shares Cypress cookie jar — subsequent cy.request calls use this session.
 */
function apiLogin(username: string, password: string): void {
  cy.request({ url: "/web/index.php/auth/login", failOnStatusCode: false }).then((pageRes) => {
    const html = pageRes.body as string;
    const m =
      html.match(/<input[^>]+name="_csrf_token"[^>]+value="([^"]+)"/) ||
      html.match(/<input[^>]+value="([^"]+)"[^>]+name="_csrf_token"/);
    const csrf = m ? m[1] : "";
    cy.request({
      method: "POST",
      url: "/web/index.php/auth/validate",
      form: true,
      body: { _username: username, _password: password, _csrf_token: csrf },
      followRedirect: true,
      failOnStatusCode: false,
    });
  });
}

describe("2.3b — Apply leave and verify it reflects in the Leave List", () => {
  const ts2b = Date.now();
  const essUsername2b = `DV2b${ts2b}`;
  const essPassword2b = "DvTest1!2b";
  let empNumber2b: number;
  let essUserId2b: number;
  let leaveTypeId2b: number;
  const leaveDate2b = nextFutureWeekday();
  const firstName2b = "DVLeave";
  const lastName2b = `Auto${ts2b}`;

  const leavePage2b = new LeavePage();

  beforeEach(() => {
    cy.allure()
      .parentSuite("2.3 Data Integrity Checks")
      .suite("Leave → Leave List")
      .tag("integrity");
  });

  before(() => {
    cy.loginAsAdmin();

    pimApiClient.createEmployee({ firstName: firstName2b, lastName: lastName2b }).then((res) => {
      expect(res.status, "employee creation for 2.3b").to.eq(200);
      empNumber2b = (res.body as { data: { empNumber: number } }).data.empNumber;

      cy.request({
        method: "POST",
        url: "/web/index.php/api/v2/admin/users",
        body: {
          userRoleId: 2, // 2 = ESS
          empNumber: empNumber2b,
          status: true,
          username: essUsername2b,
          password: essPassword2b,
        },
        failOnStatusCode: false,
      }).then((userRes) => {
        expect(userRes.status, "ESS user creation for 2.3b").to.eq(200);
        essUserId2b = (userRes.body as { data: { id: number } }).data.id;
      });

      leaveApiClient.getLeaveTypes().then((ltRes) => {
        const types = (ltRes.body as { data: { id: number; name: string; deleted: boolean; operational: boolean }[] }).data;
        const leaveType = pickLeaveTypeForTest(types);
        expect(leaveType, "at least one active leave type must exist").to.not.be.undefined;
        leaveTypeId2b = leaveType!.id;

        leaveApiClient.getLeavePeriod().then((lpRes) => {
          const period = (lpRes.body as { data: { startDate: string; endDate: string } | null }).data;
          const year = new Date().getFullYear();
          const fromDate = period?.startDate ?? `${year}-01-01`;
          const toDate = period?.endDate ?? `${year}-12-31`;

          leaveApiClient.createEntitlement({
            empNumber: empNumber2b,
            leaveTypeId: leaveTypeId2b,
            entitlement: 5,
            fromDate,
            toDate,
          }).then((entRes) => {
            cy.log(`2.3b entitlement create status: ${entRes.status}`);
          });
        });
      });
    });
  });

  it("ESS user applies leave; admin sees the Pending request in Leave → Leave List", () => {
    // UI-login as ESS user so the session cookie is fully established
    cy.clearCookies();
    cy.login(essUsername2b, essPassword2b);
    leaveApiClient.applyLeave({
      leaveTypeId: leaveTypeId2b,
      fromDate: leaveDate2b,
      toDate: leaveDate2b,
    }).then((res) => {
      expect(
        res.status,
        `applyLeave failed: ${JSON.stringify(res.body)}`
      ).to.eq(200);
    });

    // Switch back to admin and verify the leave request is visible in Leave List
    cy.clearCookies();
    cy.loginAsAdmin();
    leavePage2b.openModule();
    leavePage2b.openLeaveList();
    leavePage2b.searchLeaveRequests(firstName2b, lastName2b);
    leavePage2b.assertLeaveStatusInList("Pending");
  });

  after(() => {
    cy.clearCookies();
    cy.loginAsAdmin();
    cy.then(() => {
      if (essUserId2b !== undefined) {
        cy.request({
          method: "DELETE",
          url: "/web/index.php/api/v2/admin/users",
          body: { ids: [essUserId2b] },
          failOnStatusCode: false,
        });
      }
      if (empNumber2b !== undefined) pimApiClient.deleteEmployees([empNumber2b]);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2.3c — Cross-module: employee created in PIM is consistently accessible
//        in the Leave and Attendance modules
//
// Flow:
//   1. Create employee via PIM API.
//   2. Verify the employee is retrievable via PIM search API (source of truth).
//   3. Verify the employee appears in the Leave → Add Entitlement autocomplete.
//   4. Verify the employee appears in Time → Attendance → Employee Records search.
// ─────────────────────────────────────────────────────────────────────────────
describe("2.3c — Cross-module: PIM employee is consistent in Leave and Attendance", () => {
  const ts2c = Date.now();
  let empNumber2c: number;
  const firstName2c = "DVCross";
  const lastName2c = `Auto${ts2c}`;
  const fullName2c = `${firstName2c} ${lastName2c}`;

  const attendancePage2c = new AttendancePage();

  beforeEach(() => {
    cy.allure()
      .parentSuite("2.3 Data Integrity Checks")
      .suite("Cross-module Consistency")
      .tag("integrity");
  });

  before(() => {
    cy.loginAsAdmin();
    pimApiClient.createEmployee({ firstName: firstName2c, lastName: lastName2c }).then((res) => {
      expect(res.status, "cross-module employee creation").to.eq(200);
      empNumber2c = (res.body as { data: { empNumber: number } }).data.empNumber;
    });
  });

  it("PIM API returns consistent firstName/lastName for the created employee", () => {
    cy.loginAsAdmin();
    pimApiClient.searchEmployees(lastName2c).then((res) => {
      expect(res.status).to.eq(200);
      const employees = (res.body as { data: { empNumber: number; firstName: string; lastName: string }[] }).data;
      const found = employees.find((e) => e.empNumber === empNumber2c);
      expect(found, `empNumber ${empNumber2c} not found in PIM search`).to.not.be.undefined;
      expect(found!.firstName).to.eq(firstName2c);
      expect(found!.lastName).to.eq(lastName2c);
    });
  });

  it("PIM employee appears in Leave → Add Entitlement employee search (Leave module)", () => {
    cy.loginAsAdmin();
    cy.visit("/web/index.php/leave/addLeaveEntitlement");
    cy.url({ timeout: 15000 }).should("include", "/addLeaveEntitlement");
    cy.get(".oxd-form", { timeout: 30000 }).should("be.visible");

    cy.get('input[placeholder="Type for hints..."]').first().clear().type(firstName2c.slice(0, 3), { delay: 60 });
    cy.get(".oxd-autocomplete-dropdown", { timeout: 12000 }).should("be.visible");
    cy.get('input[placeholder="Type for hints..."]').first().type(firstName2c.slice(3), { delay: 40 });
    cy.contains(".oxd-autocomplete-option", fullName2c, { timeout: 20000 }).should("exist");
    cy.log(`Cross-module (Leave): "${fullName2c}" found in entitlement employee search`);
  });

  it("PIM employee appears in Time → Attendance → Employee Records search (Attendance module)", () => {
    cy.loginAsAdmin();
    attendancePage2c.navigateToEmployeeRecords();
    attendancePage2c.fillEmployeeName(fullName2c);
    cy.log(`Cross-module (Attendance): "${fullName2c}" found in attendance employee search`);
  });

  after(() => {
    // Clear any active session so the login page renders correctly
    cy.clearCookies();
    cy.loginAsAdmin();
    cy.then(() => {
      if (empNumber2c !== undefined) pimApiClient.deleteEmployees([empNumber2c]);
    });
  });
});
