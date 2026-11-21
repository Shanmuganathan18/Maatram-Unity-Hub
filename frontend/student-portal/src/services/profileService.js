import { getState, mutate, delay } from './store';

export const getProfile = (sid) => {
  if (!sid) return null;

  const s = getState();
  const st = s?.students?.find((x) => x.id === sid || x.studentId === sid);
  if (st) {
    return {
      ...st,
      institution: s.institutions?.find((i) => i.id === st.institutionId)?.name ?? '—',
      zone: s.zones?.find((z) => z.id === st.zoneId)?.label ?? '—',
    };
  }

  try {
    const raw = sessionStorage.getItem('maatram_student_profile') || localStorage.getItem('maatram_student_profile');
    if (raw) {
      const u = JSON.parse(raw);
      if (u) {
        const p = u.profile || u;
        return {
          id: p.id || u.id || sid,
          studentId: p.studentId || u.studentId || 'MF-STU',
          name: p.name || u.name || u.email || 'Student',
          email: u.email || p.email || '',
          phone: p.phone || '',
          photoUrl: p.photoUrl || '',
          year: p.year || 1,
          department: typeof p.department === 'string' ? p.department : (p.department?.name || ''),
          institutionId: p.institution?.id || p.institutionId || '',
          institution: p.institution?.name || p.institution || '—',
          zoneId: p.zone?.id || p.zoneId || '',
          zone: p.zone?.name || p.zone || '—',
          status: u.status || p.status || 'Active',
          groups: p.groups || u.groups || [],
          whatsappEnabled: Boolean(p.whatsappEnabled || u.whatsappEnabled),
          mustChangePassword: Boolean(u.mustChangePassword ?? p.mustChangePassword),
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
