export interface LeaveType {
  id: number;
  name: string;
  deleted: boolean;
  operational: boolean;
}

/**
 * Demo / tenant APIs may return leave types with `operational: false` for every row while the
 * Apply Leave UI still offers them. Prefer operational + not deleted, else first non-deleted.
 */
export function pickLeaveTypeForTest(types: LeaveType[] | undefined | null): LeaveType | undefined {
  if (!Array.isArray(types) || types.length === 0) return undefined;
  const active = types.filter((t) => !t.deleted);
  if (active.length === 0) return undefined;
  return active.find((t) => t.operational === true) ?? active[0];
}

export interface LeaveEntitlement {
  id: number;
  entitlementType: { id: number; name: string };
  fromDate: string;
  toDate: string;
  creditedDate: string;
  entitlement: number;   // total allocation
  daysUsed: number;      // days already approved/used
  deleted: boolean;
  deletable: boolean;
  leaveType: { id: number; name: string; deleted: boolean };
  employee: { empNumber: number; firstName: string; middleName: string; lastName: string; terminationId: number | null };
}

export interface LeaveRequest {
  id: number;
  leaveType: { id: number; name: string };
  fromDate: string;
  toDate: string;
  comment: string | null;
}

export interface CreateLeaveTypeRequest {
  name: string;
}

export interface CreateEntitlementRequest {
  empNumber: number;
  leaveTypeId: number;
  entitlement: number;
  fromDate: string;
  toDate: string;
}

export interface ApplyLeaveRequest {
  leaveTypeId: number;
  fromDate: string;
  toDate: string;
  comment?: string;
}

export const leaveApiClient = {
  createLeaveType(
    name: string
  ): Cypress.Chainable<Cypress.Response<{ data: LeaveType }>> {
    return cy.request({
      method: "POST",
      url: "/web/index.php/api/v2/leave/leave-types",
      body: { name, situational: false },
      failOnStatusCode: false,
    });
  },

  getLeaveTypes(): Cypress.Chainable<Cypress.Response<{ data: LeaveType[] }>> {
    return cy.request({
      method: "GET",
      url: "/web/index.php/api/v2/leave/leave-types?limit=50&offset=0",
    });
  },

  /** Types the logged-in user may select on Apply Leave (subset of all leave types). */
  getEligibleLeaveTypes(): Cypress.Chainable<Cypress.Response<{ data: LeaveType[] }>> {
    return cy.request({
      method: "GET",
      url: "/web/index.php/api/v2/leave/leave-types/eligible",
    });
  },

  getLeavePeriod(): Cypress.Chainable<Cypress.Response<{ data: { startDate: string; endDate: string } }>> {
    return cy.request({
      method: "GET",
      url: "/web/index.php/api/v2/leave/leave-periods",
      failOnStatusCode: false,
    });
  },

  deleteLeaveType(
    id: number
  ): Cypress.Chainable<Cypress.Response<unknown>> {
    return cy.request({
      method: "DELETE",
      url: "/web/index.php/api/v2/leave/leave-types",
      body: { ids: [id] },
      failOnStatusCode: false,
    });
  },

  createEntitlement(
    body: CreateEntitlementRequest
  ): Cypress.Chainable<Cypress.Response<{ data: LeaveEntitlement }>> {
    return cy.request({
      method: "POST",
      url: "/web/index.php/api/v2/leave/leave-entitlements",
      body,
      failOnStatusCode: false,
    });
  },

  getEntitlements(
    empNumber: number,
    leaveTypeId: number,
    fromDate?: string,
    toDate?: string
  ): Cypress.Chainable<Cypress.Response<{ data: LeaveEntitlement[] }>> {
    const year = new Date().getFullYear();
    const from = fromDate ?? `${year}-01-01`;
    const to = toDate ?? `${year}-12-31`;
    return cy.request({
      method: "GET",
      url: `/web/index.php/api/v2/leave/leave-entitlements?empNumber=${empNumber}&leaveTypeId=${leaveTypeId}&fromDate=${from}&toDate=${to}&limit=50&offset=0`,
      failOnStatusCode: false,
    });
  },

  applyLeave(
    body: ApplyLeaveRequest
  ): Cypress.Chainable<Cypress.Response<{ data: LeaveRequest }>> {
    return cy.request({
      method: "POST",
      url: "/web/index.php/api/v2/leave/leave-requests",
      body,
      failOnStatusCode: false,
    });
  },

  getLeaveRequests(
    empNumber: number,
    fromDate?: string,
    toDate?: string
  ): Cypress.Chainable<Cypress.Response<{ data: LeaveRequest[]; meta: { total: number } }>> {
    const year = new Date().getFullYear();
    const from = fromDate ?? `${year}-01-01`;
    const to = toDate ?? `${year + 1}-12-31`;
    return cy.request({
      method: "GET",
      url: `/web/index.php/api/v2/leave/leave-requests?empNumber=${empNumber}&fromDate=${from}&toDate=${to}&limit=50&offset=0`,
      failOnStatusCode: false,
    });
  },

  updateLeaveRequestStatus(
    leaveRequestId: number,
    action: "APPROVE" | "REJECT" | "CANCEL"
  ): Cypress.Chainable<Cypress.Response<unknown>> {
    return cy.request({
      method: "PUT",
      url: `/web/index.php/api/v2/leave/leave-requests/${leaveRequestId}`,
      body: { action },
      failOnStatusCode: false,
    });
  },

  createEssUser(body: {
    userRoleId: number;
    empNumber: number;
    username: string;
    password: string;
    status: boolean;
  }): Cypress.Chainable<Cypress.Response<{ data: { id: number; username: string } }>> {
    return cy.request({
      method: "POST",
      url: "/web/index.php/api/v2/admin/users",
      body,
      failOnStatusCode: false,
    });
  },

  deleteUser(userId: number): Cypress.Chainable<Cypress.Response<unknown>> {
    return cy.request({
      method: "DELETE",
      url: "/web/index.php/api/v2/admin/users",
      body: { ids: [userId] },
      failOnStatusCode: false,
    });
  },

  getUserRoles(): Cypress.Chainable<Cypress.Response<{ data: { id: number; name: string }[] }>> {
    return cy.request({
      method: "GET",
      url: "/web/index.php/api/v2/admin/user-roles",
    });
  },
};
