export class PimPage {
  openModule(): void {
    cy.contains("span", "PIM").click();
    cy.url().should("include", "/pim/viewEmployeeList");
  }

  clickAddEmployee(): void {
    cy.contains("a", "Add Employee").click();
  }

  fillEmployeeName(firstName: string, lastName: string): void {
    cy.get('input[name="firstName"]').clear().type(firstName);
    cy.get('input[name="lastName"]').clear().type(lastName);
  }

  submitEmployeeForm(): void {
    cy.get('button[type="submit"]').click();
  }

  searchByEmployeeName(employeeName: string): void {
    cy.get('input[placeholder="Type for hints..."]').first().clear().type(employeeName);
    cy.contains("button", "Search").click();
  }
}
