import "./commands";
import "@shelex/cypress-allure-plugin";

// The OrangeHRM demo app throws an unhandled promise rejection during logout
// (cannot read 'response' of undefined in app.js). This is an external app bug,
// not a test failure. Suppress it so logout requirement assertions can run.
Cypress.on("uncaught:exception", (err) => {
  if (err.message.includes("Cannot read properties of undefined (reading 'response')")) {
    return false;
  }
});

