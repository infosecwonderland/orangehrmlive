import { leaveApiClient, getWeekdays } from "../../../src/services/leaveApiClient";
import { pimApiClient } from "../../../src/services/pimApiClient";
import { SystemUsersPage } from "../../support/pages/SystemUsersPage";
import { ReportsPage } from "../../support/pages/ReportsPage";
import { LeavePage } from "../../support/pages/LeavePage";
import { AttendancePage } from "../../support/pages/AttendancePage";

// 2.3 Data Integrity Checks

interface Case1TestData {
  employee: { firstName: string; lastName: string };
}

const systemUsersPage = new SystemUsersPage();
const reportsPage = new ReportsPage();
const leavePage = new LeavePage();
const attendancePage = new AttendancePage();

// ─────────────────────────────────────────────────────────────────────────────
// Case 1 — Create an employee and verify the record appears in the Reports module
// ─────────────────────────────────────────────────────────────────────────────
describe("Case 1 — Employee record appears in Reports module", () => {
  let userId: number | undefined;
  let empNumber: number | undefined;
  let firstName: string;
  let lastName: string;
  let employeeFullName: string;
  const ts = Date.now();
  const username = `IntUser${ts}`;
  const password = "Admin1234!";

  beforeEach(() => {
    cy.allure().parentSuite("2.3 Data Integrity Checks").suite("Case 1 — Reports module").tag("integrity");
  });

  before(() => {
    cy.fixture("testData").then((data: Case1TestData) => {
      firstName = data.employee.firstName;
      lastName = `${data.employee.lastName}${ts}`;
      employeeFullName = `${firstName} ${lastName}`;
    });
  });

  it("admin creates a user, confirms in user list, and verifies employee appears in Reports", () => {
    cy.loginAsAdmin();

    pimApiClient.createEmployee({ firstName, lastName }).then((res) => {
      expect(res.status).to.eq(200);
      empNumber = (res.body as { data: { empNumber: number } }).data.empNumber;
    });

    // Step 1 — Create system user via Admin → User Management → Add User
    systemUsersPage.navigateToAddUser();
    systemUsersPage.selectUserRole("ESS");
    systemUsersPage.fillEmployeeName(employeeFullName);
    systemUsersPage.selectStatus("Enabled");
    systemUsersPage.fillUsername(username);
    systemUsersPage.fillPassword(password);
    systemUsersPage.fillConfirmPassword(password);
    systemUsersPage.save();
    systemUsersPage.assertSuccessToast();

    // Step 2 — Search user list to confirm the record was saved
    systemUsersPage.navigateToList();
    systemUsersPage.filterByUsername(username);
    systemUsersPage.search();
    systemUsersPage.assertUserInList(username);

    // Capture userId for cleanup
    cy.request({
      method: "GET",
      url: `/web/index.php/api/v2/admin/users?username=${encodeURIComponent(username)}&limit=1&offset=0`,
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status === 200 && Array.isArray(res.body.data) && res.body.data.length > 0) {
        userId = res.body.data[0].id as number;
      }
    });

    // Step 3 — Cross-module: employee appears in Time → Reports → Employee Reports
    reportsPage.navigateToEmployeeReports();
    reportsPage.assertEmployeeInAutocomplete(employeeFullName);
  });

  after(() => {
    cy.then(() => {
      if (userId !== undefined) leaveApiClient.deleteUser(userId);
      if (empNumber !== undefined) pimApiClient.deleteEmployees([empNumber]);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Case 2 — Apply leave and verify attendance-related pages reflect the flow
// ─────────────────────────────────────────────────────────────────────────────
describe("Case 2 — Leave application and attendance records", () => {
  beforeEach(() => {
    cy.allure().parentSuite("2.3 Data Integrity Checks").suite("Case 2 — Leave & attendance").tag("integrity");
  });

  it("admin applies leave and opens attendance My Records and Employee Records", () => {
    const weekdays = getWeekdays(2);
    const fromDate = weekdays[0];
    const toDate = weekdays[1];

    cy.loginAsAdmin();
    leavePage.openModule();
    cy.url().should("include", "/leave");

    leavePage.openApplyLeave();
    cy.url().should("include", "/applyLeave");

    cy.get(".oxd-select-text").first().click();
    cy.get(".oxd-select-dropdown .oxd-select-option").not(":first").first().click();

    leavePage.setFromDate(fromDate);
    leavePage.setToDate(toDate);
    leavePage.submitLeaveApplication();
    leavePage.assertSuccessToast();

    attendancePage.navigateToMyRecords();

    attendancePage.navigateToEmployeeRecords();
  });
});
