// Covers Time → Reports pages:
//   Employee Reports:   /web/index.php/time/displayEmployeeReportCriteria   (employee-time-report)
//   Project Reports:    /web/index.php/time/displayProjectReportCriteria
//   Attendance Summary: /web/index.php/time/displayAttendanceSummaryReportCriteria

export class ReportsPage {
  // ── Navigation ───────────────────────────────────────────────────────────

  navigateToEmployeeReports(): void {
    cy.visit("/web/index.php/time/displayEmployeeReportCriteria");
    cy.url({ timeout: 10000 }).should("include", "displayEmployeeReportCriteria");
    cy.get('input[placeholder="Type for hints..."]', { timeout: 15000 }).should("be.visible");
  }

  navigateToProjectReports(): void {
    cy.visit("/web/index.php/time/displayProjectReportCriteria");
    cy.url({ timeout: 10000 }).should("include", "displayProjectReportCriteria");
    cy.get(".oxd-form", { timeout: 15000 }).should("be.visible");
  }

  navigateToAttendanceSummary(): void {
    cy.visit("/web/index.php/time/displayAttendanceSummaryReportCriteria");
    cy.url({ timeout: 10000 }).should("include", "displayAttendanceSummaryReportCriteria");
    cy.get(".oxd-form", { timeout: 15000 }).should("be.visible");
  }

  openViaTopNav(): void {
    cy.contains(".oxd-main-menu span", "Time", { timeout: 10000 }).click();
    cy.contains(".oxd-topbar-body-nav span", "Reports", { timeout: 10000 }).click();
    cy.contains(".oxd-dropdown-menu a", "Employee Reports", { timeout: 8000 }).click();
    cy.url({ timeout: 10000 }).should("include", "displayEmployeeReportCriteria");
  }

  // ── Employee Reports criteria form ───────────────────────────────────────

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

  assertEmployeeInAutocomplete(fullName: string): void {
    cy.get('input[placeholder="Type for hints..."]')
      .first()
      .clear()
      .type(fullName.slice(0, 6), { delay: 60 });
    cy.get(".oxd-autocomplete-dropdown", { timeout: 12000 }).should("be.visible");
    cy.get(".oxd-autocomplete-option", { timeout: 10000 }).should(
      "have.length.greaterThan",
      0
    );
    cy.get(".oxd-autocomplete-option").contains(fullName).should("exist");
  }

  setFromDate(date: string): void {
    // Date format: YYYY-DD-MM (per app date-format id "Y-d-m")
    const [yyyy, mm, dd] = date.split("-");
    cy.get(".oxd-date-input input")
      .eq(0)
      .clear()
      .type(`${yyyy}-${dd}-${mm}`, { delay: 60 })
      .blur();
  }

  setToDate(date: string): void {
    const [yyyy, mm, dd] = date.split("-");
    cy.get(".oxd-date-input input")
      .eq(1)
      .clear()
      .type(`${yyyy}-${dd}-${mm}`, { delay: 60 })
      .blur();
  }

  viewReport(): void {
    cy.contains("button", "View").click();
    cy.get(".oxd-table, .orangehrm-container", { timeout: 15000 }).should("be.visible");
  }

  // ── Report results assertions ─────────────────────────────────────────────

  assertEmployeeInResults(fullName: string): void {
    cy.get(".oxd-table-body", { timeout: 15000 })
      .should("be.visible")
      .and("contain", fullName);
  }

  assertNoRecordsFound(): void {
    cy.contains("No Records Found", { timeout: 10000 }).should("be.visible");
  }
}
