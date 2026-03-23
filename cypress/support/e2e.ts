import "./commands";
import "@shelex/cypress-allure-plugin";

// The OrangeHRM demo app throws unhandled promise rejections from its internal
// Axios instance during logout. These are external app bugs, not test failures.
// Suppress them so logout requirement assertions can run.
Cypress.on("uncaught:exception", (err) => {
  if (
    err.message.includes("Cannot read properties of undefined (reading 'response')") ||
    err.message.includes("Request aborted")
  ) {
    return false;
  }
});

