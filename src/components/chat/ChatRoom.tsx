import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import SendIcon from '@mui/icons-material/Send';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { chatService } from '../../services/chatService';
import { websocketService } from '../../services/websocketService';
import {
  ChatAttachment,
  ChatAttachmentType,
  ChatMessageDto,
  ChatRoom as ChatRoomType,
  WebSocketResponse,
} from '../../types/chat';
import { RootState } from '../../store/types';
import { meetupService } from '../../services/meetupService';
import { mergeChatMessage } from '../../services/chatMessageState';
import { chatScheduleService, normalizeChatSchedule } from '../../services/chatScheduleService';
import {
  browserTimeZone,
  isUpcomingChatSchedule,
  localDateTimeToUtcIso,
  sortChatSchedules,
} from '../../services/chatScheduleDateTime';
import { upsertChatSchedule } from '../../services/chatScheduleState';
import {
  ChatSchedule,
  ChatScheduleFormValues,
  ChatScheduleRsvpStatus,
  CreateChatScheduleRequest,
} from '../../types/chatSchedule';
import ChatScheduleDetailsDialog from './schedule/ChatScheduleDetailsDialog';
import ChatScheduleFormDialog from './schedule/ChatScheduleFormDialog';
import ChatScheduleListDialog from './schedule/ChatScheduleListDialog';
import {
  MAX_VIDEO_BYTES,
  MAX_VIDEO_COUNT,
  MAX_MEDIA_REQUEST_BYTES,
  mediaUploadStatusText,
} from '../../services/mediaUploadPolicy';
import { useI18n } from '../../i18n/I18nProvider';

const MAX_ATTACHMENT_COUNT = 5;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf', 'application/zip',
  'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'application/json', 'text/markdown',
]);
const ACCEPTED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov',
  '.pdf', '.zip', '.doc', '.xls', '.ppt', '.docx', '.xlsx', '.pptx',
  '.txt', '.csv', '.json', '.md',
]);
const ACCEPT_ATTRIBUTE = [
  'image/jpeg,image/png,image/gif,image/webp',
  'video/mp4,video/webm,video/quicktime',
  '.pdf,.zip,.doc,.xls,.ppt,.docx,.xlsx,.pptx,.txt,.csv,.json,.md',
].join(',');

interface PendingAttachment {
  id: string;
  file: File;
  type: ChatAttachmentType;
  previewUrl: string;
}

const formatBytes = (bytes: number, formatNumber: (value: number) => string) => {
  if (bytes < 1024 * 1024) return `${formatNumber(Math.max(1, Math.round(bytes / 1024)))} KB`;
  return `${formatNumber(Number((bytes / 1024 / 1024).toFixed(1)))} MB`;
};

const toChatMessage = (message: WebSocketResponse): ChatMessageDto => ({
  id: message.id,
  chatRoomId: message.roomId,
  content: message.content,
  senderId: message.senderId,
  senderName: message.senderName,
  isRead: message.isRead,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
  editedAt: message.editedAt,
  deletedAt: message.deletedAt,
  type: message.type,
  isDeleted: message.isDeleted,
  readByUsers: message.readByUsers,
  attachments: message.attachments ?? [],
  schedule: message.schedule ? normalizeChatSchedule(message.schedule) : undefined,
});

const extensionOf = (name: string) => {
  const index = name.lastIndexOf('.');
  return index < 0 ? '' : name.slice(index).toLowerCase();
};

const attachmentTypeOf = (file: File): ChatAttachmentType => {
  if (file.type.startsWith('image/')) return 'IMAGE';
  if (file.type.startsWith('video/')) return 'VIDEO';
  return 'FILE';
};

const ChatRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { locale, t, formatDate, formatNumber } = useI18n();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [room, setRoom] = useState<ChatRoomType | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [mutatingMessageId, setMutatingMessageId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessageDto | null>(null);
  const [schedules, setSchedules] = useState<ChatSchedule[]>([]);
  const [scheduleListOpen, setScheduleListOpen] = useState(false);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ChatSchedule | null>(null);
  const [detailScheduleId, setDetailScheduleId] = useState<string | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [busyScheduleId, setBusyScheduleId] = useState<string | null>(null);
  const [scheduleClock, setScheduleClock] = useState(() => Date.now());
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<PendingAttachment[]>([]);
  const detailSchedule = useMemo(
    () => schedules.find((schedule) => schedule.id === detailScheduleId) ?? null,
    [detailScheduleId, schedules],
  );
  const upcomingSchedules = useMemo(
    () => sortChatSchedules(schedules.filter(
      (schedule) => isUpcomingChatSchedule(schedule, new Date(scheduleClock)),
    )),
    [scheduleClock, schedules],
  );
  const hasConversationMessages = useMemo(
    () => messages.some((message) => message.type !== 'SCHEDULE'),
    [messages],
  );

  const refreshSchedules = useCallback(async () => {
    if (!roomId) return;
    const loadedSchedules = await chatScheduleService.getSchedules(roomId);
    setSchedules(loadedSchedules);
  }, [roomId]);

  useEffect(() => {
    pendingRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => () => {
    pendingRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setScheduleClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const loadRoom = async () => {
      setLoading(true);
      setError(null);
      setSchedules([]);
      setScheduleListOpen(false);
      setScheduleFormOpen(false);
      setEditingSchedule(null);
      setDetailScheduleId(null);
      try {
        const [roomData, messagePage] = await Promise.all([
          chatService.getRoom(roomId),
          chatService.getMessages(roomId, 0, 50),
        ]);
        setRoom(roomData);
        const orderedMessages = [...messagePage.content].reverse();
        setMessages(orderedMessages);
        if (roomData.publicRoom) {
          try {
            const loadedSchedules = await chatScheduleService.getSchedules(roomId);
            const schedulesFromMessages = orderedMessages
              .map((message) => message.schedule)
              .filter((schedule): schedule is ChatSchedule => Boolean(schedule));
            setSchedules(schedulesFromMessages.reduce(upsertChatSchedule, loadedSchedules));
          } catch (scheduleError: any) {
            const fallback = t('모임 일정을 불러오지 못했습니다.', 'We could not load the meetup schedules.');
            setError(locale === 'ko' ? scheduleError.response?.data?.message || fallback : fallback);
          }
        }
        chatService.markMessagesAsRead(roomId).catch(() => undefined);
      } catch {
        setError(t('채팅방을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', 'We could not load the conversation. Please try again shortly.'));
      } finally {
        setLoading(false);
      }
    };
    void loadRoom();
  }, [locale, roomId, t]);

  useEffect(() => {
    if (!roomId) return;
    const handleRoomMessage = (message: WebSocketResponse) => {
      const incoming = toChatMessage(message);
      if (incoming.type === 'SCHEDULE') {
        if (incoming.schedule) {
          setSchedules((current) => upsertChatSchedule(current, incoming.schedule!));
        } else if (room?.publicRoom) {
          void refreshSchedules().catch(() => undefined);
        }
        return;
      }
      setMessages((current) => mergeChatMessage(current, incoming));
      if (incoming.isDeleted) {
        setEditingMessageId((current) => current === incoming.id ? null : current);
        setDeleteTarget((current) => current?.id === incoming.id ? null : current);
      }
    };
    const unsubscribeConnectionState = websocketService.registerConnectionStateChangeCallback((connected) => {
      if (!connected) return;
      // STOMP subscriptions are tied to one connection. Remove a stale entry
      // before subscribing after the initial async connect or a reconnect.
      websocketService.unsubscribeFromRoom(roomId);
      websocketService.subscribeToRoom(roomId, handleRoomMessage);
    });

    return () => {
      unsubscribeConnectionState();
      websocketService.unsubscribeFromRoom(roomId);
    };
  }, [refreshSchedules, room?.publicRoom, roomId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addFiles = (files: File[]) => {
    const available = MAX_ATTACHMENT_COUNT - pendingAttachments.length;
    if (available <= 0) {
      setError(t('첨부 파일은 메시지마다 최대 5개까지 보낼 수 있습니다.', 'You can send up to 5 attachments per message.'));
      return;
    }

    const accepted: PendingAttachment[] = [];
    const errors: string[] = [];
    const knownIds = new Set(pendingAttachments.map((item) => item.id));
    const existingVideoCount = pendingAttachments.filter((item) => item.type === 'VIDEO').length;
    for (const file of files) {
      if (accepted.length >= available) {
        errors.push(t('첨부 파일은 최대 5개까지만 추가할 수 있습니다.', 'You can add up to 5 attachments.'));
        break;
      }
      const extension = extensionOf(file.name);
      if (!ACCEPTED_MIME_TYPES.has(file.type) && !ACCEPTED_EXTENSIONS.has(extension)) {
        errors.push(t(`${file.name}: 지원하지 않는 파일 형식입니다.`, `${file.name}: This file type is not supported.`));
        continue;
      }
      const type = attachmentTypeOf(file);
      const limit = type === 'IMAGE' ? MAX_IMAGE_BYTES : type === 'VIDEO' ? MAX_VIDEO_BYTES : MAX_FILE_BYTES;
      if (file.size > limit) {
        const limitLabel = type === 'IMAGE' ? '10 MB' : type === 'VIDEO' ? '30 MB' : '25 MB';
        errors.push(t(`${file.name}: ${limitLabel}를 넘을 수 없습니다.`, `${file.name}: The file must be ${limitLabel} or smaller.`));
        continue;
      }
      if (type === 'VIDEO' && existingVideoCount + accepted.filter((item) => item.type === 'VIDEO').length >= MAX_VIDEO_COUNT) {
        errors.push(t(`${file.name}: 동영상은 한 번에 1개만 보낼 수 있습니다.`, `${file.name}: You can send one video at a time.`));
        continue;
      }
      const id = `${file.name}-${file.size}-${file.lastModified}`;
      if (knownIds.has(id)) {
        errors.push(t(`${file.name}: 이미 선택한 파일입니다.`, `${file.name}: This file is already selected.`));
        continue;
      }
      knownIds.add(id);
      accepted.push({ id, file, type, previewUrl: URL.createObjectURL(file) });
    }

    const total = [...pendingAttachments, ...accepted]
      .reduce((sum, item) => sum + item.file.size, 0);
    if (total > MAX_MEDIA_REQUEST_BYTES) {
      accepted.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setError(t('한 메시지의 첨부 파일 전체 크기는 120 MB를 넘을 수 없습니다.', 'The total attachment size for one message cannot exceed 120 MB.'));
      return;
    }
    if (accepted.length > 0) setPendingAttachments((current) => [...current, ...accepted]);
    setError(errors.length > 0 ? errors.join(' ') : null);
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!roomId || !currentUser || sending) return;
    const content = newMessage.trim();
    if (!content && pendingAttachments.length === 0) return;
    const senderId = Number(currentUser.id);
    if (!Number.isSafeInteger(senderId) || senderId <= 0) {
      setError(t('로그인 정보를 확인하지 못했습니다. 다시 로그인해 주세요.', 'We could not verify your sign-in. Please sign in again.'));
      return;
    }

    const selected = pendingAttachments;
    const optimisticAttachments: ChatAttachment[] = selected.map((item, index) => ({
      url: item.previewUrl,
      type: item.type,
      contentType: item.file.type || 'application/octet-stream',
      originalName: item.file.name,
      sizeBytes: item.file.size,
      sortOrder: index,
    }));
    const optimisticMessage: ChatMessageDto = {
      id: `temp-${Date.now()}`,
      chatRoomId: roomId,
      content,
      senderId,
      senderName: currentUser.username,
      isRead: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: content ? 'TEXT' : selected[0]?.type ?? 'TEXT',
      readByUsers: [senderId],
      attachments: optimisticAttachments,
    };

    setSending(true);
    setUploadProgress(0);
    setNewMessage('');
    setPendingAttachments([]);
    setMessages((current) => [...current, optimisticMessage]);
    try {
      const savedMessage = await chatService.sendMessage(
        optimisticMessage,
        selected.map((item) => item.file),
        setUploadProgress
      );
      setMessages((current) => current.map((message) =>
        message.id === optimisticMessage.id ? savedMessage : message));
      selected.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    } catch (err: any) {
      const fallback = t('메시지와 첨부 파일을 보내지 못했습니다. 다시 시도해 주세요.', 'We could not send the message and attachments. Please try again.');
      setError(locale === 'ko' ? err.response?.data?.message || fallback : fallback);
      setMessages((current) => current.filter((item) => item.id !== optimisticMessage.id));
      setNewMessage(content);
      setPendingAttachments(selected);
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  };

  const handleLeaveMeetup = async () => {
    if (!roomId) return;
    setLeaving(true);
    try {
      await meetupService.leaveMeetup(roomId);
      navigate('/meetups');
    } catch (err: any) {
      const fallback = t('모임에서 나가지 못했습니다.', 'We could not leave the meetup.');
      setError(locale === 'ko' ? err.response?.data?.message || fallback : fallback);
    } finally {
      setLeaving(false);
      setLeaveDialogOpen(false);
    }
  };

  const startEditingMessage = (message: ChatMessageDto) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content ?? '');
    setError(null);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleUpdateMessage = async (message: ChatMessageDto) => {
    if (!roomId || mutatingMessageId) return;
    const normalized = editingContent.trim();
    if (!normalized && (message.attachments?.length ?? 0) === 0) {
      setError(t('텍스트 메시지의 내용은 비워둘 수 없습니다.', 'A text message cannot be empty.'));
      return;
    }
    if (normalized === (message.content ?? '').trim()) {
      cancelEditingMessage();
      return;
    }

    setMutatingMessageId(message.id);
    setError(null);
    try {
      const updated = await chatService.updateMessage(roomId, message.id, normalized);
      setMessages((current) => mergeChatMessage(current, updated));
      cancelEditingMessage();
    } catch (err: any) {
      const fallback = t('메시지를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'We could not edit the message. Please try again shortly.');
      setError(locale === 'ko' ? err.response?.data?.message || fallback : fallback);
    } finally {
      setMutatingMessageId(null);
    }
  };

  const handleDeleteMessage = async () => {
    if (!roomId || !deleteTarget || mutatingMessageId) return;
    const target = deleteTarget;
    setMutatingMessageId(target.id);
    setError(null);
    try {
      const deleted = await chatService.deleteMessage(roomId, target.id);
      setMessages((current) => mergeChatMessage(current, deleted));
      setDeleteTarget(null);
      if (editingMessageId === target.id) cancelEditingMessage();
    } catch (err: any) {
      const fallback = t('메시지를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'We could not delete the message. Please try again shortly.');
      setError(locale === 'ko' ? err.response?.data?.message || fallback : fallback);
    } finally {
      setMutatingMessageId(null);
    }
  };

  const openScheduleCreate = () => {
    setScheduleListOpen(false);
    setDetailScheduleId(null);
    setEditingSchedule(null);
    setScheduleFormOpen(true);
  };

  const closeScheduleForm = () => {
    if (scheduleSaving) return;
    setScheduleFormOpen(false);
    setEditingSchedule(null);
    setScheduleListOpen(true);
  };

  const closeScheduleDetails = () => {
    setDetailScheduleId(null);
    setScheduleListOpen(true);
  };

  const openScheduleDetails = (schedule: ChatSchedule) => {
    if (!roomId) return;
    setScheduleListOpen(false);
    setDetailScheduleId(schedule.id);
    setBusyScheduleId(schedule.id);
    void chatScheduleService.getSchedule(roomId, schedule.id)
      .then((latest) => setSchedules((current) => upsertChatSchedule(current, latest)))
      .catch((err: any) => {
        const fallback = t('일정 상세를 불러오지 못했습니다.', 'We could not load the schedule details.');
        setError(locale === 'ko' ? err.response?.data?.message || fallback : fallback);
      })
      .finally(() => setBusyScheduleId(null));
  };

  const editChatSchedule = (schedule: ChatSchedule) => {
    setDetailScheduleId(null);
    setEditingSchedule(schedule);
    setScheduleFormOpen(true);
  };

  const saveChatSchedule = async (values: ChatScheduleFormValues) => {
    if (!roomId) return;
    const request: CreateChatScheduleRequest = {
      title: values.title,
      // PATCH treats an explicit empty string as "remove the old description".
      description: values.description,
      startsAt: localDateTimeToUtcIso(values.startsAt),
      durationMinutes: values.durationMinutes,
      // The datetime-local control is interpreted in this browser's zone.
      // Send the same zone on both create and edit so the saved display agrees.
      timeZone: browserTimeZone(),
      location: values.location || undefined,
      locationAddress: values.locationAddress,
      latitude: values.latitude,
      longitude: values.longitude,
      kakaoPlaceId: values.kakaoPlaceId,
    };

    setScheduleSaving(true);
    try {
      const saved = editingSchedule
        ? await chatScheduleService.updateSchedule(roomId, editingSchedule.id, {
          ...request,
          version: editingSchedule.version,
        })
        : await chatScheduleService.createSchedule(roomId, request);
      setSchedules((current) => upsertChatSchedule(current, saved));
      setScheduleFormOpen(false);
      setEditingSchedule(null);
      setDetailScheduleId(null);
      setScheduleListOpen(true);
    } finally {
      setScheduleSaving(false);
    }
  };

  const updateScheduleRsvp = async (
    schedule: ChatSchedule,
    status: ChatScheduleRsvpStatus,
  ) => {
    if (!roomId || busyScheduleId) return;
    setBusyScheduleId(schedule.id);
    setError(null);
    try {
      const updated = await chatScheduleService.updateRsvp(roomId, schedule.id, status);
      setSchedules((current) => upsertChatSchedule(current, updated));
    } catch (err: any) {
      const fallback = t('참석 여부를 변경하지 못했습니다.', 'We could not update your response.');
      setError(locale === 'ko' ? err.response?.data?.message || fallback : fallback);
    } finally {
      setBusyScheduleId(null);
    }
  };

  const cancelChatSchedule = async (schedule: ChatSchedule) => {
    if (!roomId || busyScheduleId) return;
    setBusyScheduleId(schedule.id);
    try {
      const cancelled = await chatScheduleService.cancelSchedule(roomId, schedule.id, schedule.version);
      setSchedules((current) => upsertChatSchedule(current, cancelled));
    } finally {
      setBusyScheduleId(null);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 'calc(100dvh - 72px)' }}><CircularProgress /></Box>;
  }

  return (
    <Container
      maxWidth="md"
      disableGutters
      sx={{
        py: 0,
        height: {
          xs: 'calc(100dvh - 120px - env(safe-area-inset-bottom))',
          sm: 'calc(100dvh - 72px)',
        },
      }}
    >
      <Paper variant="outlined" sx={{ height: '100%', display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr) auto', borderRadius: 0, overflow: 'hidden' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <IconButton aria-label={t('채팅 목록으로 이동', 'Back to conversations')} onClick={() => navigate('/chat')}><ArrowBackIcon /></IconButton>
            <Avatar>{room?.roomName?.[0] || t('채', 'C')}</Avatar>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }} noWrap>{room?.roomName || t('채팅방', 'Conversation')}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t(
                  `${formatNumber(room?.participantCount || 0)}명 참여 중`,
                  `${formatNumber(room?.participantCount || 0)} ${(room?.participantCount || 0) === 1 ? 'participant' : 'participants'}`,
                )}
              </Typography>
              {room?.publicRoom && (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5, display: { xs: 'none', sm: 'flex' } }}>
                  {(room.interestTags ?? []).map((tag) => <Chip key={tag} label={tag} size="small" variant="outlined" />)}
                </Stack>
              )}
            </Box>
            {room?.publicRoom && (
              <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                <Tooltip title={t('모임 달력', 'Meetup calendar')}>
                  <IconButton aria-label={t('모임 달력 보기', 'Open meetup calendar')} onClick={() => setScheduleListOpen(true)}>
                    <Badge badgeContent={upcomingSchedules.length} color="primary" max={9}>
                      <CalendarMonthOutlinedIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('모임 나가기', 'Leave meetup')}>
                  <IconButton aria-label={t('모임 나가기', 'Leave meetup')} onClick={() => setLeaveDialogOpen(true)}><ExitToAppIcon /></IconButton>
                </Tooltip>
              </Stack>
            )}
          </Box>
        </Box>

        <Box sx={{ overflowY: 'auto', p: 2, bgcolor: 'grey.50' }}>
          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={1.5}>
            {!hasConversationMessages && room?.publicRoom && (
              <Box sx={{ py: 5, textAlign: 'center', color: 'text.secondary' }}>
                <ForumOutlinedIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography fontWeight={800}>{t('아직 대화가 없습니다.', 'No messages yet.')}</Typography>
                <Typography variant="body2">{t('첫 인사를 건네 보세요.', 'Start the conversation with a friendly hello.')}</Typography>
              </Box>
            )}
            {messages.map((message) => {
              if (message.type === 'SCHEDULE') {
                return null;
              }
              const isMine = String(message.senderId) === String(currentUser?.id);
              const isEditing = editingMessageId === message.id;
              const isMutating = mutatingMessageId === message.id;
              const canMutate = isMine
                && !message.isDeleted
                && ['TEXT', 'IMAGE', 'VIDEO', 'FILE'].includes(message.type);
              return (
                <Box key={message.id} sx={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <Box sx={{ maxWidth: { xs: '88%', sm: '76%' }, minWidth: isEditing ? { xs: '78%', sm: 360 } : 0, px: 1.25, py: 1, borderRadius: 2.5, bgcolor: message.isDeleted ? 'action.disabledBackground' : isMine ? 'primary.main' : 'background.paper', color: message.isDeleted ? 'text.secondary' : isMine ? 'primary.contrastText' : 'text.primary', border: isMine && !message.isDeleted ? 0 : 1, borderColor: 'divider' }}>
                     {!isMine && <Typography variant="caption" sx={{ fontWeight: 700 }}>{message.senderName}</Typography>}
                     {canMutate && !isEditing && (
                       <Stack direction="row" spacing={0.25} justifyContent="flex-end" sx={{ mt: -0.5, mr: -0.5 }}>
                         <Tooltip title={t('메시지 수정', 'Edit message')}>
                           <span><IconButton aria-label={t('메시지 수정', 'Edit message')} size="small" disabled={isMutating} onClick={() => startEditingMessage(message)} sx={{ color: 'inherit', opacity: 0.8 }}><EditOutlinedIcon fontSize="inherit" /></IconButton></span>
                         </Tooltip>
                         <Tooltip title={t('메시지 삭제', 'Delete message')}>
                           <span><IconButton aria-label={t('메시지 삭제', 'Delete message')} size="small" disabled={isMutating} onClick={() => setDeleteTarget(message)} sx={{ color: 'inherit', opacity: 0.8 }}><DeleteOutlineIcon fontSize="inherit" /></IconButton></span>
                         </Tooltip>
                       </Stack>
                     )}
                     {message.isDeleted ? (
                       <Typography sx={{ fontStyle: 'italic', py: 0.25 }}>{t('삭제된 메시지입니다.', 'This message was deleted.')}</Typography>
                     ) : (
                       <>
                         <AttachmentGallery attachments={message.attachments ?? []} />
                         {isEditing ? (
                           <Box sx={{ mt: message.attachments?.length ? 0.75 : 0 }}>
                             <TextField
                               value={editingContent}
                               onChange={(event) => setEditingContent(event.target.value)}
                               multiline
                               maxRows={5}
                               fullWidth
                               autoFocus
                               disabled={isMutating}
                               inputProps={{ maxLength: 2000, 'aria-label': t('수정할 메시지', 'Message to edit') }}
                               sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
                             />
                             <Stack direction="row" spacing={0.75} justifyContent="flex-end" sx={{ mt: 0.75 }}>
                               <Button size="small" color="inherit" onClick={cancelEditingMessage} disabled={isMutating}>{t('취소', 'Cancel')}</Button>
                               <Button size="small" variant="contained" onClick={() => handleUpdateMessage(message)} disabled={isMutating || (!editingContent.trim() && (message.attachments?.length ?? 0) === 0)}>{isMutating ? t('저장 중…', 'Saving…') : t('저장', 'Save')}</Button>
                             </Stack>
                           </Box>
                         ) : message.content ? (
                           <Typography sx={{ whiteSpace: 'pre-wrap', mt: message.attachments?.length ? 0.75 : 0 }}>{message.content}</Typography>
                         ) : null}
                       </>
                     )}
                     <Typography variant="caption" sx={{ display: 'block', opacity: 0.75, textAlign: 'right', mt: 0.5 }}>
                       {message.editedAt && !message.isDeleted ? t('수정됨 · ', 'Edited · ') : ''}
                       {formatDate(message.createdAt, { hour: '2-digit', minute: '2-digit' })}
                     </Typography>
                   </Box>
                 </Box>
              );
            })}
            <div ref={endRef} />
          </Stack>
        </Box>

        <Box component="form" onSubmit={handleSendMessage} sx={{ borderTop: 1, borderColor: 'divider' }}>
          {pendingAttachments.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ px: 1.5, pt: 1.25, overflowX: 'auto' }}>
              {pendingAttachments.map((item) => (
                <Paper key={item.id} variant="outlined" sx={{ position: 'relative', flex: '0 0 92px', width: 92, height: 76, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                  {item.type === 'IMAGE' && <Box component="img" src={item.previewUrl} alt={item.file.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  {item.type === 'VIDEO' && <MovieOutlinedIcon color="action" />}
                  {item.type === 'FILE' && <DescriptionOutlinedIcon color="action" />}
                  <IconButton aria-label={t(`${item.file.name} 제거`, `Remove ${item.file.name}`)} size="small" onClick={() => removePendingAttachment(item.id)} sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(255,255,255,.9)', '&:hover': { bgcolor: 'white' } }}><CloseIcon fontSize="small" /></IconButton>
                  {item.type !== 'IMAGE' && <Typography variant="caption" noWrap sx={{ position: 'absolute', bottom: 2, left: 4, right: 4, textAlign: 'center' }}>{item.file.name}</Typography>}
                </Paper>
              ))}
            </Stack>
          )}
          {sending && pendingAttachments.length === 0 && (
            <Box sx={{ px: 1.5, pt: 1 }}>
              <LinearProgress variant={uploadProgress > 0 ? 'determinate' : 'indeterminate'} value={uploadProgress} />
              <Typography variant="caption" color="text.secondary">
                {mediaUploadStatusText(uploadProgress)}
              </Typography>
            </Box>
          )}
          <Stack direction="row" spacing={0.75} alignItems="flex-end" sx={{ p: 1.5 }}>
            <input ref={fileInputRef} type="file" hidden multiple accept={ACCEPT_ATTRIBUTE} onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
            <Tooltip title={t(
              '사진·동영상·파일 첨부 (최대 5개). 동영상은 1개, 30 MB·60초·Full HD(1080p) 이하만 첨부할 수 있습니다.',
              'Attach photos, videos, or files (up to 5). Videos: one file, up to 30 MB, 60 seconds, and Full HD (1080p).',
            )}>
              <span><IconButton aria-label={t('파일 첨부', 'Attach files')} disabled={sending || pendingAttachments.length >= MAX_ATTACHMENT_COUNT} onClick={() => fileInputRef.current?.click()}><AttachFileIcon /></IconButton></span>
            </Tooltip>
            <TextField
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.closest('form')?.requestSubmit();
                }
              }}
              placeholder={t('메시지를 입력해 주세요', 'Write a message')}
              size="small"
              multiline
              maxRows={4}
              fullWidth
              disabled={sending}
            />
            <Button type="submit" variant="contained" endIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />} disabled={sending || (!newMessage.trim() && pendingAttachments.length === 0)}>{t('전송', 'Send')}</Button>
          </Stack>
        </Box>
      </Paper>

      {room?.publicRoom && (
        <>
          <ChatScheduleListDialog
            open={scheduleListOpen}
            schedules={schedules}
            now={scheduleClock}
            currentUserId={currentUser?.id}
            busyScheduleId={busyScheduleId}
            onClose={() => setScheduleListOpen(false)}
            onCreate={openScheduleCreate}
            onOpen={openScheduleDetails}
            onRsvp={(schedule, status) => void updateScheduleRsvp(schedule, status)}
          />
          <ChatScheduleFormDialog
            open={scheduleFormOpen}
            schedule={editingSchedule}
            saving={scheduleSaving}
            onClose={closeScheduleForm}
            onSave={saveChatSchedule}
          />
          <ChatScheduleDetailsDialog
            schedule={detailSchedule}
            currentUserId={currentUser?.id}
            busy={Boolean(detailSchedule && busyScheduleId === detailSchedule.id)}
            onClose={closeScheduleDetails}
            onEdit={editChatSchedule}
            onCancel={cancelChatSchedule}
            onRsvp={updateScheduleRsvp}
          />
        </>
      )}

      <Dialog open={leaveDialogOpen} onClose={() => !leaving && setLeaveDialogOpen(false)}>
        <DialogTitle>{t('모임에서 나가시겠어요?', 'Leave this meetup?')}</DialogTitle>
        <DialogContent><Typography>{t('나가면 이 모임의 대화를 더 이상 볼 수 없습니다.', 'You will no longer be able to view this meetup conversation.')}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveDialogOpen(false)} disabled={leaving}>{t('취소', 'Cancel')}</Button>
          <Button color="error" onClick={handleLeaveMeetup} disabled={leaving}>{leaving ? t('나가는 중…', 'Leaving…') : t('나가기', 'Leave')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => !mutatingMessageId && setDeleteTarget(null)}>
        <DialogTitle>{t('메시지를 삭제하시겠어요?', 'Delete this message?')}</DialogTitle>
        <DialogContent>
          <Typography>{t('삭제하면 내용과 첨부 파일이 함께 사라지며 되돌릴 수 없습니다.', 'The message and its attachments will be permanently deleted.')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={Boolean(mutatingMessageId)}>{t('취소', 'Cancel')}</Button>
          <Button color="error" variant="contained" onClick={handleDeleteMessage} disabled={Boolean(mutatingMessageId)}>
            {mutatingMessageId ? t('삭제 중…', 'Deleting…') : t('삭제', 'Delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

const AttachmentGallery = ({ attachments }: { attachments: ChatAttachment[] }) => {
  const { formatNumber } = useI18n();
  if (attachments.length === 0) return null;
  const ordered = [...attachments].sort((left, right) => left.sortOrder - right.sortOrder);
  return (
    <Stack spacing={0.75} sx={{ mt: 0.5 }}>
      {ordered.map((attachment, index) => {
        if (attachment.type === 'IMAGE') {
          return (
            <Box component="a" key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noreferrer" sx={{ display: 'block' }}>
              <Box component="img" src={attachment.thumbnailUrl || attachment.url} alt={attachment.originalName} loading="lazy" sx={{ display: 'block', width: '100%', maxWidth: 360, maxHeight: 360, objectFit: 'cover', borderRadius: 1.5 }} />
            </Box>
          );
        }
        if (attachment.type === 'VIDEO') {
          return <Box component="video" key={`${attachment.url}-${index}`} src={attachment.url} poster={attachment.thumbnailUrl} controls playsInline preload="metadata" sx={{ display: 'block', width: '100%', maxWidth: 420, maxHeight: 420, bgcolor: 'black', borderRadius: 1.5 }} />;
        }
        return (
          <Paper component="a" key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noreferrer" download={attachment.originalName} variant="outlined" sx={{ p: 1, display: 'flex', gap: 1, alignItems: 'center', color: 'inherit', textDecoration: 'none', bgcolor: 'rgba(255,255,255,.12)' }}>
            <DescriptionOutlinedIcon />
            <Box sx={{ minWidth: 0 }}><Typography variant="body2" noWrap>{attachment.originalName}</Typography><Typography variant="caption" sx={{ opacity: 0.75 }}>{formatBytes(attachment.sizeBytes, formatNumber)}</Typography></Box>
          </Paper>
        );
      })}
    </Stack>
  );
};

export default ChatRoom;
