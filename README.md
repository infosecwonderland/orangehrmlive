# OrangeHRM Automation Framework

End-to-end test automation framework for [OrangeHRM](https://opensource-demo.orangehrmlive.com) built with Cypress and TypeScript.

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

### Performance tests only
```bash
npm run cypress:run -- --spec "cypress/e2e/performance/performance.cy.ts"
```

### Security tests only
```bash
npm run cypress:run -- --spec "cypress/e2e/security/**/*.cy.ts"
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
│   │   ├── auth/
│   │   │   ├── auth-navigation.cy.ts            # 1.1 Authentication — UI
│   │   │   └── auth-navigation.api.cy.ts        # 1.1 Authentication — API
│   │   ├── navigation/
│   │   │   ├── navigation-ui.cy.ts              # 1.3 Navigation & UI Validation — UI
│   │   │   └── navigation-ui.api.cy.ts          # 1.3 Navigation & UI Validation — API
│   │   ├── pim/
│   │   │   ├── pim-employee.cy.ts               # 1.2 Employee Management — UI
│   │   │   └── pim-employee.api.cy.ts           # 1.2 Employee Management — API
│   │   ├── leave/
│   │   │   ├── leave-lifecycle.ui.cy.ts         # 2.1 Leave Lifecycle — UI
│   │   │   └── leave-lifecycle.api.cy.ts        # 2.1 Leave Lifecycle — API
│   │   ├── recruitment/
│   │   │   ├── recruitment-lifecycle.ui.cy.ts   # 2.2 Recruitment Lifecycle — UI
│   │   │   └── recruitment-lifecycle.api.cy.ts  # 2.2 Recruitment Lifecycle — API
│   │   ├── integrity/
│   │   │   └── data-validation.ui.cy.ts         # 2.3 Data Integrity Checks
│   │   ├── performance/
│   │   │   └── performance.cy.ts                # 3.2 Performance Benchmarks
│   │   └── security/
│   │       └── security-aware.ui.cy.ts          # 3.3 Security Aware Testing
│   ├── fixtures/
│   │   └── testData.json                        # Externalized test data
│   └── support/
│       ├── commands.ts                          # Custom Cypress commands
│       ├── e2e.ts                               # Global setup
│       └── pages/                              # Page Object Models
│           ├── LoginPage.ts
│           ├── DashboardPage.ts
│           ├── PimPage.ts
│           ├── LeavePage.ts
│           ├── LeaveTypesPage.ts
│           ├── RecruitmentPage.ts
│           ├── ReportsPage.ts
│           ├── AttendancePage.ts
│           └── SystemUsersPage.ts
├── src/
│   └── services/
│       ├── apiClient.ts                         # Auth + base HTTP client
│       ├── pimApiClient.ts                      # PIM module API client
│       ├── leaveApiClient.ts                    # Leave module API client
│       └── recruitmentApiClient.ts              # Recruitment module API client
├── .github/
│   └── workflows/
│       └── ci.yml                              # GitHub Actions CI pipeline
└── cypress.config.ts
```

---

## Test Coverage

| Section | Tests | Approach |
|---|---|---|
| 1.1 Authentication | Login (valid/invalid/empty), logout, session persistence | UI + API |
| 1.2 Employee Management | Add, search, edit, delete, auto-generated ID | UI + API |
| 1.3 Navigation & UI | Menu items, page titles, dashboard widgets | UI + API |
| 2.1 Leave Lifecycle | Create type, apply, approve, balance check, cancel, overlap | UI + API |
| 2.2 Recruitment Lifecycle | Vacancy, candidates, interview, shortlist, reject, hire, PIM check | UI + API |
| 2.3 Data Integrity | Employee in reports, leave in leave list, cross-module consistency | UI + API |
| 3.1 API + UI Hybrid | Auth token, create/fetch/delete employee, apply/approve leave, intercept | API |
| 3.2 Performance | 7 thresholds (login, dashboard, employee list, create, search, leave, reports) | API + UI |
| 3.3 Security | XSS (name + address), unauthenticated access, ESS vs admin, password in URL, session invalidation | API + UI |

---

## CI Pipeline

Tests run automatically on every push to `main` or any `feature/**` branch.

**Jobs:**
1. **UI Tests (Chrome + Firefox)** — runs all `.cy.ts` specs (excluding API, performance, security) in parallel across browsers
2. **API Tests** — runs all `.api.cy.ts` specs on Chrome
3. **Performance Tests** — runs performance benchmarks on Chrome (`continue-on-error: true`)
4. **Security Tests** — runs security suite on Chrome
5. **Allure Report** — downloads all results, generates and uploads the combined HTML report as an artifact

The Allure report is available as a downloadable artifact from the GitHub Actions run.

---

## Framework Quality

| Feature | Implementation |
|---|---|
| Page Object Model | `cypress/support/pages/` |
| Service layer | `src/services/` (apiClient, pimApiClient, leaveApiClient, recruitmentApiClient) |
| TypeScript strict mode | No `any` types |
| Externalized test data | `cypress/fixtures/testData.json` |
| Dynamic waits | Cypress built-in retry-ability |
| Retry on failure | `retries: { runMode: 1 }` |
| Screenshots on failure | `screenshotOnRunFailure: true` |
| Video recording | `video: true` |
| Allure reporting | `@shelex/cypress-allure-plugin` |
| Parallel execution | `cypress-split` + `concurrently` |
| Cross-browser | Chrome and Firefox via CI matrix |
| CI pipeline | GitHub Actions — triggered on push to `main` / `feature/**` |
