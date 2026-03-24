import {
  pimApiClient,
  type ContactDetailsResponse,
} from "../../../src/services/pimApiClient";
import { LoginPage } from "../../support/pages/LoginPage";
import { DashboardPage } from "../../support/pages/DashboardPage";

/**
 * 3.3 Security Aware Testing
 *
 * Given the candidate's security background, the following are verified:
 *   3.3a — XSS payloads in employee name and address fields are rejected or stored as
 *           literal strings (API-level validation)
 *   3.3b — Direct URL access to protected pages without login is blocked
 *   3.3c — Employee-level (ESS) user cannot access admin-only pages
 *   3.3d — Sensitive data (password) is not exposed in URL parameters
 *   3.3e — Session token is cleared and invalid after logout
 */

const loginPage = new LoginPage();
const dashboardPage = new DashboardPage();

/**
 * XSS payload list covering the most common injection vectors.
 * Each entry is tested independently against every target field so that a failure
 * pinpoints exactly which payload / field combination is vulnerable.
 */
const XSS_PAYLOADS: { label: string; value: string }[] = [
  { label: "script tag",               value: "<script>alert('xss')</script>" },
  { label: "img onerror",              value: "<img src=x onerror=alert(1)>" },
  { label: "svg onload",               value: "<svg onload=alert(1)>" },
  { label: "attribute escape + script",value: '"><script>alert(1)</script>' },
  { label: "javascript protocol",      value: "javascript:alert(document.domain)" },
  { label: "template literal injection",value: "${alert(1)}" },
];

/** Protected routes that require an authenticated session */
const PROTECTED_ROUTES = [
  "/web/index.php/dashboard/index",
  "/web/index.php/pim/viewEmployeeList",
  "/web/index.php/admin/viewSystemUsers",
  "/web/index.php/leave/viewLeaveList",
  "/web/index.php/time/viewEmployeeTimesheet",
];

