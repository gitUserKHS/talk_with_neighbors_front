import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useI18n } from '../i18n/I18nProvider';
import adminService from '../services/adminService';
import { serverErrorMessage } from '../services/apiError';
import { AdminReport, AdminReportDetail, ReportStatus, ReportStatusCounts } from '../types/admin';
import { ReportReason, SafetyTargetType } from '../types/safety';

const STATUS_TABS: ReportStatus[] = ['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'];
const PAGE_SIZE = 20;

const statusColor = (status: ReportStatus) => {
  switch (status) {
    case 'PENDING': return 'error' as const;
    case 'REVIEWING': return 'warning' as const;
    case 'RESOLVED': return 'success' as const;
    default: return 'default' as const;
  }
};

const AdminReports: React.FC = () => {
  const { t, locale, formatDate } = useI18n();
  const [status, setStatus] = useState<ReportStatus>('PENDING');
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [counts, setCounts] = useState<ReportStatusCounts>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const statusLabel = (value: ReportStatus) => ({
    PENDING: t('접수됨', 'Pending'),
    REVIEWING: t('검토 중', 'Reviewing'),
    RESOLVED: t('조치 완료', 'Resolved'),
    DISMISSED: t('기각', 'Dismissed'),
  }[value]);

  const reasonLabel = (reason: ReportReason) => ({
    HARASSMENT: t('괴롭힘', 'Harassment'),
    HATE_SPEECH: t('혐오 표현', 'Hate speech'),
    SPAM: t('스팸', 'Spam'),
    INAPPROPRIATE_CONTENT: t('부적절한 콘텐츠', 'Inappropriate content'),
    IMPERSONATION: t('사칭', 'Impersonation'),
    PRIVACY: t('개인정보 노출', 'Privacy'),
    OTHER: t('기타', 'Other'),
  }[reason]);

  const targetLabel = (target: SafetyTargetType) => ({
    USER: t('사용자', 'User'),
    FEED_POST: t('게시글', 'Post'),
    COMMENT: t('댓글', 'Comment'),
    MESSAGE: t('메시지', 'Message'),
  }[target]);

  const failure = (err: unknown, korean: string, english: string) =>
    (locale === 'ko' ? serverErrorMessage(err) : undefined) ?? t(korean, english);

  const load = useCallback(async (nextStatus: ReportStatus) => {
    setLoading(true);
    setError(null);
    try {
      const [page, statusCounts] = await Promise.all([
        adminService.getReports(nextStatus, 0, PAGE_SIZE),
        adminService.getCounts(),
      ]);
      setReports(page.content ?? []);
      setCounts(statusCounts);
    } catch (err) {
      setError(failure(err, '신고 목록을 불러오지 못했습니다.', 'Could not load the report queue.'));
      setReports([]);
    } finally {
      setLoading(false);
    }
    // failure는 locale/t에만 의존하고 매 렌더 새로 만들어지므로 의존성에서 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  useEffect(() => {
    load(status);
  }, [load, status]);

  const openDetail = async (reportId: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const result = await adminService.getReport(reportId);
      setDetail(result);
      setNote(result.report.reviewNote ?? '');
    } catch (err) {
      setError(failure(err, '신고 상세를 불러오지 못했습니다.', 'Could not load the report.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const applyReview = async (nextStatus: ReportStatus) => {
    if (!detail) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await adminService.review(detail.report.id, nextStatus, note.trim() || undefined);
      setDetail(updated);
      await load(status);
    } catch (err) {
      setError(failure(err, '상태를 변경하지 못했습니다.', 'Could not update the report.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container component="main" maxWidth="md" sx={{ py: { xs: 2.5, sm: 4 } }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
            {t('신고 검토', 'Report review')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(
              '접수된 신고를 오래된 순서로 보여줍니다.',
              'Reports are listed oldest first.',
            )}
          </Typography>
        </Box>

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

        <Tabs
          value={status}
          onChange={(_, next: ReportStatus) => setStatus(next)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {STATUS_TABS.map((value) => (
            <Tab
              key={value}
              value={value}
              label={`${statusLabel(value)}${counts[value] != null ? ` (${counts[value]})` : ''}`}
            />
          ))}
        </Tabs>

        {loading && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && reports.length === 0 && (
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary">
                {t('이 상태의 신고가 없습니다.', 'No reports in this state.')}
              </Typography>
            </CardContent>
          </Card>
        )}

        {!loading && reports.map((report) => (
          <Card key={report.id} variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip size="small" color={statusColor(report.status)} label={statusLabel(report.status)} />
                <Chip size="small" variant="outlined" label={targetLabel(report.targetType)} />
                <Chip size="small" variant="outlined" label={reasonLabel(report.reason)} />
                {report.reportsOnSameTarget > 1 && (
                  <Chip
                    size="small"
                    color="warning"
                    label={t(
                      `같은 대상 신고 ${report.reportsOnSameTarget}건`,
                      `${report.reportsOnSameTarget} reports on this target`,
                    )}
                  />
                )}
              </Stack>
              {report.details && (
                <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>
                  {report.details}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                {t('신고자', 'Reporter')}: {report.reporterUsername ?? '-'} · {formatDate(report.createdAt, {
                  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </Typography>
              <Button size="small" sx={{ mt: 1, px: 0 }} onClick={() => openDetail(report.id)}>
                {t('상세 보기', 'Open')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Dialog
        open={Boolean(detail) || detailLoading}
        onClose={() => !submitting && setDetail(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t('신고 상세', 'Report detail')}</DialogTitle>
        <DialogContent dividers>
          {detailLoading && (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          )}
          {detail && !detailLoading && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" color={statusColor(detail.report.status)} label={statusLabel(detail.report.status)} />
                <Chip size="small" variant="outlined" label={targetLabel(detail.report.targetType)} />
                <Chip size="small" variant="outlined" label={reasonLabel(detail.report.reason)} />
              </Stack>

              {detail.report.details && (
                <Box>
                  <Typography variant="subtitle2">{t('신고 사유 설명', 'Reporter note')}</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{detail.report.details}</Typography>
                </Box>
              )}

              <Divider />

              <Box>
                <Typography variant="subtitle2">{t('신고된 내용', 'Reported content')}</Typography>
                {detail.content.available ? (
                  <Stack spacing={1} sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('작성자', 'Author')}: {detail.content.authorUsername ?? '-'}
                    </Typography>
                    {detail.content.text && (
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{detail.content.text}</Typography>
                    )}
                    {detail.content.imageUrl && (
                      <Box
                        component="img"
                        src={detail.content.imageUrl}
                        alt={t('신고된 이미지', 'Reported image')}
                        loading="lazy"
                        sx={{ width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 2, bgcolor: 'grey.100' }}
                      />
                    )}
                  </Stack>
                ) : (
                  <Alert severity="info" sx={{ mt: 0.5 }}>
                    {t('대상이 이미 삭제되었습니다.', 'The reported content no longer exists.')}
                  </Alert>
                )}
              </Box>

              <Divider />

              <TextField
                label={t('처리 메모', 'Review note')}
                multiline
                minRows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                inputProps={{ maxLength: 1000 }}
                fullWidth
              />

              {detail.report.reviewedByUsername && (
                <Typography variant="caption" color="text.secondary">
                  {t('마지막 처리', 'Last reviewed by')}: {detail.report.reviewedByUsername}
                  {detail.report.reviewedAt ? ` · ${formatDate(detail.report.reviewedAt, {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}` : ''}
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, pb: 2 }}>
          <Button onClick={() => setDetail(null)} disabled={submitting}>
            {t('닫기', 'Close')}
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={() => applyReview('REVIEWING')} disabled={submitting || !detail}>
            {t('검토 중', 'Reviewing')}
          </Button>
          <Button onClick={() => applyReview('DISMISSED')} disabled={submitting || !detail}>
            {t('기각', 'Dismiss')}
          </Button>
          <Button variant="contained" color="error" onClick={() => applyReview('RESOLVED')} disabled={submitting || !detail}>
            {t('조치 완료', 'Resolve')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminReports;
