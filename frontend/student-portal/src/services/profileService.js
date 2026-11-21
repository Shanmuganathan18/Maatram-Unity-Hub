import { getState, mutate, delay } from './store';

export const getProfile = (sid) => {
  const s = getState();
  const st = s.students.find((x) => x.id === sid);
  if (st) {
    return { ...st, institution: s.institutions.find((i) => i.id === st.institutionId)?.name ?? '—', zone: s.zones.find((z) => z.id === st.zoneId)?.label ?? '—' };
  }
  try {
    const raw = sessionStorage.getItem('maatram_student_profile') || localStorage.getItem('maatram_student_profile');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.profile && (u.id === sid || u.profile.id === sid || u.profile.studentId === sid)) {
        return {
          id: sid,
          studentId: u.profile.studentId,
          name: u.profile.name,
          email: u.email,
          phone: u.profile.phone || '',
          photoUrl: u.profile.photoUrl || '',
          year: u.profile.year || 1,
          department: u.profile.department || '',
          institutionId: u.profile.institution?.id || '',
          institution: u.profile.institution?.name ?? '—',
          zoneId: u.profile.zone?.id || '',
          zone: u.profile.zone?.name ?? '—',
          status: 'Active',
          groups: u.profile.groups || [],
          whatsappEnabled: u.profile.whatsappEnabled ?? false,
          mustChangePassword: Boolean(u.mustChangePassword),
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
};
export const listDemoAccounts = () => getState().students.map((s) => ({ id: s.id, name: s.name, studentId: s.studentId, email: s.email }));
export const findStudentByLogin = (login) => getState().students.find((s) => s.email.toLowerCase() === login.trim().toLowerCase() || s.studentId.toLowerCase() === login.trim().toLowerCase());

/** Only permitted personal fields can change. Institution, zone, year, department, ID are account data. */
export const updateProfile = async (sid, { phone, alternateEmail, photoUrl }) => {
  await delay();
  mutate((s) => { const st = s.students.find((x) => x.id === sid); Object.assign(st, { phone, alternateEmail, photoUrl }); });
};

export const getCompleteness = (p) => {
  const items = [
    { id: 'name', label: 'Name', done: !!p.name, required: true, account: true },
    { id: 'studentId', label: 'Student ID', done: !!p.studentId, required: true, account: true },
    { id: 'email', label: 'Email address', done: !!p.email, required: true, account: true },
    { id: 'institution', label: 'Institution', done: !!p.institutionId, required: true, account: true },
    { id: 'department', label: 'Department', done: !!p.department, required: true, account: true },
    { id: 'year', label: 'Year of study', done: !!p.year, required: true, account: true },
    { id: 'zone', label: 'Assigned zone', done: !!p.zoneId, required: true, account: true },
    { id: 'phone', label: 'Phone number', done: !!p.phone, required: true, section: 'contact' },
    { id: 'photo', label: 'Profile photo', done: !!p.photoUrl, required: false, section: 'photo' },
    { id: 'alternateEmail', label: 'Alternate email', done: !!p.alternateEmail, required: false, section: 'contact' },
  ];
  const done = items.filter((i) => i.done).length;
  return { items, percent: Math.round((done / items.length) * 100), missing: items.filter((i) => !i.done) };
};
