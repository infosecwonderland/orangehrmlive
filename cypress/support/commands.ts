import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsAdmin(): Chainable<void>;
      login(username: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
    }
  }
}

const loginPage = new LoginPage();
const dashboardPage = new DashboardPage();

Cypress.Commands.add("login", (username: string, password: string) => {
  loginPage.visit();
  loginPage.login(username, password);
});

Cypress.Commands.add("loginAsAdmin", () => {
  cy.fixture("testData").then((testData: { credentials: { admin: { username: string; password: string } } }) => {
    const { username, password } = testData.credentials.admin;
    cy.login(username, password);
    dashboardPage.assertLoaded();
  });
});

Cypress.Commands.add("logout", () => {
  dashboardPage.logout();
  loginPage.assertLoginPageVisible();
});

export {};
