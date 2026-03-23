export interface ApiCredentials {
  username: string;
  password: string;
}

export const apiClient = {
  // Extract CSRF token embedded in the Vue component on the login page:
  // <auth-login :token="&quot;TOKEN&quot;" ...>
  getCsrfToken(): Cypress.Chainable<string> {
    return cy.request({
      method: "GET",
      url: "/web/index.php/auth/login",
    }).then((res) => {
      const match = (res.body as string).match(/:token="&quot;(.+?)&quot;"/);
      if (!match) throw new Error("CSRF token not found in login page HTML");
      return match[1];
    });
  },

  // POST login form — returns redirect location to assert success or failure.
  // Success: location includes "/dashboard"
  // Failure: location includes "/auth/login"
  postLogin(credentials: ApiCredentials, csrfToken: string): Cypress.Chainable<string> {
    return cy.request({
      method: "POST",
      url: "/web/index.php/auth/validate",
      form: true,
      body: {
        username: credentials.username,
        password: credentials.password,
        _token: csrfToken,
      },
      followRedirect: false,
      failOnStatusCode: false,
    }).then((res) => (res.headers["location"] as string) ?? "");
  },

  // Happy path: GET CSRF → POST login → verify redirect to dashboard → return session cookie
  authenticate(credentials: ApiCredentials): Cypress.Chainable<string> {
    return this.getCsrfToken().then((csrfToken) =>
      this.postLogin(credentials, csrfToken).then((location) => {
        if (location.includes("auth/login")) throw new Error("Login failed — invalid credentials or CSRF issue");
        return cy.getCookie("orangehrm").then((cookie) => {
          if (!cookie?.value) throw new Error("Session cookie not set after login");
          return cookie.value;
        });
      })
    );
  },

  logout(): Cypress.Chainable<Cypress.Response<unknown>> {
    return cy.request({
      method: "GET",
      url: "/web/index.php/auth/logout",
      failOnStatusCode: false,
    });
  },

  getDashboardShortcuts(): Cypress.Chainable<Cypress.Response<unknown>> {
    return cy.request({
      method: "GET",
      url: "/web/index.php/api/v2/dashboard/shortcuts",
      failOnStatusCode: false,
    });
  },
};
