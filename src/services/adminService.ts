import api from './api';
import { AdminReport, AdminReportDetail, ReportStatus, ReportStatusCounts } from '../types/admin';

interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  last: boolean;
}

export const adminService = {
  /**
   * 운영 메뉴를 노출할지 판단한다. 서버가 최종 권한이며 이 값은 화면 표시용이다.
   */
  async hasAdminAccess(): Promise<boolean> {
    try {
      const response = await api.get<{ admin: boolean }>('/admin/reports/access');
      return response.data.admin === true;
    } catch {
      return false;
    }
  },

  async getReports(status: ReportStatus | null, page = 0, size = 20): Promise<PageResponse<AdminReport>> {
    const response = await api.get<PageResponse<AdminReport>>('/admin/reports', {
      params: { ...(status ? { status } : {}), page, size },
    });
    return response.data;
  },

  async getCounts(): Promise<ReportStatusCounts> {
    const response = await api.get<ReportStatusCounts>('/admin/reports/counts');
    return response.data;
  },

  async getReport(reportId: string): Promise<AdminReportDetail> {
    const response = await api.get<AdminReportDetail>(`/admin/reports/${reportId}`);
    return response.data;
  },

  async review(reportId: string, status: ReportStatus, note?: string): Promise<AdminReportDetail> {
    const response = await api.patch<AdminReportDetail>(`/admin/reports/${reportId}`, { status, note });
    return response.data;
  },
};

export default adminService;
