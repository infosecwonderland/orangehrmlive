import { DashboardPage } from "../../support/pages/DashboardPage";
import { LoginPage } from "../../support/pages/LoginPage";

describe("Auth and Navigation", () => {
  const loginPage = new LoginPage();
  const dashboardPage = new DashboardPage();

  beforeEach(() => {
    cy.allure()
      .parentSuite("1.1 Authentication")
      .suite("UI")
      .tag("auth", "ui");
    return loginPage.visit();
  });

  it("logs in with valid credentials and loads dashboard", () => {
    cy.fixture("testData").then((testData: { credentials: { admin: { username: string; password: string } } }) => {
      const { username, password } = testData.credentials.admin;

      loginPage.login(username, password);
      dashboardPage.assertLoaded();
    });
  });

  it("shows error for invalid username", () => {
    cy.fixture("testData").then((testData: { credentials: { admin: { password: string } } }) => {
      loginPage.login("InvalidAdmin", testData.credentials.admin.password);
      loginPage.assertInvalidCredentialsError();
    });
  });

  it("shows error for incorrect password", () => {
    cy.fixture("testData").then((testData: { credentials: { admin: { username: string } } }) => {
      loginPage.login(testData.credentials.admin.username, "wrongPassword123");
      loginPage.assertInvalidCredentialsError();
    });
  });

  it("shows validation errors when fields are empty", () => {
    loginPage.submit();
    loginPage.assertRequiredFieldErrors();
  });

  it("logs out and redirects to login page", () => {
    cy.loginAsAdmin();
    cy.logout();
  });

  it("does not persist session after logout", () => {
    cy.loginAsAdmin();
    cy.logout();
    cy.visit("/web/index.php/dashboard/index");
    loginPage.assertLoginPageVisible();
  });

  it("shows all main menu items after login", () => {
    cy.loginAsAdmin();
    dashboardPage.assertMainMenuVisible();
  });

  it("shows expected title on login page", () => {
    cy.title().should("include", "OrangeHRM");
    loginPage.assertLoginPageVisible();
  });

  it("shows expected title on dashboard page after login", () => {
    cy.loginAsAdmin();
    cy.title().should("include", "OrangeHRM");
    dashboardPage.assertLoaded();
  });
});
