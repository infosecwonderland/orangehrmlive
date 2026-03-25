import { apiClient } from "../../../src/services/apiClient";

type DashboardResponse = {
  data: Record<string, unknown>;
};

describe("Auth API", () => {
  let adminUsername: string;
  let adminPassword: string;

  before(() => {
    cy.fixture("testData").then((testData: { credentials: { admin: { username: string; password: string } } }) => {
      adminUsername = testData.credentials.admin.username;
      adminPassword = testData.credentials.admin.password;
    });
  });

  beforeEach(() => {
    cy.allure()
      .parentSuite("1.1 Authentication")
      .suite("API")
      .tag("auth", "api");
    cy.clearCookies();
  });

  // API: logs in with valid credentials and loads dashboard
  it("valid credentials — session cookie set and dashboard returns 200", () => {
    apiClient.authenticate({ username: adminUsername, password: adminPassword }).then((sessionCookie) => {
      expect(sessionCookie).to.be.a("string").and.have.length.greaterThan(10);

      apiClient.getDashboardShortcuts().then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property("data");
      });
    });
  });

  // API: invalid username — login fails, protected endpoint returns 401
  it("invalid username — login redirects to login page and dashboard returns 401", () => {
    apiClient.getCsrfToken().then((csrfToken) => {
      apiClient.postLogin({ username: "InvalidAdmin", password: adminPassword }, csrfToken).then((location) => {
        expect(location).to.include("auth/login");

        apiClient.getDashboardShortcuts().then((res) => {
          expect(res.status).to.eq(401);
        });
      });
    });
  });

  // API: incorrect password — login fails, protected endpoint returns 401
  it("incorrect password — login redirects to login page and dashboard returns 401", () => {
    apiClient.getCsrfToken().then((csrfToken) => {
      apiClient.postLogin({ username: adminUsername, password: "wrongPassword123" }, csrfToken).then((location) => {
        expect(location).to.include("auth/login");

        apiClient.getDashboardShortcuts().then((res) => {
          expect(res.status).to.eq(401);
        });
      });
    });
  });

  // API: empty credentials — login fails, protected endpoint returns 401
  it("empty credentials — login redirects to login page and dashboard returns 401", () => {
    apiClient.getCsrfToken().then((csrfToken) => {
      apiClient.postLogin({ username: "", password: "" }, csrfToken).then((location) => {
        expect(location).to.include("auth/login");

        apiClient.getDashboardShortcuts().then((res) => {
          expect(res.status).to.eq(401);
        });
      });
    });
  });

  // API: logout — session invalidated, protected endpoint returns 401
  it("logout — session cookie invalidated and dashboard returns 401", () => {
    apiClient.authenticate({ username: adminUsername, password: adminPassword }).then(() => {
      apiClient.logout().then(() => {
        apiClient.getDashboardShortcuts().then((res) => {
          expect(res.status).to.eq(401);
        });
      });
    });
  });

  // API: session does not persist after logout
  it("session does not persist after logout — dashboard returns 401", () => {
    apiClient.authenticate({ username: adminUsername, password: adminPassword }).then(() => {
      apiClient.logout().then(() => {
        cy.clearCookies();
        apiClient.getDashboardShortcuts().then((res) => {
          expect(res.status).to.eq(401);
        });
      });
    });
  });

  // API: dashboard data accessible after login (equivalent to main menu items visible)
  it("after login — dashboard shortcuts API returns data", () => {
    apiClient.authenticate({ username: adminUsername, password: adminPassword }).then(() => {
      apiClient.getDashboardShortcuts().then((res) => {
        expect(res.status).to.eq(200);
        const body = res.body as DashboardResponse;
        expect(body.data).to.be.an("object").and.not.be.empty;
      });
    });
  });
});
