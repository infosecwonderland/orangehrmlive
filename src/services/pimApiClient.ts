export interface Employee {
  empNumber: number;
  firstName: string;
  middleName: string;
  lastName: string;
  employeeId: string;
}

// Fields returned by GET /personal-details
export interface PersonalDetailsResponse {
  empNumber: number;
  firstName: string;
  middleName: string;
  lastName: string;
  employeeId: string | null;
  otherId: string;
  drivingLicenseNo: string;
  drivingLicenseExpiredDate: string | null;
  gender: string | null;
  maritalStatus: string | null;
  birthday: string | null;
  terminationId: number | null;
  nationality: { id: number | null; name: string | null } | null;
}

// Fields sent to PUT /personal-details — only the name fields are required;
// extra fields (terminationId, nationality, nickname, etc.) are rejected with 422.
export interface PersonalDetailsRequest {
  firstName: string;
  middleName: string;
  lastName: string;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  middleName?: string;
}

export interface ContactDetailsRequest {
  street1?: string;
  street2?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  countryCode?: string;
  homeTelephone?: string;
  workTelephone?: string;
  mobile?: string;
  workEmail?: string;
  otherEmail?: string;
}

export interface ContactDetailsResponse {
  street1: string | null;
  street2: string | null;
  city: string | null;
  province: string | null;
  zipCode: string | null;
  countryCode: string | null;
  homeTelephone: string | null;
  workTelephone: string | null;
  mobile: string | null;
  workEmail: string | null;
  otherEmail: string | null;
}

export const pimApiClient = {
  createEmployee(
    body: CreateEmployeeRequest
  ): Cypress.Chainable<Cypress.Response<{ data: Employee }>> {
    return cy.request({
      method: "POST",
      url: "/web/index.php/api/v2/pim/employees",
      body,
    });
  },

  getEmployee(
    empNumber: number
  ): Cypress.Chainable<Cypress.Response<{ data: Employee }>> {
    return cy.request({
      method: "GET",
      url: `/web/index.php/api/v2/pim/employees/${empNumber}`,
      failOnStatusCode: false,
    });
  },

  getPersonalDetails(
    empNumber: number
  ): Cypress.Chainable<Cypress.Response<{ data: PersonalDetailsResponse }>> {
    return cy.request({
      method: "GET",
      url: `/web/index.php/api/v2/pim/employees/${empNumber}/personal-details`,
    });
  },

  searchEmployees(
    nameOrId: string
  ): Cypress.Chainable<Cypress.Response<{ data: Employee[]; meta: { total: number } }>> {
    return cy.request({
      method: "GET",
      url: `/web/index.php/api/v2/pim/employees?nameOrId=${encodeURIComponent(nameOrId)}&limit=50&offset=0`,
    });
  },

  updatePersonalDetails(
    empNumber: number,
    body: PersonalDetailsRequest
  ): Cypress.Chainable<Cypress.Response<{ data: PersonalDetailsRequest }>> {
    return cy.request({
      method: "PUT",
      url: `/web/index.php/api/v2/pim/employees/${empNumber}/personal-details`,
      body,
      failOnStatusCode: false,
    });
  },

  getContactDetails(
    empNumber: number
  ): Cypress.Chainable<Cypress.Response<{ data: ContactDetailsResponse }>> {
    return cy.request({
      method: "GET",
      url: `/web/index.php/api/v2/pim/employees/${empNumber}/contact-details`,
      failOnStatusCode: false,
    });
  },

  updateContactDetails(
    empNumber: number,
    body: ContactDetailsRequest
  ): Cypress.Chainable<Cypress.Response<{ data: ContactDetailsResponse }>> {
    return cy.request({
      method: "PUT",
      url: `/web/index.php/api/v2/pim/employees/${empNumber}/contact-details`,
      body,
      failOnStatusCode: false,
    });
  },

  deleteEmployees(
    empNumbers: number[]
  ): Cypress.Chainable<Cypress.Response<unknown>> {
    return cy.request({
      method: "DELETE",
      url: "/web/index.php/api/v2/pim/employees",
      body: { ids: empNumbers },
      failOnStatusCode: false,
    });
  },
};
