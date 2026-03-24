export interface LeaveType {
  id: number;
  name: string;
  deleted: boolean;
  operational: boolean;
}

export interface LeaveEntitlement {
  id: number;
  entitlementType: { id: number; name: string };
  fromDate: string;
  toDate: string;
  creditedDate: string;
  leaveBalance: { entitled: number; used: number; scheduled: number; pending: number; notLinked: number; taken: number; balance: number; adjustment: number };
  daysLeft: number;
  noOfDays: number;
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
      body: { name },
      failOnStatusCode: false,
    });
  },

  getLeaveTypes(): Cypress.Chainable<Cypress.Response<{ data: LeaveType[] }>> {
    return cy.request({
      method: "GET",
      url: "/web/index.php/api/v2/leave/leave-types?limit=50&offset=0",
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
    leaveTypeId: number
  ): Cypress.Chainable<Cypress.Response<{ data: LeaveEntitlement[] }>> {
    return cy.request({
      method: "GET",
      url: `/web/index.php/api/v2/leave/leave-entitlements?empNumber=${empNumber}&leaveTypeId=${leaveTypeId}&limit=50&offset=0`,
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
    empNumber: number
  ): Cypress.Chainable<Cypress.Response<{ data: LeaveRequest[]; meta: { total: number } }>> {
    return cy.request({
      method: "GET",
      url: `/web/index.php/api/v2/leave/leave-requests?empNumber=${empNumber}&limit=50&offset=0`,
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

/**
 * Returns the next N weekdays (Mon–Fri) starting at least `minDaysOut` days
 * from today, formatted as YYYY-MM-DD.
 */
export function getWeekdays(count: number, minDaysOut = 7): string[] {
  const dates: string[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + minDaysOut);

  while (dates.length < count) {
    const day = cursor.getDay(); // 0=Sun, 6=Sat
    if (day !== 0 && day !== 6) {
      const yyyy = cursor.getFullYear();
      const mm = String(cursor.getMonth() + 1).padStart(2, "0");
      const dd = String(cursor.getDate()).padStart(2, "0");
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
