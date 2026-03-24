export class LeavePage {
  openModule(): void {
    cy.contains(".oxd-main-menu span", "Leave", { timeout: 10000 }).click();
    cy.url().should("include", "/leave");
  }

  openApplyLeave(): void {
    cy.contains(".oxd-topbar-body-nav a", "Apply").click();
    cy.url({ timeout: 10000 }).should("include", "/applyLeave");
  }

  openLeaveList(): void {
    // Leave List is reached via direct URL — it's not in the top nav for all admin views
    cy.visit("/web/index.php/leave/viewLeaveList");
    cy.url({ timeout: 10000 }).should("include", "/viewLeaveList");
  }

  openMyLeaveList(): void {
    cy.contains(".oxd-topbar-body-nav a", "My Leave").click();
    cy.url({ timeout: 10000 }).should("include", "/viewMyLeaveList");
  }

  openLeaveTypeAdmin(): void {
    cy.contains(".oxd-topbar-body-nav span", "Configure").click();
    cy.contains("a", "Leave Types").click();
    cy.url({ timeout: 10000 }).should("include", "/leaveTypeList");
  }

  addEntitlementViaUI(empFullName: string, leaveTypeName: string, days: number): void {
    cy.visit("/web/index.php/leave/addLeaveEntitlement");
    cy.url({ timeout: 15000 }).should("include", "/addLeaveEntitlement");
    cy.get(".oxd-form", { timeout: 30000 }).should("be.visible");

    // Employee Name autocomplete — type first 3 chars to get matches, then type the rest
    cy.get('input[placeholder="Type for hints..."]').first().clear().type(empFullName.slice(0, 3), { delay: 60 });
    cy.get(".oxd-autocomplete-dropdown", { timeout: 12000 }).should("be.visible");
    cy.get('input[placeholder="Type for hints..."]').first().type(empFullName.slice(3), { delay: 40 });
    // Wait for the dropdown to update with the full search
    cy.get(".oxd-autocomplete-option", { timeout: 10000 }).should("have.length.greaterThan", 0);
    // Click the option that matches the expected employee
    cy.get(".oxd-autocomplete-option").contains(empFullName).click();

    // Leave Type dropdown (first .oxd-select-text)
    cy.get(".oxd-select-text").eq(0).click();
    cy.contains(".oxd-select-dropdown .oxd-select-option", leaveTypeName, {
      timeout: 8000,
    }).click();

    // Leave Period dropdown (second .oxd-select-text) — select the first available period
    cy.get(".oxd-select-text").eq(1).click();
    cy.get(".oxd-select-dropdown .oxd-select-option", { timeout: 8000 })
      .not(":first")  // skip the "-- Select --" placeholder
      .first()
      .click();

    // Entitlement value — the number input in the entitlement field row
    cy.contains(".oxd-input-group", "Entitlement")
      .find(".oxd-input")
      .clear()
      .type(String(days));

    cy.contains("button", "Save").scrollIntoView().click();
    // Wait briefly for the save to process; toast may or may not appear on the demo server
    cy.wait(3000);
    // Log the toast text if one appears (success or error) for debugging
    cy.get("body").then(($body) => {
      const $toast = $body.find(".oxd-toast");
      if ($toast.length > 0) {
        cy.log(`Entitlement save toast: ${$toast.text().trim()}`);
      } else {
        cy.log("No toast appeared after Save — proceeding (will verify via API)");
      }
    });
  }

  assertLeaveTypeInList(name: string): void {
    cy.get(".oxd-table-body", { timeout: 10000 }).should("contain", name);
  }

  selectLeaveType(leaveTypeName: string): void {
    cy.get(".oxd-form .oxd-select-text").first().click();
    cy.contains(".oxd-select-dropdown .oxd-select-option", leaveTypeName, {
      timeout: 10000,
    }).click();
  }

  setFromDate(date: string): void {
    // OrangeHRM date input placeholder says "yyyy-dd-mm", so format is YYYY-DD-MM
    const [yyyy, mm, dd] = date.split("-");
    cy.get(".oxd-date-input input").eq(0).clear().type(`${yyyy}-${dd}-${mm}`, { delay: 60 }).blur();
  }

  setToDate(date: string): void {
    const [yyyy, mm, dd] = date.split("-");
    cy.get(".oxd-date-input input").eq(1).clear().type(`${yyyy}-${dd}-${mm}`, { delay: 60 }).blur();
  }

  submitLeaveApplication(): void {
    cy.contains("button", "Apply").click();
  }

  assertSuccessToast(): void {
    cy.get(".oxd-toast", { timeout: 10000 })
      .should("be.visible")
      .and("contain", "Successfully");
  }

  searchLeaveRequests(firstName: string, lastName: string): void {
    cy.get('input[placeholder="Type for hints..."]')
      .first()
      .clear()
      .type(`${firstName} ${lastName}`);
    cy.get(".oxd-autocomplete-dropdown", { timeout: 8000 }).should("be.visible");
    cy.get(".oxd-autocomplete-option").first().click();
    cy.contains("button", "Search").click();
    cy.get(".oxd-table-body", { timeout: 15000 }).should("be.visible");
  }

  approveFirstLeaveRequest(): void {
    cy.get(".oxd-table-body .oxd-table-row")
      .first()
      .contains("button", "Approve")
      .click();
    cy.get(".oxd-dialog-container", { timeout: 8000 }).should("be.visible");
    cy.get(".oxd-dialog-container").contains("button", "Ok").click();
  }

  assertLeaveStatusInList(status: string): void {
    cy.get(".oxd-table-body", { timeout: 10000 }).should("contain", status);
  }

  cancelFirstPendingLeave(): void {
    cy.get(".oxd-table-body .oxd-table-row")
      .first()
      .contains("button", "Cancel")
      .click();
    cy.get(".oxd-dialog-container", { timeout: 8000 }).should("be.visible");
    cy.get(".oxd-dialog-container").contains("button", "Ok").click();
  }
}
