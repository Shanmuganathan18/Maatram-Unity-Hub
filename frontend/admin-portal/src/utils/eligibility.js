// Pure helpers shared by seed data and services. UX/prototype logic only – the backend must re-validate.
export const matchesAudience = (student, ev) =>
  ev.targetInstitutionIds.includes(student.institutionId) &&
  (!ev.departments?.length || ev.departments.includes(student.department)) &&
  (!ev.years?.length || ev.years.includes(student.year)) &&
  (!ev.groups?.length || ev.groups.some((g) => student.groups.includes(g)));

/** Day status the student explicitly submitted for a date, or null when there is no submitted record. */
export const submittedDayStatus = (availability, studentId, weekStart, date) => {
  const rec = availability[studentId]?.[weekStart];
  return rec?.status === 'submitted' ? rec.days[date] ?? 'none' : null;
};
