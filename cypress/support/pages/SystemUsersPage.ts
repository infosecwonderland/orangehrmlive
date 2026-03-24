// Covers two pages:
//   List: /web/index.php/admin/viewSystemUsers  (system-user-list)
//   Form: /web/index.php/admin/saveSystemUser   (system-user-save)

export class SystemUsersPage {
  // ── Navigation ──────────────────────────────────────────────────────────

  navigateToList(): void {
    cy.visit("/web/index.php/admin/viewSystemUsers");
    cy.get(".oxd-table", { timeout: 15000 }).should("be.visible");
  }

  navigateToAddUser(): void {
    cy.visit("/web/index.php/admin/saveSystemUser");
    cy.get(".oxd-form", { timeout: 15000 }).should("be.visible");
  }

  clickAdd(): void {
    cy.contains("button", "Add").click();
    cy.get(".oxd-form", { timeout: 10000 }).should("be.visible");
  }

  // ── List page — search filters ───────────────────────────────────────────

  filterByUsername(username: string): void {
    cy.contains(".oxd-input-group", "Username").find(".oxd-input").clear().type(username);
  }

  filterByUserRole(role: "Admin" | "ESS"): void {
    cy.get(".oxd-select-text").eq(0).click();
    cy.contains(".oxd-select-dropdown .oxd-select-option", role, {
      timeout: 8000,
    }).click();
  }

  filterByEmployeeName(fullName: string): void {
    cy.get('input[placeholder="Type for hints..."]')
      .first()
      .clear()
      .type(fullName.slice(0, 3), { delay: 60 });
    cy.get(".oxd-autocomplete-dropdown", { timeout: 12000 }).should("be.visible");
    cy.get('input[placeholder="Type for hints..."]')
      .first()
      .type(fullName.slice(3), { delay: 40 });
    cy.get(".oxd-autocomplete-option", { timeout: 10000 }).should(
      "have.length.greaterThan",
      0
    );
    cy.get(".oxd-autocomplete-option").contains(fullName).click();
  }

  filterByStatus(status: "Enabled" | "Disabled"): void {
    cy.get(".oxd-select-text").eq(1).click();
    cy.contains(".oxd-select-dropdown .oxd-select-option", status, {
      timeout: 8000,
    }).click();
  }

  search(): void {
    cy.contains("button", "Search").click();
    cy.get(".oxd-table-body", { timeout: 15000 }).should("be.visible");
  }

  resetFilters(): void {
    cy.contains("button", "Reset").click();
  }

  // ── List page — table assertions ─────────────────────────────────────────

  assertUserInList(username: string): void {
    cy.get(".oxd-table-body", { timeout: 10000 }).should("contain", username);
  }

  assertUserNotInList(username: string): void {
    cy.get(".oxd-table-body", { timeout: 10000 }).should("not.contain", username);
  }

  assertNoRecordsFound(): void {
    cy.contains("No Records Found", { timeout: 10000 }).should("be.visible");
  }

  // ── List page — row actions ──────────────────────────────────────────────

  clickEditForUser(username: string): void {
    cy.get(".oxd-table-body")
      .contains(".oxd-table-cell", username)
      .closest(".oxd-table-row")
      .find(".oxd-icon-button")
      .first()
      .click();
    cy.get(".oxd-form", { timeout: 10000 }).should("be.visible");
  }

  clickDeleteForUser(username: string): void {
    cy.get(".oxd-table-body")
      .contains(".oxd-table-cell", username)
      .closest(".oxd-table-row")
      .find(".oxd-icon-button")
      .last()
      .click();
  }

  selectUserCheckbox(username: string): void {
    cy.get(".oxd-table-body")
      .contains(".oxd-table-cell", username)
      .closest(".oxd-table-row")
      .find(".oxd-checkbox-input")
      .click();
  }

  clickDeleteSelected(): void {
    cy.contains("button", "Delete Selected").click();
  }

  confirmDelete(): void {
    cy.contains(".oxd-button--label-danger", "Yes, Delete").click();
  }

  // ── Save/Add form ────────────────────────────────────────────────────────

  selectUserRole(role: "Admin" | "ESS"): void {
    cy.get(".oxd-select-text").eq(0).click();
    cy.contains(".oxd-select-dropdown .oxd-select-option", role, {
      timeout: 8000,
    }).click();
  }

  fillEmployeeName(fullName: string): void {
    cy.get('input[placeholder="Type for hints..."]')
      .first()
      .clear()
      .type(fullName.slice(0, 3), { delay: 60 });
    cy.get(".oxd-autocomplete-dropdown", { timeout: 12000 }).should("be.visible");
    cy.get('input[placeholder="Type for hints..."]')
      .first()
      .type(fullName.slice(3), { delay: 40 });
    cy.get(".oxd-autocomplete-option", { timeout: 10000 }).should(
      "have.length.greaterThan",
      0
    );
    cy.get(".oxd-autocomplete-option").contains(fullName).click();
  }

  selectStatus(status: "Enabled" | "Disabled"): void {
    cy.get(".oxd-select-text").eq(1).click();
    cy.contains(".oxd-select-dropdown .oxd-select-option", status, {
      timeout: 8000,
    }).click();
  }

  fillUsername(username: string): void {
    cy.contains(".oxd-input-group", "Username").find(".oxd-input").clear().type(username);
  }

  fillPassword(password: string): void {
    cy.get('input[type="password"]').eq(0).clear().type(password, { log: false });
  }

  fillConfirmPassword(password: string): void {
    cy.get('input[type="password"]').eq(1).clear().type(password, { log: false });
  }

  save(): void {
    cy.contains("button", "Save").click();
  }

  /** Register before Save — success is asserted on API (toast may disappear too fast or not render). */
  listenForCreateUserApi(): void {
    cy.intercept({ method: "POST", url: /\/api\/v2\/admin\/users/ }).as("createSysUser");
  }

  assertCreateUserApiSuccess(): void {
    cy.wait("@createSysUser", { timeout: 25000 }).then(({ response }) => {
      expect(response?.statusCode, JSON.stringify(response?.body)).to.eq(200);
    });
  }

  cancel(): void {
    cy.contains("button", "Cancel").click();
  }

  // ── Assertions ───────────────────────────────────────────────────────────

  assertSuccessToast(): void {
    cy.get(".oxd-toast", { timeout: 10000 })
      .should("be.visible")
      .and("contain", "Successfully");
  }

  assertUsernameAlreadyExists(): void {
    cy.contains("Already exists").should("be.visible");
  }

  assertRequiredFieldErrors(): void {
    cy.get(".oxd-input-field-error-message", { timeout: 8000 }).should(
      "have.length.greaterThan",
      0
    );
  }
}
