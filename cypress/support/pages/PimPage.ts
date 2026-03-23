export class PimPage {
  openModule(): void {
    cy.contains("span", "PIM").click();
    cy.url().should("include", "/pim/viewEmployeeList");
  }

  clickAddEmployee(): void {
    cy.contains("a", "Add Employee").click();
  }

  fillEmployeeName(firstName: string, lastName: string): void {
    cy.get('input[placeholder="First Name"]').clear().type(firstName);
    cy.get('input[placeholder="Last Name"]').clear().type(lastName);
  }

  fillMiddleName(middleName: string): void {
    cy.get('input[placeholder="Middle Name"]').clear().type(middleName);
  }

  submitEmployeeForm(): void {
    cy.contains("button", "Save").click();
  }

  assertEmployeeLoaded(): void {
    cy.url().should("include", "/pim/viewPersonalDetails/empNumber/", { timeout: 15000 });
  }

  getEmployeeIdFromUrl(): Cypress.Chainable<number> {
    return cy.url().then((url) => {
      const match = url.match(/\/empNumber\/(\d+)/);
      if (!match) throw new Error("Employee number not found in URL");
      return parseInt(match[1], 10);
    });
  }

  searchByEmployeeName(employeeName: string): void {
    cy.get('input[placeholder="Type for hints..."]').first().clear().type(employeeName);
    cy.contains("button", "Search").click();
    cy.get(".oxd-table-body", { timeout: 15000 }).should("be.visible");
  }

  assertEmployeeInList(firstName: string, lastName: string): void {
    cy.get(".oxd-table-body").should("contain", firstName).and("contain", lastName);
  }

  assertEmployeeNotInList(): void {
    cy.contains("No Records Found", { timeout: 10000 }).should("be.visible");
  }

  clickEmployeeInList(lastName: string): void {
    cy.contains(".oxd-table-body .oxd-table-row", lastName)
      .find(".oxd-icon-button")
      .first()
      .click();
  }

  editLastName(lastName: string): void {
    cy.get('input[name="lastName"]').clear().type(lastName);
  }

  editMiddleName(middleName: string): void {
    cy.get('input[name="middleName"]').clear().type(middleName);
  }

  savePersonalDetails(): void {
    cy.get(".oxd-form-actions").first().find('button[type="submit"]').click();
  }

  assertPersonalDetailsSaved(): void {
    cy.get(".oxd-toast", { timeout: 8000 }).should("be.visible").and("contain", "Successfully");
  }

  selectEmployeeCheckbox(): void {
    cy.get(".oxd-table-body .oxd-table-row")
      .first()
      .find(".oxd-checkbox-input")
      .click();
  }

  clickDeleteSelected(): void {
    cy.contains("button", "Delete Selected").click();
  }

  confirmDeleteDialog(): void {
    cy.contains(".oxd-button--label-danger", "Yes, Delete").click();
  }
}
