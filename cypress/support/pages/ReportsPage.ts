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
    cy.get('input[placeholder="Type for hints..."]', { timeout: 15000 }).should("be.visible");
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
    // Demo shows a transient “Searching…” row; do not assert length>0 on options alone.
    cy.contains(".oxd-autocomplete-option", fullName, { timeout: 25000 }).should("be.visible").click();
  }

  assertEmployeeInAutocomplete(fullName: string): void {
    cy.get('input[placeholder="Type for hints..."]')
      .first()
      .clear()
      .type(fullName.slice(0, 6), { delay: 60 });
    cy.get(".oxd-autocomplete-dropdown", { timeout: 12000 }).should("be.visible");
    cy.contains(".oxd-autocomplete-option", fullName, { timeout: 25000 }).should("exist");
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
    // Empty reports still return 200 from this endpoint; the DOM may not use .orangehrm-container
    // or that wrapper can be non-visible — do not rely on it.
    cy.intercept({ method: "GET", url: /\/api\/v2\/time\/reports\/data/ }).as("timeReportData");
    cy.contains("button", "View").click();
    cy.wait("@timeReportData", { timeout: 25000 }).then((i) => {
      expect(i.response?.statusCode, JSON.stringify(i.response?.body)).to.eq(200);
    });
    cy.get("body", { timeout: 15000 }).should(($b) => {
      const t = $b.text();
      const settled =
        /No Records Found/i.test(t) ||
        $b.find(".oxd-table-body").length > 0 ||
        /Time \(Hours\)/i.test(t) ||
        /Total Duration/i.test(t);
      expect(settled, "employee time report UI should show a result or empty state").to.be.true;
    });
  }

  // ── Report results assertions ─────────────────────────────────────────────

  /**
   * Time → Employee Report is driven by **timesheet** data. A brand-new PIM employee often has
   * no hours → empty grid is valid; we still require the chosen employee to stay on screen and
   * the report run to complete (rows or explicit empty state).
   */
  assertEmployeeTimeReportOutcome(fullName: string): void {
    const first = fullName.trim().split(/\s+/)[0] ?? "";
    const last = fullName.trim().split(/\s+/).slice(1).join(" ");

    // jQuery/Cypress body.text() does NOT include <input> values — the name can be visible only
    // in the Employee Name field. Assert via .val() / value attr, then chips if Vue clears the input.
    cy.get('input[placeholder="Type for hints..."]')
      .first()
      .should(($input) => {
        const el = $input[0] as HTMLInputElement | undefined;
        const v = String(el?.value ?? $input.val() ?? $input.attr("value") ?? "");
        const inInput =
          v.includes(fullName) || (first !== "" && v.includes(first) && (last === "" || v.includes(last)));
        if (inInput) return;
        const chipRow = $input.closest(".oxd-input-group, .oxd-autocomplete-wrapper, .oxd-sheet").text();
        const inChrome = chipRow.includes(fullName) || (chipRow.includes(first) && (last === "" || chipRow.includes(last)));
        expect(
          inChrome,
          `employee should appear in criteria input or autocomplete wrapper; val="${v}" near="${chipRow.slice(0, 120)}"`
        ).to.be.true;
      });

    cy.get("body").then(($b) => {
      if (/No Records Found/i.test($b.text())) {
        cy.contains(/No Records Found/i).should("be.visible");
      } else {
        cy.get(".oxd-table-body", { timeout: 10000 }).should("be.visible").and("contain", fullName);
      }
    });
  }

  assertEmployeeInResults(fullName: string): void {
    cy.get(".oxd-table-body", { timeout: 15000 })
      .should("be.visible")
      .and("contain", fullName);
  }

  assertNoRecordsFound(): void {
    cy.contains("No Records Found", { timeout: 10000 }).should("be.visible");
  }
}
