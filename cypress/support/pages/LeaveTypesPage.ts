export class LeaveTypesPage {
  navigate(): void {
    cy.visit("/web/index.php/leave/leaveTypeList");
    cy.url({ timeout: 10000 }).should("include", "/leaveTypeList");
  }

  clickAdd(): void {
    cy.contains("button", "Add").click();
    cy.get(".oxd-form", { timeout: 10000 }).should("be.visible");
  }

  fillName(name: string): void {
    cy.get(".oxd-form .oxd-input").first().clear().type(name);
  }

  fillEntitlementDays(days: number): void {
    cy.contains(".oxd-input-group", "Entitlement")
      .find(".oxd-input")
      .clear()
      .type(String(days));
  }

  save(): void {
    cy.contains("button", "Save").click();
  }

  assertSuccessToast(): void {
    cy.get(".oxd-toast", { timeout: 10000 })
      .should("be.visible")
      .and("contain", "Successfully");
  }

  assertTypeInList(name: string): void {
    cy.get(".oxd-table-body", { timeout: 10000 }).should("contain", name);
  }

  assertTypeNotInList(name: string): void {
    cy.get(".oxd-table-body", { timeout: 10000 }).should("not.contain", name);
  }

  deleteLeaveType(name: string): void {
    cy.get(".oxd-table-body")
      .contains(".oxd-table-cell", name)
      .closest(".oxd-table-row")
      .find("button.oxd-icon-button")
      .last()
      .click();
    cy.get(".oxd-dialog-container", { timeout: 8000 }).should("be.visible");
    cy.get(".oxd-dialog-container").contains("button", "Yes, Delete").click();
  }

  editLeaveType(name: string): void {
    cy.get(".oxd-table-body")
      .contains(".oxd-table-cell", name)
      .closest(".oxd-table-row")
      .find("button.oxd-icon-button")
      .first()
      .click();
    cy.get(".oxd-form", { timeout: 10000 }).should("be.visible");
  }
}