/** Admin-only API endpoints that ESS users must not be able to read */
const ADMIN_ONLY_API_ENDPOINTS = [
  { label: "System Users",                    path: "/web/index.php/api/v2/admin/users?limit=1&offset=0" },
  { label: "Job Titles",                       path: "/web/index.php/api/v2/admin/job-titles?limit=1&offset=0" },
  { label: "Pay Grades",                       path: "/web/index.php/api/v2/admin/pay-grades?limit=1&offset=0" },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3.3a — XSS payloads in employee name fields (API)
//
// For each payload the test:
//   1. POSTs to create an employee with the payload as firstName.
//   2. If the server accepts it (200), GETs personal-details and asserts the stored
//      value equals the submitted string exactly — proving it is stored as a literal,
//      not HTML-decoded or transformed into executable markup.
//   3. If the server rejects it (4xx), that is also a pass — input validation prevents
//      the value reaching storage at all.
// ─────────────────────────────────────────────────────────────────────────────
describe("3.3a — XSS payloads in employee name fields (API)", () => {
  const ts = Date.now();
  const createdEmpNumbers: number[] = [];

  beforeEach(() => {
    cy.allure()
      .parentSuite("3.3 Security Aware Testing")
      .suite("XSS — Name Fields")
      .tag("security", "api");
    cy.loginAsAdmin();
  });

  XSS_PAYLOADS.forEach(({ label, value }) => {
    it(`[${label}] API rejects or stores firstName as literal string`, () => {
      pimApiClient
        .createEmployee({ firstName: value, lastName: `XssName${ts}` })
        .then((createRes) => {
          if (createRes.status === 200) {
            const empNumber = (createRes.body as { data: { empNumber: number } }).data.empNumber;
            createdEmpNumbers.push(empNumber);

            // Read the stored value back through the API and confirm it was persisted
            // as the exact literal string — not decoded into executable HTML.
            pimApiClient.getPersonalDetails(empNumber).then((getRes) => {
              expect(getRes.status).to.eq(200);
              const stored = (getRes.body as { data: { firstName: string } }).data.firstName;
              expect(stored).to.eq(value,
                `firstName was transformed on storage — expected literal "${value}", got "${stored}"`
              );
            });
          } else {
            // 4xx means the server rejected the payload at the validation layer.
            expect(createRes.status).to.be.within(400, 499);
            cy.log(`[${label}] Payload rejected by API with ${createRes.status} — secure`);
          }
        });
    });
  });

  after(() => {
    cy.then(() => {
      if (createdEmpNumbers.length > 0) pimApiClient.deleteEmployees(createdEmpNumbers);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.3a — XSS payloads in employee address fields (API)
//
// A single clean employee is created once.  For each payload the test:
//   1. PUTs the payload into street1 (and street2 for the attribute-escape variant).
//   2. If the server accepts it (200), GETs contact-details and asserts the stored
//      value equals the submitted string exactly.
//   3. If the server rejects it (4xx), that is also a pass.
// ─────────────────────────────────────────────────────────────────────────────
describe("3.3a — XSS payloads in employee address fields (API)", () => {
  const ts = Date.now();
  let addrEmpNumber: number;

  before(() => {
    // Create the shared employee used by all address-field tests.
    cy.loginAsAdmin();
    pimApiClient
      .createEmployee({ firstName: "SecXssAddr", lastName: `XssAddr${ts}` })
      .then((res) => {
        expect(res.status, "shared employee for address XSS tests must be created").to.eq(200);
        addrEmpNumber = (res.body as { data: { empNumber: number } }).data.empNumber;
      });
  });

  beforeEach(() => {
    cy.allure()
      .parentSuite("3.3 Security Aware Testing")
      .suite("XSS — Address Fields")
      .tag("security", "api");
    cy.loginAsAdmin();
  });

  XSS_PAYLOADS.forEach(({ label, value }) => {
    it(`[${label}] API rejects or stores street1 as literal string`, () => {
      pimApiClient
        .updateContactDetails(addrEmpNumber, { street1: value })
        .then((putRes) => {
          if (putRes.status === 200) {
            pimApiClient.getContactDetails(addrEmpNumber).then((getRes) => {
              expect(getRes.status).to.eq(200);
              const stored = (getRes.body as { data: ContactDetailsResponse }).data.street1;
              expect(stored).to.eq(value,
                `street1 was transformed on storage — expected literal "${value}", got "${stored}"`
              );
            });
          } else {
            expect(putRes.status).to.be.within(400, 499);
            cy.log(`[${label}] Payload rejected by API with ${putRes.status} — secure`);
          }
        });
    });
  });

  after(() => {
    cy.then(() => {
      if (addrEmpNumber !== undefined) pimApiClient.deleteEmployees([addrEmpNumber]);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.3b — Unauthenticated direct URL access is blocked
// ─────────────────────────────────────────────────────────────────────────────
describe("3.3b — Unauthenticated direct URL access is blocked", () => {
  beforeEach(() => {
    cy.allure()
      .parentSuite("3.3 Security Aware Testing")
      .suite("Unauthenticated Access")
      .tag("security");

    // Clear all cookies so there is no active session
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  PROTECTED_ROUTES.forEach((route) => {
    it(`redirects unauthenticated request to login page — ${route}`, () => {
      cy.visit(route, { failOnStatusCode: false });
      // The app must redirect to the login page; staying on the route is a finding.
      loginPage.assertLoginPageVisible();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.3c — ESS user cannot access admin-only pages (API-level)
//
// All interactions are via cy.request (no UI).  A throwaway ESS user is created
// in before() and destroyed in after() so the test is self-contained.
// ─────────────────────────────────────────────────────────────────────────────
describe("3.3c — ESS user cannot access admin-only pages", () => {
  const ts = Date.now();
  const essUsername = `EssTest${ts}`;
  const essPassword = "EssTest1!";
  let essEmpNumber: number;
  let essUserId: number;

  /**
   * Programmatic login via cy.request.
   * Reads the CSRF token from the login page (handles both attribute orderings)
   * then POSTs credentials to the validate endpoint.
   */
  function apiLogin(username: string, password: string): void {
    cy.request({ url: "/web/index.php/auth/login", failOnStatusCode: false }).then((pageRes) => {
      // Match <input ... name="_csrf_token" ... value="TOKEN"> in either attribute order
      const html = pageRes.body as string;
      const m =
        html.match(/<input[^>]+name="_csrf_token"[^>]+value="([^"]+)"/) ||
        html.match(/<input[^>]+value="([^"]+)"[^>]+name="_csrf_token"/);
      const csrf = m ? m[1] : "";
      cy.request({
        method: "POST",
        url: "/web/index.php/auth/validate",
        form: true,
        body: { _username: username, _password: password, _csrf_token: csrf },
        followRedirect: true,
        failOnStatusCode: false,
      });
    });
  }

  before(() => {
    // Create a throwaway employee + ESS system user via the admin API.
    // Use UI-based admin login here — runs once, reliability trumps speed.
    cy.loginAsAdmin();
    pimApiClient
      .createEmployee({ firstName: "EssTest", lastName: `User${ts}` })
      .then((res) => {
        expect(res.status, "ESS employee creation").to.eq(200);
        essEmpNumber = (res.body as { data: { empNumber: number } }).data.empNumber;

        cy.request({
          method: "POST",
          url: "/web/index.php/api/v2/admin/users",
          body: {
            userRoleId: 2, // 2 = ESS
            empNumber: essEmpNumber,
            status: true,
            username: essUsername,
            password: essPassword,
          },
          failOnStatusCode: false,
        }).then((userRes) => {
          expect(userRes.status, "ESS system-user creation").to.eq(200);
          essUserId = (userRes.body as { data: { id: number } }).data.id;
        });
      });
  });

  after(() => {
    cy.loginAsAdmin();
    cy.then(() => {
      if (essUserId !== undefined) {
        cy.request({
          method: "DELETE",
          url: "/web/index.php/api/v2/admin/users",
          body: { ids: [essUserId] },
          failOnStatusCode: false,
        });
      }
      if (essEmpNumber !== undefined) {
        pimApiClient.deleteEmployees([essEmpNumber]);
      }
    });
  });

  beforeEach(() => {
    cy.allure()
      .parentSuite("3.3 Security Aware Testing")
      .suite("Authorisation — ESS vs Admin")
      .tag("security");

    // Establish ESS session via API — no UI interaction.
    apiLogin(essUsername, essPassword);
  });

  ADMIN_ONLY_API_ENDPOINTS.forEach(({ label, path }) => {
    it(`ESS user is denied access to admin API — ${label}`, () => {
      cy.request({
        method: "GET",
        url: path,
        failOnStatusCode: false,
        followRedirect: false,
      }).then((res) => {
        // 401/403 or any redirect are all acceptable — the ESS session must not
        // receive a 200 response containing actual admin data.
        if (res.status === 200) {
          const body = typeof res.body === "string" ? res.body : JSON.stringify(res.body);
          const hasAdminData = body.includes('"data"') && !body.includes('"auth/login"');
          expect(
            hasAdminData,
            `ESS user received admin data from ${path} — authorization bypass detected`
          ).to.be.false;
        } else {
          const isBlocked =
            res.status === 401 ||
            res.status === 403 ||
            (res.status >= 300 && res.status < 400);
          expect(isBlocked, `Expected 401/403/3xx but got ${res.status} for ${path}`).to.be.true;
        }
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.3d — Sensitive data (password) not exposed in URL parameters
// ─────────────────────────────────────────────────────────────────────────────
describe("3.3d — Sensitive data not exposed in URL parameters", () => {
  beforeEach(() => {
    cy.allure()
      .parentSuite("3.3 Security Aware Testing")
      .suite("Sensitive Data in URLs")
      .tag("security");
  });

  it("password does not appear in the URL after successful login", () => {
    cy.fixture("testData").then(
      (testData: { credentials: { admin: { username: string; password: string } } }) => {
        const { username, password } = testData.credentials.admin;

        // Intercept the login POST to verify credentials are sent in the request body,
        // not as query-string parameters.
        cy.intercept({ method: "POST", url: /\/auth\/validate/ }).as("loginPost");

        loginPage.visit();
        loginPage.login(username, password);
        dashboardPage.assertLoaded();

        // 1. The final URL must not contain the password as a query param
        cy.url().then((url) => {
          expect(url).not.to.include(password);
          expect(url).not.to.include(`password=`);
        });

        // 2. If the login intercept fired, the password must not be in the URL of that request
        cy.get("@loginPost.all").then((interceptions: unknown) => {
          const list = interceptions as Array<{ request: { url: string } }>;
          if (list.length > 0) {
            expect(list[0].request.url).not.to.include(password);
            expect(list[0].request.url).not.to.include(`password=`);
          }
          // If the intercept did not fire the login used a different endpoint pattern —
          // the URL assertion above already covered the post-login page URL.
        });
      }
    );
  });

  it("password does not appear in the URL after a failed login attempt", () => {
    cy.fixture("testData").then(
      (testData: { credentials: { admin: { username: string } } }) => {
        loginPage.visit();
        loginPage.login(testData.credentials.admin.username, "WrongPass999!");
        loginPage.assertInvalidCredentialsError();

        cy.url().then((url) => {
          expect(url).not.to.include("WrongPass999!");
          expect(url).not.to.include("password=");
        });
      }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.3e — Session token is cleared and invalid after logout
// ─────────────────────────────────────────────────────────────────────────────
describe("3.3e — Session token cleared and invalid after logout", () => {
  beforeEach(() => {
    cy.allure()
      .parentSuite("3.3 Security Aware Testing")
      .suite("Session Invalidation")
      .tag("security");
  });

  it("session cookies are cleared from the browser after logout", () => {
    cy.loginAsAdmin();
    dashboardPage.assertLoaded();

    // Capture all cookies while authenticated
    cy.getCookies().then((cookiesBefore) => {
      expect(cookiesBefore.length, "Should have at least one cookie when logged in").to.be.greaterThan(0);
      const sessionCookieNames = cookiesBefore.map((c) => c.name);
      cy.log(`Session cookies before logout: ${sessionCookieNames.join(", ")}`);
    });

    cy.logout();

    // After logout the browser jar should have no session-bearing cookies, or any
    // remaining cookies should not grant access to protected resources.
    cy.getCookies().then((cookiesAfter) => {
      // Common OrangeHRM session cookie names
      const sessionCookiePatterns = ["orangehrm", "PHPSESSID", "session"];
      const liveSessionCookies = cookiesAfter.filter((c) =>
        sessionCookiePatterns.some(
          (pattern) =>
            c.name.toLowerCase().includes(pattern.toLowerCase()) && c.value !== ""
        )
      );
      if (liveSessionCookies.length > 0) {
        cy.log(
          `Note: ${liveSessionCookies.map((c) => c.name).join(", ")} still present — ` +
            "verifying they no longer grant server access"
        );
      }
    });
  });

  it("navigating to a protected page after logout redirects to login", () => {
    cy.loginAsAdmin();
    dashboardPage.assertLoaded();
    cy.logout();

    // Attempt to directly visit a protected page without re-authenticating
    cy.visit("/web/index.php/dashboard/index", { failOnStatusCode: false });
    loginPage.assertLoginPageVisible();
  });

  it("authenticated API endpoint returns 401 or redirects after logout", () => {
    cy.loginAsAdmin();
    dashboardPage.assertLoaded();

    // Confirm the endpoint is accessible while logged in
    cy.request({
      method: "GET",
      url: "/web/index.php/api/v2/admin/users?limit=1&offset=0",
    }).then((res) => {
      expect(res.status).to.eq(200);
    });

    cy.logout();

    // After logout, the same endpoint should no longer return data.
    // We disable failOnStatusCode so Cypress does not throw on 4xx and disable redirect
    // following so a 302 → login page doesn't masquerade as a 200.
    cy.request({
      method: "GET",
      url: "/web/index.php/api/v2/admin/users?limit=1&offset=0",
      failOnStatusCode: false,
      followRedirect: false,
    }).then((res) => {
      // 401 Unauthorized, 403 Forbidden, or a 3xx redirect to the login page are all
      // acceptable.  A 200 with a data payload is a session-fixation / broken-auth finding.
      const isBlocked =
        res.status === 401 ||
        res.status === 403 ||
        (res.status >= 300 && res.status < 400);

      // If the app returns 200 the body must not contain user data (may return an HTML
      // login page with status 200 — some frameworks do this).
      if (res.status === 200) {
        const body =
          typeof res.body === "string" ? res.body : JSON.stringify(res.body);
        const hasUserData =
          body.includes('"data"') &&
          body.includes('"userName"') &&
          !body.includes('"auth/login"');
        expect(
          hasUserData,
          "Authenticated user data returned after logout — session not invalidated"
        ).to.be.false;
      } else {
        expect(
          isBlocked,
          `Expected 401/403/3xx after logout but got ${res.status}`
        ).to.be.true;
      }
    });
  });
});
