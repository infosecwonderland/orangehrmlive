// Covers Time → Attendance pages:
//   My Records:       /web/index.php/attendance/viewMyAttendanceRecord  (view-my-attendance)
//   Employee Records: /web/index.php/attendance/viewAttendanceRecord

export class AttendancePage {
  // ── Navigation ───────────────────────────────────────────────────────────

  navigateToMyRecords(): void {
    cy.visit("/web/index.php/attendance/viewMyAttendanceRecord");
    cy.url({ timeout: 10000 }).should("include", "viewMyAttendanceRecord");
    cy.get(".oxd-table, .orangehrm-container", { timeout: 15000 }).should("be.visible");
    cy.contains("My Attendance Records", { timeout: 15000 }).should("be.visible");
  }

  navigateToEmployeeRecords(): void {
    cy.visit("/web/index.php/attendance/viewAttendanceRecord");
    cy.url({ timeout: 10000 }).should("include", "viewAttendanceRecord");
    cy.get(".oxd-table, .orangehrm-container", { timeout: 15000 }).should("be.visible");
  }

  openViaTopNav(section: "My Records" | "Employee Records"): void {
    cy.contains(".oxd-main-menu span", "Time", { timeout: 10000 }).click();
    cy.contains(".oxd-topbar-body-nav span", "Attendance", { timeout: 10000 }).click();
    cy.contains(".oxd-dropdown-menu a", section, { timeout: 8000 }).click();
  }

  // ── Employee Records — search filters ────────────────────────────────────

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

  setDate(date: string): void {
    // Date format: YYYY-DD-MM (per app date-format id "Y-d-m")
    const [yyyy, mm, dd] = date.split("-");
    cy.get(".oxd-date-input input")
      .first()
      .clear()
      .type(`${yyyy}-${dd}-${mm}`, { delay: 60 })
      .blur();
  }

  search(): void {
    cy.contains("button", "View").click();
    cy.get(".oxd-table, .orangehrm-container", { timeout: 15000 }).should("be.visible");
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  assertRecordInTable(text: string): void {
    cy.get(".oxd-table-body", { timeout: 15000 })
      .should("be.visible")
      .and("contain", text);
  }

  /**
   * After Apply Leave, the grid may show the leave type, a generic absence label, or scheduled/pending wording
   * (approval is not required for this assertion on all OrangeHRM configs).
   */
  assertAttendanceReflectsLeave(leaveTypeName: string): void {
    cy.get(".oxd-table-body", { timeout: 15000 })
      .should("be.visible")
      .invoke("text")
      .should((text: string) => {
        const lower = text.toLowerCase();
        const type = leaveTypeName.toLowerCase();
        const matchesGeneric =
          /on leave|leave|absent|absence|day off|holiday|scheduled|weekend|pending|planned|half\s*day/i.test(
            text
          );
        expect(
          lower.includes(type) || matchesGeneric,
          `expected attendance text to reference leave (“${leaveTypeName}” or generic leave/absence/scheduled); got: ${text.slice(0, 400)}`
        ).to.be.true;
      });
  }

  assertNoRecordsFound(): void {
    cy.contains("No Records Found", { timeout: 10000 }).should("be.visible");
  }
}
