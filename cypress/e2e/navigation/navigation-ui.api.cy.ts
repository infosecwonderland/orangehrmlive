import { apiClient } from "../../../src/services/apiClient";

interface TestData {
  credentials: { admin: { username: string; password: string } };
}

describe("Navigation and UI Validation API", () => {
  let adminUsername: string;
  let adminPassword: string;

  before(() => {
    cy.fixture("testData").then((data: TestData) => {
      adminUsername = data.credentials.admin.username;
      adminPassword = data.credentials.admin.password;
    });
  });

  beforeEach(() => {
    apiClient.authenticate({ username: adminUsername, password: adminPassword });
  });

  // 1.3a — all main menu modules are accessible via their API endpoints after login
  it("all main menu modules are accessible via API after login", () => {
    const moduleEndpoints = [
      "/web/index.php/api/v2/admin/users",
      "/web/index.php/api/v2/pim/employees",
      "/web/index.php/api/v2/leave/leave-types",
      "/web/index.php/api/v2/recruitment/vacancies",
      "/web/index.php/api/v2/directory/employees",
      "/web/index.php/api/v2/dashboard/shortcuts",
    ];

    moduleEndpoints.forEach((url) => {
      cy.request({ method: "GET", url, failOnStatusCode: false }).then((res) => {
        expect(res.status, `${url} should be accessible`).to.eq(200);
      });
    });
  });

  // 1.3b — each module endpoint returns the expected data structure
  it("each module API returns a data array with correct structure", () => {
    const modules: { url: string; label: string }[] = [
      { url: "/web/index.php/api/v2/admin/users",         label: "Admin users"           },
      { url: "/web/index.php/api/v2/pim/employees",       label: "PIM employees"         },
      { url: "/web/index.php/api/v2/leave/leave-types",   label: "Leave types"           },
      { url: "/web/index.php/api/v2/recruitment/vacancies", label: "Recruitment vacancies" },
      { url: "/web/index.php/api/v2/directory/employees", label: "Directory employees"   },
    ];

    modules.forEach(({ url, label }) => {
      cy.request({ method: "GET", url }).then((res) => {
        expect(res.status, `${label} status`).to.eq(200);
        expect(res.body, `${label} body`).to.have.property("data");
        expect((res.body as { data: unknown }).data, `${label} data`).to.be.an("array");
      });
    });
  });

  // 1.3c — dashboard API endpoints return data without errors
  it("dashboard API endpoints return data without errors", () => {
    cy.request({
      method: "GET",
      url: "/web/index.php/api/v2/dashboard/shortcuts",
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property("data");
      expect((res.body as { data: unknown }).data).to.be.an("object").and.not.be.empty;
    });

    cy.request({
      method: "GET",
      url: "/web/index.php/api/v2/dashboard/employees/action-summary",
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property("data");
    });
  });
});
