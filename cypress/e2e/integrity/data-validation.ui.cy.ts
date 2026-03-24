import { pimApiClient } from "../../../src/services/pimApiClient";
import { PimPage } from "../../support/pages/PimPage";
import { ReportsPage } from "../../support/pages/ReportsPage";

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
