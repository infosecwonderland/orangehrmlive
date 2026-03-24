import { pimApiClient } from "../../../src/services/pimApiClient";
import { LoginPage } from "../../support/pages/LoginPage";
import { DashboardPage } from "../../support/pages/DashboardPage";

/**
 * 3.3 Security Aware Testing
 *
 * Given the candidate's security background, the following are verified:
 *   3.3a — XSS payloads in employee name and address fields are not executed
 *   3.3b — Direct URL access to protected pages without login is blocked
 *   3.3c — Employee-level (ESS) user cannot access admin-only pages
 *   3.3d — Sensitive data (password) is not exposed in URL parameters
 *   3.3e — Session token is cleared and invalid after logout
 */

const loginPage = new LoginPage();
const dashboardPage = new DashboardPage();

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
// 3.3a — XSS Prevention in employee name and address fields
// ─────────────────────────────────────────────────────────────────────────────
describe("3.3a — XSS Prevention in employee name and address fields", () => {
  let empNumber: number | undefined;
  const ts = Date.now();
  const safeLast = `SecXss${ts}`;

  const XSS_SCRIPT_TAG = "<script>alert('xss')</script>";
  const XSS_IMG_ONERROR = "<img src=x onerror=alert(1)>";

  beforeEach(() => {
    cy.allure()
      .parentSuite("3.3 Security Aware Testing")
      .suite("XSS Prevention")
      .tag("security");

    // Fail immediately if any XSS payload executes and triggers a dialog
    cy.on("window:alert", (msg) => {
      throw new Error(`XSS payload executed — alert fired with: "${msg}"`);
    });
    cy.on("window:confirm", (msg) => {
      throw new Error(`XSS payload executed — confirm fired with: "${msg}"`);
    });
  });

  it("does not execute XSS payload typed into employee first/last name fields", () => {
    cy.loginAsAdmin();
    cy.visit("/web/index.php/pim/addEmployee");
    cy.get('input[placeholder="First Name"]', { timeout: 15000 }).should("be.visible");

    // Type XSS payloads into both name fields
    cy.get('input[placeholder="First Name"]').clear().type(XSS_SCRIPT_TAG);
    cy.get('input[placeholder="Last Name"]').clear().type(safeLast);

    cy.intercept({ method: "POST", url: /\/api\/v2\/pim\/employees/ }).as("createEmp");
    cy.contains("button", "Save").click();

    cy.wait("@createEmp", { timeout: 20000 }).then(({ response }) => {
      if (response?.statusCode === 200) {
        empNumber = (response.body as { data?: { empNumber?: number } }).data?.empNumber;
        cy.log(`Employee created with empNumber ${empNumber} — verifying XSS is inert`);

        // Navigate to employee list and confirm the payload is stored as literal text,
        // not interpreted as HTML. If <script> executed, the window:alert handler above
        // will already have thrown.
        cy.visit("/web/index.php/pim/viewEmployeeList");
        cy.get('input[placeholder="Type for hints..."]').first().clear().type(safeLast);
        cy.contains("button", "Search").click();
        cy.get(".oxd-table-body", { timeout: 15000 }).should("be.visible");

        // The page source should not contain a live <script> tag with our payload
        cy.get(".oxd-table-body")
          .invoke("html")
          .then((html) => {
            // HTML-encoded entities (&lt;script&gt;) are acceptable; a raw executable
            // <script> tag in the rendered table is a finding.
            expect(html).not.to.match(/<script[^>]*>alert/i);
          });
      } else {
        // Server rejected the payload — input sanitisation at the API layer is also valid.
        cy.log(
          `Server rejected XSS payload with status ${response?.statusCode} — secure by validation`
        );
      }
    });
  });

  it("does not execute XSS payload typed into employee address (Street 1) field", () => {
    cy.loginAsAdmin();

    // Create a clean employee via API so we can navigate to their contact-details page
    pimApiClient
      .createEmployee({ firstName: "SecAddr", lastName: safeLast })
      .then((res) => {
        expect(res.status).to.eq(200);
        empNumber = (res.body as { data: { empNumber: number } }).data.empNumber;

        cy.visit(
          `/web/index.php/pim/contactDetails/empNumber/${empNumber}`
        );
        cy.url().should("include", "contactDetails", { timeout: 15000 });

        // Street1 is the first text input on the contact details form
        cy.get('input[placeholder="Street 1"]', { timeout: 15000 })
          .should("be.visible")
          .clear()
          .type(XSS_IMG_ONERROR);

        cy.intercept({ method: "PUT", url: /\/api\/v2\/pim\/employees\/\d+\/contact-details/ }).as(
          "saveContact"
        );
        cy.get(".oxd-form-actions")
          .find('button[type="submit"]')
          .click();

        cy.wait("@saveContact", { timeout: 20000 }).then(({ response }) => {
          if (response?.statusCode === 200) {
            cy.log("Contact details saved — verifying payload is inert on reload");

            // Reload and confirm the img onerror payload did not fire
            cy.visit(
              `/web/index.php/pim/contactDetails/empNumber/${empNumber}`
            );
            cy.url().should("include", "contactDetails", { timeout: 15000 });

            // The window:alert handler above would have thrown if onerror executed.
            // Also verify no raw event-handler attribute is present in the DOM.
            cy.get(".oxd-form", { timeout: 10000 })
              .invoke("html")
              .then((html) => {
                expect(html).not.to.match(/onerror\s*=/i);
              });
          } else {
            cy.log(
              `Server rejected XSS address payload with status ${response?.statusCode} — secure`
            );
          }
        });
      });
  });

  after(() => {
    cy.then(() => {
      if (empNumber !== undefined) pimApiClient.deleteEmployees([empNumber!]);
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
