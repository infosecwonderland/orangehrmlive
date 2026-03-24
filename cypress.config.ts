import { defineConfig } from "cypress";
import allureCypress from "@shelex/cypress-allure-plugin/writer";
import cypressSplit from "cypress-split";

export default defineConfig({
  e2e: {
    baseUrl: "https://opensource-demo.orangehrmlive.com",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    env: {
      allure: true,
      allureResultsPath: "allure-results",
    },
    setupNodeEvents(on, config) {
      cypressSplit(on, config);
      config.env.allureResultsPath = config.env.allureResultsPath ?? "allure-results";
      allureCypress(on, config);
      return config;
    },
  },
  video: true,
  screenshotOnRunFailure: true,
  defaultCommandTimeout: 10000,
  pageLoadTimeout: 60000,
  responseTimeout: 60000,
  requestTimeout: 60000,
  retries: {
    runMode: 1,
    openMode: 0,
  },
});
