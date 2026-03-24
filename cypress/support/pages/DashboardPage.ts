export class DashboardPage {
  /** Logged-in shell: URL + user menu (heading text “Dashboard” can render late on a slow demo). */
  assertLoaded(): void {
    cy.url({ timeout: 60000 }).should("include", "dashboard");
    cy.get(".oxd-userdropdown-tab", { timeout: 30000 }).should("be.visible");
  }

  openUserMenu(): void {
    cy.get(".oxd-userdropdown-tab").click();
  }

  logout(): void {
    this.openUserMenu();
    cy.contains("Logout").click();
  }

  assertMainMenuVisible(): void {
    const menuItems = [
      "Admin",
      "PIM",
      "Leave",
      "Time",
      "Recruitment",
      "My Info",
      "Performance",
      "Dashboard",
      "Directory",
      "Maintenance",
      "Claim",
      "Buzz"
    ];

    cy.get(".oxd-main-menu", { timeout: 20000 }).should("be.visible");
    menuItems.forEach((item) => {
      cy.contains(".oxd-main-menu span", item, { timeout: 20000 }).scrollIntoView().should("be.visible");
    });
  }
}