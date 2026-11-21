import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Activity, Database, Save, Settings as SettingsIcon, ShieldCheck, KeyRound, Sliders } from 'lucide-react';
import { Badge, Button, Card, CardHeader, ConfirmDialog, Field, Notice, PageHeader, PendingTag, Switch, Tabs } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useAction } from '../hooks/useAction';
import { getSettings, saveSection, fetchSettingsLive } from '../services/settingsService';
import Roles from './Roles';
import Permissions from './Permissions';

const mainTabs = [
  { id: 'general', label: 'General Information', icon: SettingsIcon },
  { id: 'security', label: 'Authentication & Security', icon: ShieldCheck },
  { id: 'permissions', label: 'Roles & Access Permissions', icon: KeyRound },
  { id: 'system', label: 'System Configuration', icon: Sliders },
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Settings() {
  usePageTitle('System Settings');
  const { aid } = useAuth();
  const { can } = usePermissions();
  useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'general';

  const setTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  useEffect(() => {
    fetchSettingsLive();
  }, []);

  const saved = getSettings(aid);
  const [draft, setDraft] = useState({});
  const [conf, setConf] = useState(false);
  const [run, busy] = useAction();
  const [permSubTab, setPermSubTab] = useState('roles');

  const edit = can('settings.edit');
  const curGeneral = { ...(saved.general || {}), ...(draft.general || {}) };
  const curSecurity = { ...(saved.security || {}), ...(draft.security || {}) };
  const curAcademic = { ...(saved.academic || {}), ...(draft.academic || {}) };
  const curAvailability = { ...(saved.availability || {}), ...(draft.availability || {}) };
  const curEvents = { ...(saved.events || {}), ...(draft.events || {}) };
  const curNotifications = { ...(saved.notifications || {}), ...(draft.notifications || {}) };

  const up = (section, k, v) =>
    setDraft((d) => ({
      ...d,
      [section]: { ...(d[section] ?? {}), [k]: v },
    }));

  const num = (section, k) => (e) => up(section, k, Number(e.target.value));

  const dirtySection = (sec) => Object.keys(draft[sec] ?? {}).length > 0;

  const saveCurrent = async (sec) => {
    const toSave = { ...(saved[sec] || {}), ...(draft[sec] || {}) };
    const r = await run(
      () => saveSection(aid, sec, toSave),
      (ch) => `Saved: ${ch.join(', ')}.`
    );
    if (r.ok) {
      setDraft((d) => ({ ...d, [sec]: {} }));
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="System Settings"
        subtitle="Manage platform-wide configuration, authentication rules, role capabilities, and operational parameters."
      />

      {!edit && <Notice tone="neutral">Read-only: your role cannot edit settings.</Notice>}

      <Tabs
        label="System Settings Navigation"
        tabs={mainTabs}
        value={currentTab}
        onChange={setTab}
      />

      {/* 1. GENERAL TAB */}
      {currentTab === 'general' && (
        <Card className="max-w-3xl">
          <CardHeader title="General Information" />
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Application name" htmlFor="s-appName">
                <input
                  id="s-appName"
                  className="field"
                  disabled={!edit}
                  value={curGeneral.appName ?? ''}
                  onChange={(e) => up('general', 'appName', e.target.value)}
                />
              </Field>
              <Field label="Support email" htmlFor="s-supportEmail">
                <input
                  id="s-supportEmail"
                  type="email"
                  className="field"
                  disabled={!edit}
                  value={curGeneral.supportEmail ?? ''}
                  onChange={(e) => up('general', 'supportEmail', e.target.value)}
                />
              </Field>
              <Field label="Support phone" htmlFor="s-supportPhone">
                <input
                  id="s-supportPhone"
                  className="field"
                  disabled={!edit}
                  value={curGeneral.supportPhone ?? ''}
                  onChange={(e) => up('general', 'supportPhone', e.target.value)}
                />
              </Field>
              <Field label="Default timezone" htmlFor="tz" hint="Asia/Kolkata">
                <select id="tz" className="field" disabled>
                  <option>Asia/Kolkata</option>
                </select>
              </Field>
            </div>
            <Field label="Application description" htmlFor="s-description">
              <textarea
                id="s-description"
                rows={2}
                className="field"
                disabled={!edit}
                value={curGeneral.description ?? ''}
                onChange={(e) => up('general', 'description', e.target.value)}
              />
            </Field>
          </div>
          {edit && (
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={!dirtySection('general')}
                onClick={() => setDraft((d) => ({ ...d, general: {} }))}
              >
                Discard
              </Button>
              <Button
                disabled={!dirtySection('general')}
                onClick={() => saveCurrent('general')}
              >
                <Save className="h-4 w-4" />
                Save changes
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* 2. AUTHENTICATION & SECURITY TAB */}
      {currentTab === 'security' && (
        <Card className="max-w-3xl">
          <CardHeader title="Authentication & Security" />
          <div className="space-y-4">
            <Notice tone="info">
              The platform enforces <b>Admin-controlled account provisioning</b>: only pre-created accounts can sign in. Public sign-up is disabled, and mandatory first-login password changes are enforced for all users.
            </Notice>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Session timeout (minutes)" htmlFor="s-sessionTimeout">
                <input
                  id="s-sessionTimeout"
                  type="number"
                  min={5}
                  max={480}
                  className="field"
                  disabled={!edit}
                  value={curSecurity.sessionTimeoutMinutes ?? 60}
                  onChange={num('security', 'sessionTimeoutMinutes')}
                />
              </Field>
            </div>
            <Field label="Password policy guidance" htmlFor="s-passwordGuidance">
              <textarea
                id="s-passwordGuidance"
                rows={2}
                className="field"
                disabled={!edit}
                value={curSecurity.passwordGuidance ?? ''}
                onChange={(e) => up('security', 'passwordGuidance', e.target.value)}
              />
            </Field>
          </div>
          {edit && (
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={!dirtySection('security')}
                onClick={() => setDraft((d) => ({ ...d, security: {} }))}
              >
                Discard
              </Button>
              <Button
                disabled={!dirtySection('security')}
                onClick={() => saveCurrent('security')}
              >
                <Save className="h-4 w-4" />
                Save changes
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* 3. ROLES & PERMISSIONS TAB */}
      {currentTab === 'permissions' && (
        <div className="space-y-4">
          <Tabs
            label="Roles and Permissions"
            tabs={[
              { id: 'roles', label: 'System Roles Overview' },
              { id: 'matrix', label: 'Granular Permission Matrix' },
            ]}
            value={permSubTab}
            onChange={setPermSubTab}
          />
          {permSubTab === 'roles' ? <Roles /> : <Permissions />}
        </div>
      )}

      {/* 4. SYSTEM CONFIGURATION TAB */}
      {currentTab === 'system' && (
        <div className="space-y-4 max-w-4xl">
          {/* Academic Period */}
          <Card>
            <CardHeader title="Academic Configuration" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Academic year" htmlFor="s-ay">
                <input
                  id="s-ay"
                  className="field"
                  disabled={!edit}
                  value={curAcademic.academicYear ?? ''}
                  onChange={(e) => up('academic', 'academicYear', e.target.value)}
                />
              </Field>
              <Field label="Current academic period" htmlFor="s-ap">
                <input
                  id="s-ap"
                  className="field"
                  disabled={!edit}
                  value={curAcademic.period ?? ''}
                  onChange={(e) => up('academic', 'period', e.target.value)}
                />
              </Field>
            </div>
            {edit && dirtySection('academic') && (
              <div className="mt-3 flex justify-end">
                <Button size="sm" onClick={() => saveCurrent('academic')}>Save academic changes</Button>
              </div>
            )}
          </Card>

          {/* Availability Configuration */}
          <Card>
            <CardHeader title="Weekly Availability Rules" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Submission start day" htmlFor="sd">
                <select id="sd" className="field" disabled={!edit} value={curAvailability.startDay ?? 1} onChange={num('availability', 'startDay')}>
                  {days.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                </select>
              </Field>
              <Field label="Submission deadline day" htmlFor="dd">
                <select id="dd" className="field" disabled={!edit} value={curAvailability.deadlineDay ?? 5} onChange={num('availability', 'deadlineDay')}>
                  {days.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                </select>
              </Field>
              <Field label="Deadline hour (0–23 IST)" htmlFor="dh">
                <input id="dh" type="number" min={0} max={23} className="field" disabled={!edit} value={curAvailability.deadlineHour ?? 18} onChange={num('availability', 'deadlineHour')} />
              </Field>
              <Field label="Deadline minute (0–59)" htmlFor="dm">
                <input id="dm" type="number" min={0} max={59} className="field" disabled={!edit} value={curAvailability.deadlineMinute ?? 0} onChange={num('availability', 'deadlineMinute')} />
              </Field>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-lavender-200 p-3">
                <div>
                  <p className="text-sm font-semibold text-navy">Allow edits until deadline</p>
                  <p className="text-xs text-ink-soft">Students can modify their responses freely before cutoff.</p>
                </div>
                <Switch checked={!!curAvailability.editUntilDeadline} disabled={!edit} onChange={(v) => up('availability', 'editUntilDeadline', v)} label="Edit until deadline" />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-lavender-200 p-3">
                <div>
                  <p className="text-sm font-semibold text-navy">Lock availability after deadline</p>
                  <p className="text-xs text-ink-soft">Prevent changes once the weekly deadline has passed.</p>
                </div>
                <Switch checked={!!curAvailability.lockAfterDeadline} disabled={!edit} onChange={(v) => up('availability', 'lockAfterDeadline', v)} label="Lock availability" />
              </div>
            </div>
            {edit && dirtySection('availability') && (
              <div className="mt-3 flex justify-end">
                <Button size="sm" onClick={() => saveCurrent('availability')}>Save availability rules</Button>
              </div>
            )}
          </Card>

          {/* Event Rules */}
          <Card>
            <CardHeader title="Events Configuration" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default response deadline (days before event)" htmlFor="ed">
                <input id="ed" type="number" min={0} max={30} className="field" disabled={!edit} value={curEvents.defaultResponseDeadlineDays ?? 3} onChange={num('events', 'defaultResponseDeadlineDays')} />
              </Field>
              <Field label="Reminder before deadline (hours)" htmlFor="er">
                <input id="er" type="number" min={1} max={168} className="field" disabled={!edit} value={curEvents.reminderHoursBefore ?? 24} onChange={num('events', 'reminderHoursBefore')} />
              </Field>
            </div>
            {edit && dirtySection('events') && (
              <div className="mt-3 flex justify-end">
                <Button size="sm" onClick={() => saveCurrent('events')}>Save event rules</Button>
              </div>
            )}
          </Card>

          {/* Notification Channels */}
          <Card>
            <CardHeader title="Communication Channels" />
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-lavender-200 p-3">
                <div>
                  <p className="text-sm font-semibold text-navy">In-app notifications</p>
                  <p className="text-xs text-ink-soft">Active in all three portals.</p>
                </div>
                <Switch checked={!!curNotifications.inApp} disabled={!edit} onChange={(v) => up('notifications', 'inApp', v)} label="In-app" />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-lavender-200 p-3">
                <div>
                  <p className="text-sm font-semibold text-navy">Email notifications (Gmail SMTP)</p>
                  <p className="text-xs text-ink-soft">Delivers account activation and credentials to students and officers.</p>
                </div>
                <Switch checked={true} disabled label="Email" />
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
