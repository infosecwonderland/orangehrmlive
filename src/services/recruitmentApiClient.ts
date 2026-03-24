export interface JobTitle {
  id: number;
  title: string;
  description: string | null;
  isDeleted: boolean;
}

export interface Vacancy {
  id: number;
  name: string;
  status: string;
  numOfPositions: number | null;
  isPublished: boolean;
  description: string | null;
  jobTitle: { id: number; title: string; isDeleted: boolean };
  hiringManager: { empNumber: number; firstName: string; lastName: string; middleName: string; terminationId: number | null } | null;
}

export interface Candidate {
  id: number;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  contactNumber: string | null;
  /** OrangeHRM 5 returns status as an object e.g. { id: 2, label: "Shortlisted" } */
  status: unknown;
  keywords: string | null;
  dateOfApplication: string;
  comment: string | null;
  vacancy: { id: number; name: string; status: unknown; isPublished: boolean } | null;
}

/** Extract a readable string from the OrangeHRM status object */
export function candidateStatusStr(status: unknown): string {
  if (status == null) return "";
  if (typeof status === "string") return status;
  if (typeof status === "number") return String(status);
  try {
    return JSON.stringify(status);
  } catch {
    return String(status);
  }
}

export interface CandidateInterview {
  id: number;
  interviewName: string;
  interviewDate: string;
  interviewTime: string;
  note: string | null;
  interviewers: { empNumber: number; firstName: string; lastName: string }[];
}

export interface CreateVacancyRequest {
  name: string;
  jobTitleId: number;
  employeeId: number;          // hiring manager's empNumber
  numOfPositions?: number;
  isPublished?: boolean;
  status?: boolean;            // true = Active, false = Closed
  description?: string;
}

export interface CreateCandidateRequest {
  firstName: string;
  lastName: string;
  email: string;
  vacancyId?: number;
  contactNumber?: string;
  keywords?: string;
  comment?: string;
  dateOfApplication?: string;
  consentToKeepData?: boolean;
}

export interface ScheduleInterviewRequest {
  interviewName: string;
  interviewDate: string;       // YYYY-MM-DD
  interviewTime: string;       // HH:MM
  note?: string;
  interviewers?: number[];     // empNumber array
}

export const recruitmentApiClient = {
  // ── Job Titles ─────────────────────────────────────────────────────────────
  getJobTitles(): Cypress.Chainable<Cypress.Response<{ data: JobTitle[] }>> {
    return cy.request({
      method: "GET",
      url: "/web/index.php/api/v2/admin/job-titles?limit=50&offset=0",
      failOnStatusCode: false,
    });
  },

  // ── Vacancies ──────────────────────────────────────────────────────────────
  createVacancy(
    body: CreateVacancyRequest
  ): Cypress.Chainable<Cypress.Response<{ data: Vacancy }>> {
    return cy.request({
      method: "POST",
      url: "/web/index.php/api/v2/recruitment/vacancies",
      body,
      failOnStatusCode: false,
    });
  },

  getVacancies(): Cypress.Chainable<Cypress.Response<{ data: Vacancy[]; meta: { total: number } }>> {
    return cy.request({
      method: "GET",
      url: "/web/index.php/api/v2/recruitment/vacancies?limit=50&offset=0",
      failOnStatusCode: false,
    });
  },

  getVacancy(
    id: number
  ): Cypress.Chainable<Cypress.Response<{ data: Vacancy }>> {
    return cy.request({
      method: "GET",
      url: `/web/index.php/api/v2/recruitment/vacancies/${id}`,
      failOnStatusCode: false,
    });
  },

  deleteVacancy(
    id: number
  ): Cypress.Chainable<Cypress.Response<unknown>> {
    return cy.request({
      method: "DELETE",
      url: "/web/index.php/api/v2/recruitment/vacancies",
      body: { ids: [id] },
      failOnStatusCode: false,
    });
  },

  // ── Candidates ─────────────────────────────────────────────────────────────
  createCandidate(
    body: CreateCandidateRequest
  ): Cypress.Chainable<Cypress.Response<{ data: Candidate }>> {
    return cy.request({
      method: "POST",
      url: "/web/index.php/api/v2/recruitment/candidates",
      body,
      failOnStatusCode: false,
    });
  },

  getCandidates(
    vacancyId?: number
  ): Cypress.Chainable<Cypress.Response<{ data: Candidate[]; meta: { total: number } }>> {
    const qs = vacancyId
      ? `?vacancyId=${vacancyId}&limit=50&offset=0`
      : "?limit=50&offset=0";
    return cy.request({
      method: "GET",
      url: `/web/index.php/api/v2/recruitment/candidates${qs}`,
      failOnStatusCode: false,
    });
  },

  getCandidate(
    candidateId: number
  ): Cypress.Chainable<Cypress.Response<{ data: Candidate }>> {
    return cy.request({
      method: "GET",
      url: `/web/index.php/api/v2/recruitment/candidates/${candidateId}`,
      failOnStatusCode: false,
    });
  },

  deleteCandidates(
    ids: number[]
  ): Cypress.Chainable<Cypress.Response<unknown>> {
    return cy.request({
      method: "DELETE",
      url: "/web/index.php/api/v2/recruitment/candidates",
      body: { ids },
      failOnStatusCode: false,
    });
  },

  // ── Interviews ─────────────────────────────────────────────────────────────
  scheduleInterview(
    candidateId: number,
    body: ScheduleInterviewRequest
  ): Cypress.Chainable<Cypress.Response<{ data: CandidateInterview }>> {
    return cy.request({
      method: "POST",
      url: `/web/index.php/api/v2/recruitment/candidates/${candidateId}/interviews`,
      body,
      failOnStatusCode: false,
    });
  },

  getInterviews(
    candidateId: number
  ): Cypress.Chainable<Cypress.Response<{ data: CandidateInterview[] }>> {
    return cy.request({
      method: "GET",
      url: `/web/index.php/api/v2/recruitment/candidates/${candidateId}/interviews`,
      failOnStatusCode: false,
    });
  },

  // ── Candidate workflow actions ─────────────────────────────────────────────
  /**
   * Perform a workflow action on a candidate.
   * OrangeHRM 5 uses POST /candidate-history with numeric action codes:
   *   2 = SHORTLISTED, 3 = REJECTED, 4 = INTERVIEW_SCHEDULED,
   *   5 = INTERVIEW_PASSED, 8 = OFFER_DECLINED, 9 = HIRED
   */
  performCandidateAction(
    candidateId: number,
    action: number,
    note?: string
  ): Cypress.Chainable<Cypress.Response<unknown>> {
    return cy.request({
      method: "POST",
      url: `/web/index.php/api/v2/recruitment/candidates/${candidateId}/history`,
      body: { action, note: note ?? "" },
      failOnStatusCode: false,
    });
  },
};
