import { LeaveTypesPage } from "../../support/pages/LeaveTypesPage";
import { leaveApiClient, LeaveType } from "../../../src/services/leaveApiClient";

const leaveTypesPage = new LeaveTypesPage();
const leaveTypeName = `UILeaveType-${Date.now()}`;

// 2.1 — Admin creates a new leave type
describe("Leave Lifecycle - UI", () => {
  it("Admin creates a new leave type", () => {
    cy.loginAsAdmin();
    cy.contains(".oxd-main-menu span", "Leave", { timeout: 10000 }).click();
    cy.contains(".oxd-topbar-body-nav span", "Configure").click();
    cy.contains(".oxd-dropdown-menu a", "Leave Types").click();
    cy.url({ timeout: 10000 }).should("include", "/leaveTypeList");

    leaveTypesPage.clickAdd();
    leaveTypesPage.fillName(leaveTypeName);
    leaveTypesPage.save();
    leaveTypesPage.assertSuccessToast();

    leaveTypesPage.navigate();
    leaveTypesPage.assertTypeInList(leaveTypeName);

    leaveApiClient.getLeaveTypes().then((res) => {
      const types = (res.body as { data: LeaveType[] }).data;
      const created = types.find((t) => t.name === leaveTypeName);
      if (created) leaveApiClient.deleteLeaveType(created.id);
    });
  });
});
