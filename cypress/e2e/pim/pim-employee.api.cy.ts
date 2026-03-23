import { apiClient } from "../../../src/services/apiClient";
import {
  pimApiClient,
  Employee,
  PersonalDetailsRequest,
} from "../../../src/services/pimApiClient";

interface TestData {
  credentials: { admin: { username: string; password: string } };
  employee: { firstName: string; lastName: string };
}

describe("PIM Employee Management API", () => {
  let empNumber: number;
  let adminUsername: string;
  let adminPassword: string;
  const ts = Date.now();
  let firstName: string;
  let lastName: string;
  const updatedLastName = `Updated${ts}`;
  const middleName = `Mid${ts}`;

  before(() => {
    cy.fixture("testData").then((data: TestData) => {
      firstName = data.employee.firstName;
      lastName = `${data.employee.lastName}${ts}`;
      adminUsername = data.credentials.admin.username;
      adminPassword = data.credentials.admin.password;
    });
  });

  beforeEach(() => {
    apiClient.authenticate({ username: adminUsername, password: adminPassword });
  });

  it("creates a new employee via API", () => {
    pimApiClient.createEmployee({ firstName, lastName }).then((res) => {
      expect(res.status).to.eq(200);
      const employee = (res.body as { data: Employee }).data;
      expect(employee.firstName).to.eq(firstName);
      expect(employee.lastName).to.eq(lastName);
      expect(employee.empNumber).to.be.greaterThan(0);
      empNumber = employee.empNumber;
    });
  });

  it("retrieves the employee by ID", () => {
    pimApiClient.getEmployee(empNumber).then((res) => {
      expect(res.status).to.eq(200);
      const employee = (res.body as { data: Employee }).data;
      expect(employee.empNumber).to.eq(empNumber);
      expect(employee.firstName).to.eq(firstName);
      expect(employee.lastName).to.eq(lastName);
    });
  });

  it("finds the employee by name search", () => {
    pimApiClient.searchEmployees(lastName).then((res) => {
      expect(res.status).to.eq(200);
      const employees = (res.body as { data: Employee[] }).data;
      const found = employees.find((e) => e.empNumber === empNumber);
      expect(found).to.exist;
    });
  });

  it("updates last name and middle name via API", () => {
    pimApiClient
      .updatePersonalDetails(empNumber, { firstName, lastName: updatedLastName, middleName })
      .then((res) => {
        expect(res.status).to.eq(200);
        const updated = (res.body as { data: PersonalDetailsRequest }).data;
        expect(updated.lastName).to.eq(updatedLastName);
        expect(updated.middleName).to.eq(middleName);
      });
  });

  it("deletes the employee via API", () => {
    pimApiClient.deleteEmployees([empNumber]).then((res) => {
      // 200: deleted now; 404: already gone (shared demo — acceptable either way)
      expect(res.status).to.be.oneOf([200, 404]);
    });
    // OrangeHRM returns 404 or 422 for a non-existent employee on this demo
    pimApiClient.getEmployee(empNumber).then((res) => {
      expect(res.status).not.to.eq(200);
    });
  });
});
