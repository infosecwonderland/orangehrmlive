export class LeavePage {
  openModule(): void {
    cy.contains("span", "Leave").click();
    cy.url().should("include", "/leave");
  }

  openApplyLeave(): void {
    cy.contains("a", "Apply").click();
  }

  submitLeaveApplication(): void {
    cy.get('button[type="submit"]').click();
  }
}
