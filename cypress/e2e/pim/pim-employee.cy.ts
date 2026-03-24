import { PimPage } from "../../support/pages/PimPage";

interface TestData {
  credentials: { admin: { username: string; password: string } };
  employee: { firstName: string; lastName: string };
}

const pimPage = new PimPage();

describe("PIM - Employee Management", () => {
  let empNumber: number;
  const ts = Date.now();
  let firstName: string;
  let lastName: string;
  const updatedLastName = `Updated${ts}`;
  const middleName = `Mid${ts}`;

  before(() => {
    cy.fixture("testData").then((data: TestData) => {
      firstName = data.employee.firstName;
      lastName = `${data.employee.lastName}${ts}`;
    });
  });

  beforeEach(() => {
    cy.loginAsAdmin();
    pimPage.openModule();
  });

  it("adds a new employee and navigates to personal details", () => {
    pimPage.clickAddEmployee();
    pimPage.fillEmployeeName(firstName, lastName);
    pimPage.submitEmployeeForm();
    pimPage.assertEmployeeLoaded();
    pimPage.getEmployeeIdFromUrl().then((id) => {
      empNumber = id;
    });
  });

  it("assigns an auto-generated numeric employee ID", () => {
    pimPage.searchByEmployeeName(lastName);
    pimPage.assertEmployeeInList(firstName, lastName);
    cy.get(".oxd-table-body .oxd-table-row")
      .first()
      .find(".oxd-table-cell")
      .eq(1)
      .invoke("text")
      .then((text) => {
        expect(text.trim()).to.match(/^\d+$/);
      });
  });

  it("finds the employee by name in search results", () => {
    pimPage.searchByEmployeeName(firstName);
    pimPage.assertEmployeeInList(firstName, lastName);
  });

  it("edits last name and middle name on personal details", () => {
    pimPage.searchByEmployeeName(lastName);
    pimPage.clickEmployeeInList(lastName);
    pimPage.editLastName(updatedLastName);
    pimPage.editMiddleName(middleName);
    pimPage.savePersonalDetails();
    pimPage.assertPersonalDetailsSaved();
  });

  it("deletes the employee from the system", () => {
    pimPage.searchByEmployeeName(updatedLastName);
    pimPage.assertEmployeeInList(firstName, updatedLastName);
    pimPage.selectEmployeeCheckbox();
    pimPage.clickDeleteSelected();
    pimPage.confirmDeleteDialog();
    pimPage.assertEmployeeNotInList();
  });
});