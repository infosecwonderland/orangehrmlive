export class LoginPage {
  visit(): void {
    // failOnStatusCode: false lets Cypress continue on transient 5xx responses
    // so the retry mechanism can recover rather than hard-failing immediately.
    cy.visit("/web/index.php/auth/login", { failOnStatusCode: false });
  }

  fillUsername(username: string): void {
    cy.get('input[name="username"]').clear().type(username);
  }

  fillPassword(password: string): void {
    cy.get('input[name="password"]').clear().type(password, { log: false });
  }

  submit(): void {
    cy.get('button[type="submit"]').click();
  }

  login(username: string, password: string): void {
    this.fillUsername(username);
    this.fillPassword(password);
    this.submit();
  }

  assertInvalidCredentialsError(): void {
    cy.contains("Invalid credentials").should("be.visible");
  }

  assertRequiredFieldErrors(count = 2): void {
    cy.contains("Required").should("be.visible");
    cy.get(".oxd-input-field-error-message").should("have.length.at.least", count);
  }

  assertLoginPageVisible(): void {
    cy.url().should("include", "/auth/login");
    cy.get('button[type="submit"]').should("be.visible");
  }
}