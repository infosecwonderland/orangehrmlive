export interface EmployeeSeed {
  firstName: string;
  lastName: string;
  fullName: string;
}

function randomSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function createEmployeeSeed(prefix = "Auto"): EmployeeSeed {
  const suffix = randomSuffix();
  const firstName = `${prefix}First${suffix}`;
  const lastName = `${prefix}Last${suffix}`;

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`
  };
}
