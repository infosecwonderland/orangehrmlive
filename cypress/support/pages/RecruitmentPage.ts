export class RecruitmentPage {
  // ── Navigation ──────────────────────────────────────────────────────────────
  openModule(): void {
    cy.contains(".oxd-main-menu span", "Recruitment", { timeout: 10000 }).click();
    cy.url().should("include", "/recruitment");
  }

  openVacancies(): void {
    cy.contains(".oxd-topbar-body-nav a", "Vacancies").click();
    cy.url({ timeout: 10000 }).should("include", "/viewJobVacancy");
  }

  openCandidates(): void {
    cy.contains(".oxd-topbar-body-nav a", "Candidates").click();
    cy.url({ timeout: 10000 }).should("include", "/viewCandidates");
  }

  // ── Vacancies ───────────────────────────────────────────────────────────────
  clickAddVacancy(): void {
    cy.contains("button", "Add").click();
    cy.url({ timeout: 10000 }).should("include", "/addJobVacancy");
    cy.get(".oxd-form", { timeout: 20000 }).should("be.visible");
  }

  fillVacancyForm(name: string, jobTitle: string, hiringManager: string, positions: number): void {
    // Vacancy Name
    cy.get(".oxd-form .oxd-input").first().clear().type(name);

    // Job Title select (first .oxd-select-text)
    cy.get(".oxd-select-text").first().click();
    cy.contains(".oxd-select-dropdown .oxd-select-option", jobTitle, { timeout: 10000 })
      .should("be.visible")
      .click();

    // Hiring Manager autocomplete — type prefix then wait for the actual name to appear
    // (avoids clicking the "Searching…" loading placeholder)
    const hmFirstName = hiringManager.split(" ")[0] ?? hiringManager.slice(0, 4);
    cy.get('input[placeholder="Type for hints..."]').first()
      .clear()
      .type(hiringManager.slice(0, 4), { delay: 60 });
    cy.contains(".oxd-autocomplete-option", hmFirstName, { timeout: 20000 })
      .click({ force: true });

    // Number of Positions (label text varies across versions — match on "Positions")
    cy.contains(".oxd-input-group", "Positions")
      .find(".oxd-input")
      .clear()
      .type(String(positions));
  }

  saveVacancy(): void {
    cy.contains("button", "Save").click();
  }

  assertVacancySaved(): void {
    // After save, OrangeHRM redirects to the edit page — URL contains /addJobVacancy/{id}
    cy.url({ timeout: 30000 }).should("match", /addJobVacancy\/\d+/);
  }

  assertVacancyInList(name: string): void {
    cy.get(".oxd-table-body", { timeout: 10000 }).should("contain", name);
  }

  // ── Candidates ──────────────────────────────────────────────────────────────
  clickAddCandidate(): void {
    cy.contains("button", "Add").click();
    cy.url({ timeout: 10000 }).should("include", "/addCandidate");
    cy.get(".oxd-form", { timeout: 20000 }).should("be.visible");
  }

  fillCandidateForm(
    firstName: string,
    lastName: string,
    email: string,
    vacancyName?: string
  ): void {
    cy.get('input[placeholder="First Name"]').clear().type(firstName);
    cy.get('input[placeholder="Last Name"]').clear().type(lastName);
    cy.contains(".oxd-input-group", "Email")
      .find(".oxd-input")
      .clear()
      .type(email);

    // Vacancy dropdown (optional)
    if (vacancyName) {
      cy.get(".oxd-select-text").first().click();
      cy.contains(".oxd-select-dropdown .oxd-select-option", vacancyName, {
        timeout: 10000,
      }).click({ force: true });
    }
  }

  saveCandidate(): void {
    cy.contains("button", "Save").click();
  }

  assertCandidateSaved(): void {
    cy.get(".oxd-toast", { timeout: 15000 })
      .should("be.visible")
      .and("contain", "Successfully");
  }

  assertCandidateInList(name: string): void {
    cy.get(".oxd-table-body", { timeout: 10000 }).should("contain", name);
  }

  assertCandidateStatus(name: string, status: string): void {
    cy.get(".oxd-table-body", { timeout: 10000 })
      .contains(".oxd-table-row", name)
      .should("contain", status);
  }

  // ── Candidate detail ────────────────────────────────────────────────────────
  openCandidateByName(name: string): void {
    // Find the row containing the candidate name, then click the view (eye) icon
    cy.get(".oxd-table-body", { timeout: 10000 })
      .contains(".oxd-table-row", name)
      .find(".oxd-icon-button")
      .first()
      .click();
    cy.get(".oxd-form", { timeout: 15000 }).should("be.visible");
  }

  clickActionButton(label: string): void {
    cy.contains("button", label, { timeout: 30000 }).should("be.visible").click();
    cy.wait(1500);
    cy.get("body").then(($b) => {
      if ($b.find(".oxd-dialog-container").length > 0) {
        // Confirmation dialog — click Ok
        cy.get(".oxd-dialog-container").contains("button", "Ok").click();
      } else {
        // Some actions navigate to a status-change form — click Save if present
        const saveBtn = $b.find("button").filter((_, el) => (el.textContent ?? "").trim() === "Save");
        if (saveBtn.length > 0) {
          cy.contains("button", "Save").click();
        }
      }
    });
  }

  // ── Interview scheduling (UI) ────────────────────────────────────────────────
  scheduleInterview(interviewTitle: string, date: string, time: string): void {
    // date: YYYY-MM-DD, time: HH:MM
    cy.contains("button", "Schedule Interview").click();
    cy.get(".oxd-form", { timeout: 20000 }).should("be.visible");

    cy.contains(".oxd-input-group", "Interview Title")
      .find(".oxd-input")
      .clear()
      .type(interviewTitle);

    // Interviewer autocomplete — fetch a real interviewer name from the API so we can
    // type a specific prefix and wait for their name (not a loading placeholder).
    type Interviewer = { id: number; firstName: string; lastName: string };
    cy.request({
      method: "GET",
      url: "/web/index.php/api/v2/recruitment/interviewers?nameOrId=a&limit=5",
      failOnStatusCode: false,
    }).then((res) => {
      const list: Interviewer[] = res.status === 200
        ? ((res.body as { data: Interviewer[] }).data ?? [])
        : [];
      const interviewer = list[0];
      const prefix = interviewer
        ? `${interviewer.firstName} ${interviewer.lastName}`.slice(0, 4)
        : "adm";

      cy.contains(".oxd-input-group", "Interviewer")
        .find('input[placeholder="Type for hints..."]')
        .clear()
        .type(prefix, { delay: 60 });
      // Match on firstName only — the displayed option may include middle name not in the API response
      const matchText = interviewer ? interviewer.firstName : prefix;
      cy.contains(".oxd-autocomplete-option", matchText, { timeout: 20000 })
        .click({ force: true });
    });

    // Date field (OrangeHRM date picker accepts YYYY-DD-MM)
    const [yyyy, mm, dd] = date.split("-");
    cy.get(".oxd-date-input input").first().clear().type(`${yyyy}-${dd}-${mm}`, { delay: 60 }).blur();

    cy.contains("button", "Save").click();
    cy.get(".oxd-toast", { timeout: 30000 }).should("contain", "Successfully");
  }
}
