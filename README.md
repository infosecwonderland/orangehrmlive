# OrangeHRM Automation Framework

End-to-end test automation framework for [OrangeHRM](https://opensource-demo.orangehrmlive.com) built with Cypress and TypeScript.1

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ |
| npm | 9+ |
| Java | 8+ (required for Allure CLI) |

> Java is only needed to generate and open Allure reports locally.

---

## Installation

```bash
git clone <repo-url>
cd orangehrmlive
npm ci
```

---

## Running Tests

### All tests (headless)
```bash
npm test
```

### Open Cypress UI (interactive mode)
```bash
npm run cypress:open
```

### UI tests only
```bash
npm run cypress:run -- --spec "cypress/e2e/**/*.cy.ts" --config excludeSpecPattern="cypress/e2e/**/*.api.cy.ts"
```

### API tests only
```bash
npm run cypress:run -- --spec "cypress/e2e/**/*.api.cy.ts"
```

### Run a specific spec
```bash
npm run cypress:run -- --spec "cypress/e2e/auth/auth-navigation.cy.ts"
```

---

## Allure Reporting

### Run tests and collect results
```bash
npm run test:allure
```

### Generate HTML report
```bash
npm run allure:report
```

### Open the report
```bash
npm run allure:open
```

### Or do it all in one go
```bash
npm run test:allure && npm run allure:report && npm run allure:open
```

---

## Parallel Execution

Runs specs split across 2 local processes simultaneously:

```bash
npm run test:parallel
```

After completion, generate the report:
```bash
npm run allure:report
npm run allure:open
```

---

## Project Structure

```
├── cypress/
│   ├── e2e/
│   │   └── auth/
│   │       ├── auth-navigation.cy.ts       # UI tests
│   │       └── auth-navigation.api.cy.ts   # API tests
│   ├── fixtures/
│   │   └── testData.json                   # Externalized test data
│   └── support/
│       ├── commands.ts                     # Custom Cypress commands
│       ├── e2e.ts                          # Global setup
│       └── pages/                          # Page Object Models
│           ├── LoginPage.ts
│           └── DashboardPage.ts
├── src/
│   └── services/
│       └── apiClient.ts                    # API client
├── .github/
│   └── workflows/
│       └── ci.yml                          # GitHub Actions CI pipeline
└── cypress.config.ts
```

---

## CI Pipeline

Tests run automatically on every push to `main`.

**Jobs:**
1. **Cypress Tests** — runs UI tests then API tests on Chrome, uploads allure results
2. **Allure Report** — downloads results, generates and uploads the HTML report

The Allure report is available as a downloadable artifact from the GitHub Actions run.

---

## Framework Quality

| Feature | Implementation |
|---|---|
| Page Object Model | `cypress/support/pages/` |
| Service layer | `src/services/apiClient.ts` |
| TypeScript strict mode | No `any` types |
| Externalized test data | `cypress/fixtures/testData.json` |
| Dynamic waits | Cypress built-in retry-ability, no `cy.wait(ms)` |
| Retry on failure | `retries: { runMode: 1 }` |
| Screenshots on failure | `screenshotOnRunFailure: true` |
| Video recording | `video: true` |
| Allure reporting | `@shelex/cypress-allure-plugin` |
| Parallel execution | `cypress-split` + `concurrently` |
| CI pipeline | GitHub Actions on push to main |
