export function employeeIdToEmail(employeeId: string) {
  return `${employeeId.trim().toLowerCase()}@ode.internal`;
}
