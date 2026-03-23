import { DashboardPage } from "../../support/pages/DashboardPage";

const dashboardPage = new DashboardPage();

describe("Navigation and UI Validation", () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  // 1.3a — all main menu items visible after login
  it("shows all main menu items after login", () => {
    dashboardPage.assertMainMenuVisible();
  });

  // 1.3b — correct page heading for each module
  // OrangeHRM renders the module name in the breadcrumb h6 (.oxd-topbar-header-breadcrumb-module)
  it("shows correct page heading for each main module", () => {
    const modules: { menu: string; urlFragment: string }[] = [
      { menu: "Admin",       urlFragment: "/admin/"       },
      { menu: "PIM",         urlFragment: "/pim/"         },
      { menu: "Leave",       urlFragment: "/leave/"       },
      { menu: "Recruitment", urlFragment: "/recruitment/" },
      { menu: "Directory",   urlFragment: "/directory/"   },
      { menu: "Buzz",        urlFragment: "/buzz/"        },
      { menu: "Dashboard",   urlFragment: "/dashboard/"   },
    ];

    modules.forEach(({ menu, urlFragment }) => {
      cy.contains(".oxd-main-menu span", menu, { timeout: 10000 }).click();
      cy.url().should("include", urlFragment);
      cy.get(".oxd-topbar-header-breadcrumb-module", { timeout: 10000 })
        .should("be.visible")
        .and("contain", menu);
    });
  });

  // 1.3c — dashboard widgets load without errors
  it("dashboard widgets load without errors", () => {
    cy.url().should("include", "/dashboard");
    cy.get(".oxd-grid-item", { timeout: 15000 })
      .should("have.length.greaterThan", 0)
      .each(($widget) => {
        cy.wrap($widget).should("be.visible");
      });
    cy.get(".oxd-alert--error").should("not.exist");
  });
});
