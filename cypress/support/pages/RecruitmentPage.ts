export class RecruitmentPage {
  openModule(): void {
    cy.contains("span", "Recruitment").click();
    cy.url().should("include", "/recruitment");
  }

  openVacancies(): void {
    cy.contains("a", "Vacancies").click();
  }

  openCandidates(): void {
    cy.contains("a", "Candidates").click();
  }
}
