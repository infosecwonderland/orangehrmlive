export class DashboardPage {
  assertLoaded(): void {
    cy.url().should("include", "/dashboard");
    cy.contains("Dashboard").should("be.visible");
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

    cy.get(".oxd-main-menu").should("be.visible");
    menuItems.forEach((item) => {
      cy.contains(".oxd-main-menu span", item).scrollIntoView().should("be.visible");
    });
  }
}
