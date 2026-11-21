// Targeting + physical-verification eligibility. UX only: the backend must enforce this again.
const includes = (list, v) => !list || list.length === 0 || list.includes(v);

export const matchesAudience = (student, audience = {}) =>
  includes(audience.institutionIds, student.institutionId) && includes(audience.years, student.year) &&
  includes(audience.zoneIds, student.zoneId) && (!audience.groupIds || audience.groupIds.some((g) => student.groups.includes(g)));

export const isEligibleForEvent = (student, event) => {
  if (!matchesAudience(student, event.audience)) return false;
  if (event.physicalVerification) return event.physicalVerification.eligibleStudentIds.includes(student.id);
  return true;
};
