/**
 * src/components/admin/EmailDeliveryCentre.jsx
 *
 * Administrator Email Delivery Management:
 * - Delivery history log with real-time status (QUEUED, SENT, FAILED)
 * - Filtering by recipient role, status, date range, search query
 * - Safe metadata inspection (without exposing passwords)
 * - Single retry for failed emails
 * - Bulk retry for all failed deliveries
 * - Resend activation credentials with fresh temporary password
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  RefreshCw,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  ExternalLink,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  Modal,
  Notice,
  Spinner,
} from '../ui';
import { adminEmailService } from '../../services/adminEmailService';
import { fmtInstant } from '../../utils/dates';

export default function EmailDeliveryCentre() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [bulkRetrying, setBulkRetrying] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [resendTarget, setResendTarget] = useState(null);
  const [customTempPassword, setCustomTempPassword] = useState('');
  const [resending, setResending] = useState(false);

  // SMTP Diagnostics State
  const [smtpStatus, setSmtpStatus] = useState(null);
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testEmailBusy, setTestEmailBusy] = useState(false);

  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSmtpStatus = async () => {
    try {
      const res = await adminEmailService.getEmailStatus();
      setSmtpStatus(res);
    } catch {
      setSmtpStatus({ configured: false });
    }
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminEmailService.listEmailLogs({
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
        limit: 50,
      });
      setLogs(res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load email delivery logs');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchLogs();
    fetchSmtpStatus();
  }, [fetchLogs]);

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    setTestEmailBusy(true);
    try {
      await adminEmailService.sendTestEmail(testEmailTo.trim() || undefined);
      toast.success(`Test email sent successfully${testEmailTo ? ` to ${testEmailTo}` : ''}!`);
      setTestEmailOpen(false);
      setTestEmailTo('');
      fetchLogs();
    } catch (err) {
      toast.error(err.message || 'Failed to send test email');
    } finally {
      setTestEmailBusy(false);
    }
  };

  // Handle single retry
  const handleRetry = async (logId) => {
    setRetryingId(logId);
    try {
      const res = await adminEmailService.retryFailedEmail(logId);
      if (res.status === 'SENT' || res.success) {
        toast.success('Activation email delivered successfully!');
      } else {
        toast.error(`Email delivery failed: ${res.error || 'SMTP rejected'}`);
      }
      fetchLogs();
      if (selectedLog?.id === logId) {
        setSelectedLog(null);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to retry email delivery');
    } finally {
      setRetryingId(null);
    }
  };

  // Handle bulk retry
  const handleBulkRetry = async () => {
    setBulkRetrying(true);
    try {
      const summary = await adminEmailService.bulkRetryFailedEmails();
      toast.success(
        `Bulk retry complete: ${summary.succeededCount} succeeded, ${summary.failedCount} failed of ${summary.retriedCount} attempted.`,
      );
      fetchLogs();
    } catch (err) {
      toast.error(err.message || 'Bulk retry failed');
    } finally {
      setBulkRetrying(false);
    }
  };

  // Handle resend activation credentials to a user
  const handleResendCredentials = async () => {
    if (!resendTarget) return;
    setResending(true);
    try {
      const res = await adminEmailService.resendActivationToUser(
        resendTarget.userId,
        customTempPassword.trim() || null,
      );
      if (res.status === 'SENT' || res.success) {
        toast.success(`Fresh credentials delivered to ${resendTarget.recipientEmail}`);
        setResendTarget(null);
        setCustomTempPassword('');
        fetchLogs();
      } else {
        toast.error(`Failed to deliver email: ${res.error || 'SMTP delivery rejected'}`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to resend credentials');
    } finally {
      setResending(false);
    }
  };

  // Aggregate stats
  const totalQueued = logs.filter((l) => l.status === 'QUEUED').length;
  const totalSent = logs.filter((l) => l.status === 'SENT').length;
  const totalFailed = logs.filter((l) => l.status === 'FAILED').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SENT':
        return (
          <Badge className="border-emerald-300 bg-emerald-50 text-emerald-800">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 mr-1 inline" />
            Sent
          </Badge>
        );
      case 'QUEUED':
        return (
          <Badge className="border-amber-300 bg-amber-50 text-amber-800">
            <Clock className="h-3 w-3 text-amber-600 mr-1 inline" />
            Queued
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge className="border-rose-300 bg-rose-50 text-rose-800">
            <AlertCircle className="h-3 w-3 text-rose-600 mr-1 inline" />
            Failed
          </Badge>
        );
      default:
        return <Badge className="border-lavender-300 bg-lavender-50 text-ink-soft">{status}</Badge>;
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'STUDENT':
        return <Badge className="border-cyan-300 bg-cyan-50 text-cyan-800">Student</Badge>;
      case 'OFFICER':
        return <Badge className="border-purple-300 bg-purple-50 text-purple-800">Officer</Badge>;
      case 'ADMIN':
        return <Badge className="border-amber-300 bg-amber-50 text-amber-800">Admin</Badge>;
      default:
        return <Badge className="border-slate-300 bg-slate-50 text-slate-700">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Live SMTP Status & Diagnostics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-lavender-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${smtpStatus?.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-navy">Gmail SMTP Gateway</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${smtpStatus?.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${smtpStatus?.configured ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                {smtpStatus?.configured ? 'Operational' : 'Disconnected'}
              </span>
            </div>
            <p className="text-xs text-ink-soft">
              {smtpStatus?.configured
                ? `Connected via ${smtpStatus.host}:${smtpStatus.port} (Sender: ${smtpStatus.from || smtpStatus.user})`
                : 'SMTP credentials not configured in backend environment.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSmtpStatus}>
            <RefreshCw className="h-3.5 w-3.5" />
            Check Connection
          </Button>
          <Button size="sm" onClick={() => setTestEmailOpen(true)}>
            <Send className="h-3.5 w-3.5" />
            Send Test Email
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-lavender-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-ink-mute uppercase tracking-wider">Total Dispatches</p>
          <p className="text-2xl font-extrabold text-navy mt-1">{logs.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Delivered (Sent)</p>
          <p className="text-2xl font-extrabold text-emerald-800 mt-1">{totalSent}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Queued in Transit</p>
          <p className="text-2xl font-extrabold text-amber-800 mt-1">{totalQueued}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Failed Deliveries</p>
            <p className="text-2xl font-extrabold text-rose-800 mt-1">{totalFailed}</p>
          </div>
          {totalFailed > 0 && (
            <Button
              size="sm"
              variant="danger"
              disabled={bulkRetrying}
              onClick={handleBulkRetry}
              className="text-xs py-1"
            >
              {bulkRetrying ? 'Retrying…' : 'Bulk Retry'}
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search recipient name / email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-lavender-300 focus:outline-none focus:border-brand-500"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-xl border border-lavender-300 bg-white focus:outline-none"
            >
              <option value="">All Roles</option>
              <option value="STUDENT">Students</option>
              <option value="OFFICER">Officers</option>
              <option value="ADMIN">Admins</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-xl border border-lavender-300 bg-white focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="SENT">Delivered (Sent)</option>
              <option value="QUEUED">Queued</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button size="sm" variant="outline" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Delivery Logs Table */}
      <Card>
        <CardHeader
          icon={Mail}
          title="Account Activation & Credential Delivery Logs"
          action={
            <span className="text-xs text-ink-soft">
              {logs.length} logged {logs.length === 1 ? 'event' : 'events'}
            </span>
          }
        />

        {loading ? (
          <Spinner label="Loading email delivery audit logs…" />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No email logs found"
            text="No email delivery events match your selected filters."
          />
        ) : (
          <DataTable
            caption="Email delivery logs"
            rows={logs}
            columns={[
              {
                key: 'recipient',
                label: 'Recipient',
                render: (l) => (
                  <div>
                    <p className="font-semibold text-navy text-xs">{l.recipientName || 'User'}</p>
                    <p className="text-xs text-ink-soft">{l.recipientEmail}</p>
                  </div>
                ),
              },
              {
                key: 'role',
                label: 'Role',
                render: (l) => getRoleBadge(l.recipientRole),
              },
              {
                key: 'subject',
                label: 'Email Subject',
                render: (l) => (
                  <span className="text-xs text-ink-soft truncate max-w-xs block" title={l.subject}>
                    {l.subject}
                  </span>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (l) => getStatusBadge(l.status),
              },
              {
                key: 'attempts',
                label: 'Tries',
                render: (l) => (
                  <span className="text-xs font-mono text-ink-soft">{l.attemptCount}</span>
                ),
              },
              {
                key: 'time',
                label: 'Sent / Created At',
                render: (l) => (
                  <span className="text-xs text-ink-soft">
                    {fmtInstant(l.sentAt || l.createdAt)}
                  </span>
                ),
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (l) => (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedLog(l)}
                      title="Inspect metadata and error details"
                      className="px-2 py-1 text-xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>

                    {l.status === 'FAILED' && (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={retryingId === l.id}
                        onClick={() => handleRetry(l.id)}
                        className="px-2 py-1 text-xs"
                      >
                        <RotateCcw className={`h-3 w-3 mr-1 ${retryingId === l.id ? 'animate-spin' : ''}`} />
                        Retry
                      </Button>
                    )}

                    {l.userId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setResendTarget(l)}
                        title="Re-issue fresh credentials and resend email"
                        className="px-2 py-1 text-xs"
                      >
                        <KeyRound className="h-3 w-3 mr-1" />
                        Resend
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      {/* Inspect Modal */}
      <Modal
        open={!!selectedLog}
        onOpenChange={(o) => !o && setSelectedLog(null)}
        title="Email Delivery Log Audit Details"
        description="Detailed delivery diagnostic trace, recipient context, and safe metadata."
        footer={
          <div className="flex justify-end gap-2">
            {selectedLog?.status === 'FAILED' && (
              <Button
                variant="danger"
                disabled={retryingId === selectedLog.id}
                onClick={() => handleRetry(selectedLog.id)}
              >
                <RotateCcw className={`h-4 w-4 mr-1 ${retryingId === selectedLog.id ? 'animate-spin' : ''}`} />
                Retry Email Delivery
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedLog(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            {/* Status Alert if Failed */}
            {selectedLog.status === 'FAILED' && (
              <Notice tone="danger" title="Delivery Failure Notice">
                {selectedLog.errorDetails || 'SMTP delivery rejected by provider'}
              </Notice>
            )}

            <div className="grid grid-cols-2 gap-3 bg-lavender-50/70 p-3 rounded-xl border border-lavender-200">
              <div>
                <p className="text-ink-mute font-semibold">Recipient Name</p>
                <p className="font-bold text-navy">{selectedLog.recipientName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-ink-mute font-semibold">Recipient Email</p>
                <p className="font-bold text-navy">{selectedLog.recipientEmail}</p>
              </div>
              <div>
                <p className="text-ink-mute font-semibold">Recipient Role</p>
                <p className="mt-0.5">{getRoleBadge(selectedLog.recipientRole)}</p>
              </div>
              <div>
                <p className="text-ink-mute font-semibold">Delivery Status</p>
                <p className="mt-0.5">{getStatusBadge(selectedLog.status)}</p>
              </div>
              <div>
                <p className="text-ink-mute font-semibold">Attempt Count</p>
                <p className="font-mono text-ink-soft">{selectedLog.attemptCount}</p>
              </div>
              <div>
                <p className="text-ink-mute font-semibold">Notification Type</p>
                <p className="font-mono text-ink-soft">{selectedLog.notificationType}</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-ink-mute font-semibold">Email Subject</p>
              <p className="p-2.5 rounded-lg bg-white border border-lavender-200 font-medium text-navy">
                {selectedLog.subject}
              </p>
            </div>

            {selectedLog.metadata && (
              <div className="space-y-1">
                <p className="text-ink-mute font-semibold">Contextual Metadata</p>
                <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            <Notice tone="info" title="Security Guarantee">
              Plaintext temporary passwords are never stored in database audit logs, application records, or export files. Temporary credentials exist only in-memory during SMTP transport.
            </Notice>
          </div>
        )}
      </Modal>

      {/* Resend Activation Credentials Modal */}
      <Modal
        open={!!resendTarget}
        onOpenChange={(o) => !o && setResendTarget(null)}
        title="Re-issue & Resend Activation Credentials"
        description={`Generate a fresh temporary password and deliver the activation email to ${resendTarget?.recipientEmail}.`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResendTarget(null)}>
              Cancel
            </Button>
            <Button disabled={resending} onClick={handleResendCredentials}>
              {resending ? 'Delivering…' : 'Resend Credentials'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-ink-soft">
            This will update the user&apos;s authentication identity with a fresh temporary password, ensure{' '}
            <code className="text-brand-700 bg-lavender-100 px-1 py-0.5 rounded">mustChangePassword = true</code>, and dispatch the standard Maatram activation email to{' '}
            <strong>{resendTarget?.recipientEmail}</strong>.
          </p>

          <div>
            <label className="block font-semibold text-navy mb-1">
              Custom Temporary Password (Optional)
            </label>
            <input
              type="text"
              placeholder="Leave blank to use default (Maatram@2026)"
              value={customTempPassword}
              onChange={(e) => setCustomTempPassword(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-lavender-300 focus:outline-none focus:border-brand-500 font-mono"
            />
            <p className="text-[11px] text-ink-mute mt-1">
              If left blank, standard default temporary password <code className="font-mono">Maatram@2026</code> is assigned.
            </p>
          </div>
        </div>
      </Modal>
      {/* Send Test Email Modal */}
      <Modal
        open={testEmailOpen}
        onOpenChange={setTestEmailOpen}
        title="Send Test Verification Email"
        description="Verify SMTP configuration and delivery latency by sending a live test email."
      >
        <form onSubmit={handleSendTestEmail} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-navy mb-1" htmlFor="test-email-to">
              Recipient Email Address
            </label>
            <input
              id="test-email-to"
              type="email"
              placeholder="e.g. your-email@gmail.com (leave blank for your logged-in email)"
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-lavender-300 focus:outline-none focus:border-brand-500 font-mono"
            />
            <p className="text-[11px] text-ink-mute mt-1">
              A sample verification email with Maatram Foundation branding will be dispatched.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setTestEmailOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={testEmailBusy}>
              <Send className="h-3.5 w-3.5 mr-1" />
              Dispatch Test Email
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

