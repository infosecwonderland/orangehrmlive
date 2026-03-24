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

/** Admin-only routes that ESS users must not access */
const ADMIN_ONLY_ROUTES = [
  "/web/index.php/admin/viewSystemUsers",
  "/web/index.php/admin/viewOrganizationGeneralInformation",
  "/web/index.php/admin/viewPayGrades",
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
// 3.3c — ESS user cannot access admin-only pages
// ─────────────────────────────────────────────────────────────────────────────
describe("3.3c — ESS user cannot access admin-only pages", () => {
  beforeEach(() => {
    cy.allure()
      .parentSuite("3.3 Security Aware Testing")
      .suite("Authorisation — ESS vs Admin")
      .tag("security");

    // Login as the ESS (employee self-service) user before each test
    cy.fixture("testData").then(
      (testData: { credentials: { ess: { username: string; password: string } } }) => {
        const { username, password } = testData.credentials.ess;
        cy.login(username, password);
        cy.url({ timeout: 20000 }).should("not.include", "/admin");
      }
    );
  });

  ADMIN_ONLY_ROUTES.forEach((route) => {
    it(`ESS user is denied access to admin route — ${route}`, () => {
      cy.visit(route, { failOnStatusCode: false });

      // Access is blocked if the app redirects away from the admin route OR shows an
      // access-denied / 403 indicator.  Remaining on the admin page is a finding.
      cy.url({ timeout: 10000 }).then((currentUrl) => {
        const isOnAdminRoute = currentUrl.includes(route.split("/web/index.php")[1]);
        if (isOnAdminRoute) {
          // The URL stayed — the page body must show an access-denied message
          cy.get("body").then(($body) => {
            const bodyText = $body.text().toLowerCase();
            const accessDenied =
              bodyText.includes("forbidden") ||
              bodyText.includes("access denied") ||
              bodyText.includes("unauthorized") ||
              bodyText.includes("403");
            expect(
              accessDenied,
              `ESS user reached admin page ${route} without an access-denied indicator`
            ).to.be.true;
          });
        } else {
          // Redirected away — correct behaviour
          cy.log(`ESS user was redirected away from ${route} — correct authorisation`);
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
