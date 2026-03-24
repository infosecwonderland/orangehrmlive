import { pimApiClient } from "../../../src/services/pimApiClient";
import { SystemUsersPage } from "../../support/pages/SystemUsersPage";

interface TestData {
  employee: { firstName: string; lastName: string };
}

const systemUsersPage = new SystemUsersPage();

describe("Case 1 — Create user and confirm in user list", () => {
  let firstName: string;
  let lastName: string;
  let employeeFullName: string;
  const ts = Date.now();
  const username = `IntUser${ts}`;
  const password = "Admin1234!";

  before(() => {
    cy.fixture("testData").then((data: TestData) => {
      firstName = data.employee.firstName;
      lastName = `${data.employee.lastName}${ts}`;
      employeeFullName = `${firstName} ${lastName}`;
    });
  });

  it("admin creates a user, confirms in user list", () => {
    cy.loginAsAdmin();

    pimApiClient.createEmployee({ firstName, lastName }).then((res) => {
      expect(res.status).to.eq(200);
    });

    systemUsersPage.navigateToAddUser();
    systemUsersPage.selectUserRole("ESS");
    systemUsersPage.fillEmployeeName(employeeFullName);
    systemUsersPage.selectStatus("Enabled");
    systemUsersPage.fillUsername(username);
    systemUsersPage.fillPassword(password);
    systemUsersPage.fillConfirmPassword(password);
    systemUsersPage.save();
    systemUsersPage.assertSuccessToast();

    systemUsersPage.navigateToList();
    systemUsersPage.filterByUsername(username);
    systemUsersPage.search();
    systemUsersPage.assertUserInList(username);
  });
});
