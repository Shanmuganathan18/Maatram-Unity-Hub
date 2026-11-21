/**
 * src/services/adminEmailService.js
 *
 * Client service for Administrator Email Delivery Management,
 * audit history, failure diagnosis, and live retries.
 */
import { api } from './api';

export const adminEmailService = {
  /**
   * Fetch paginated email logs with filtering
   * @param {Object} query
   * @param {string} [query.role] - STUDENT, OFFICER, ADMIN
   * @param {string} [query.status] - QUEUED, SENT, FAILED
   * @param {string} [query.search] - email or name substring
   * @param {number} [query.page=1]
   * @param {number} [query.limit=20]
   */
  async listEmailLogs(query = {}) {
    const params = new URLSearchParams();
    if (query.role) params.append('role', query.role);
    if (query.status) params.append('status', query.status);
    if (query.search) params.append('search', query.search);
    if (query.startDate) params.append('startDate', query.startDate);
    if (query.endDate) params.append('endDate', query.endDate);
    if (query.page) params.append('page', query.page);
    if (query.limit) params.append('limit', query.limit);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get(`/admin/emails${queryStr}`);
    return res;
  },

  /**
   * Fetch single email delivery log with full metadata and error trace
   */
  async getEmailLogById(id) {
    const res = await api.get(`/admin/emails/${id}`);
    return res.data;
  },

  /**
   * Retry single failed email log
   */
  async retryFailedEmail(id) {
    const res = await api.post(`/admin/emails/${id}/retry`);
    return res.data;
  },

  /**
   * Bulk retry all eligible failed email deliveries
   */
  async bulkRetryFailedEmails() {
    const res = await api.post('/admin/emails/retry-failed');
    return res.data;
  },

  /**
   * Resend activation email with fresh temporary password to a specific user
   */
  async resendActivationToUser(userId, temporaryPassword = null) {
    const res = await api.post(`/admin/users/${userId}/resend-activation`, {
      temporaryPassword,
    });
    return res.data;
  },

  /**
   * Check SMTP configuration and live connection health
   */
  async getEmailStatus() {
    const res = await api.get('/admin/email/status');
    return res.data;
  },

  /**
   * Send a test verification email via SMTP
   */
  async sendTestEmail(toEmail) {
    const res = await api.post('/admin/email/test', toEmail ? { to: toEmail } : {});
    return res;
  },
};

