import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import feedService from '../../services/feedService';
import { FeedComment } from '../../types/feed';
import { useI18n } from '../../i18n/I18nProvider';
import { serverErrorMessage } from '../../services/apiError';

export interface FeedCommentThreadProps {
  postId: string;
  comments: FeedComment[];
  currentUserId?: string | number;
  onCommentAdded: (postId: string, comment: FeedComment) => void;
  onCommentUpdated: (postId: string, comment: FeedComment) => void;
  onCommentDeleted: (postId: string, commentId: string) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

/**
 * Comment list and composer for one feed card. The draft, the edit buffer and the
 * per-comment busy flag live here so typing re-renders this card only; the page
 * keeps the shared comment map and receives the persisted results through callbacks.
 */
const FeedCommentThread: React.FC<FeedCommentThreadProps> = ({
  postId,
  comments,
  currentUserId,
  onCommentAdded,
  onCommentUpdated,
  onCommentDeleted,
  onError,
  onSuccess,
}) => {
  const { locale, t, formatDate } = useI18n();
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<FeedComment | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [mutatingCommentId, setMutatingCommentId] = useState<string | null>(null);
  // The page unmounts every card when its view generation changes, so a mounted
  // flag is the per-card equivalent of the page's isLatestRequest guard.
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const requestError = (request: unknown, korean: string, english: string) => (
    (locale === 'ko' ? serverErrorMessage(request) : undefined) ?? t(korean, english)
  );

  const displayDate = (value?: string | null) => value
    ? formatDate(value, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  const submitComment = async () => {
    const content = draft.trim();
    if (!content || submitting) return;

    setSubmitting(true);
    try {
      const created = await feedService.addComment(postId, content);
      if (!mounted.current) return;
      setDraft('');
      onCommentAdded(postId, created);
    } catch {
      if (!mounted.current) return;
      onError(t('댓글을 등록하지 못했습니다.', 'Could not post your comment.'));
    } finally {
      if (mounted.current) setSubmitting(false);
    }
  };

  const startCommentEdit = (comment: FeedComment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const submitCommentEdit = async (comment: FeedComment) => {
    if (mutatingCommentId) return;
    const content = editContent.trim();
    if (!content) {
      onError(t('댓글 내용을 입력해 주세요.', 'Enter a comment.'));
      return;
    }
    setMutatingCommentId(comment.id);
    try {
      const updated = await feedService.updateComment(comment.id, content);
      if (!mounted.current) return;
      onCommentUpdated(postId, updated);
      setEditingCommentId(null);
      onSuccess(t('댓글을 수정했습니다.', 'Comment updated.'));
    } catch (err) {
      if (!mounted.current) return;
      onError(requestError(err, '댓글을 수정하지 못했습니다.', 'Could not update the comment.'));
    } finally {
      if (mounted.current) setMutatingCommentId(null);
    }
  };

  const submitCommentDelete = async () => {
    if (!deleteTarget || mutatingCommentId) return;
    const comment = deleteTarget;
    setMutatingCommentId(comment.id);
    setDeleteError(null);
    try {
      await feedService.deleteComment(comment.id);
      if (!mounted.current) return;
      onCommentDeleted(postId, comment.id);
      setDeleteTarget(null);
      if (editingCommentId === comment.id) setEditingCommentId(null);
      onSuccess(t('댓글을 삭제했습니다.', 'Comment deleted.'));
    } catch (err) {
      if (!mounted.current) return;
      const message = requestError(err, '댓글을 삭제하지 못했습니다.', 'Could not delete the comment.');
      setDeleteError(message);
      onError(message);
    } finally {
      if (mounted.current) setMutatingCommentId(null);
    }
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Divider sx={{ mb: 1.5 }} />
      <Stack spacing={1.25}>
        {comments.map((comment) => {
          const isOwnComment = String(comment.authorId) === String(currentUserId);
          const isEditingComment = editingCommentId === comment.id;
          const isMutatingComment = mutatingCommentId === comment.id;
          return (
            <Box key={comment.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Avatar src={comment.authorProfileImage} sx={{ width: 28, height: 28 }}>
                {comment.authorUsername?.[0]}
              </Avatar>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                {isEditingComment ? (
                  <Stack spacing={0.75}>
                    <TextField
                      size="small"
                      fullWidth
                      multiline
                      maxRows={5}
                      autoFocus
                      value={editContent}
                      disabled={isMutatingComment}
                      inputProps={{ maxLength: 1000, 'aria-label': t('수정할 댓글', 'Edit comment') }}
                      onChange={(event) => setEditContent(event.target.value)}
                    />
                    <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                      <Button size="small" disabled={isMutatingComment} onClick={() => setEditingCommentId(null)}>{t('취소', 'Cancel')}</Button>
                      <Button size="small" variant="contained" disabled={isMutatingComment || !editContent.trim()} onClick={() => submitCommentEdit(comment)}>
                        {isMutatingComment ? t('저장 중…', 'Saving…') : t('저장', 'Save')}
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <>
                    <Typography variant="body2">
                      <strong>{comment.authorUsername}</strong> {comment.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {comment.updatedAt && comment.updatedAt !== comment.createdAt ? `${t('수정됨', 'Edited')} · ` : ''}
                      {displayDate(comment.createdAt)}
                    </Typography>
                  </>
                )}
              </Box>
              {isOwnComment && !isEditingComment && (
                <Stack direction="row" spacing={0.25}>
                  <Tooltip title={t('댓글 수정', 'Edit comment')}>
                    <span>
                      <IconButton aria-label={t('댓글 수정', 'Edit comment')} size="small" disabled={isMutatingComment} onClick={() => startCommentEdit(comment)}>
                        <EditOutlinedIcon fontSize="inherit" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t('댓글 삭제', 'Delete comment')}>
                    <span>
                      <IconButton
                        aria-label={t('댓글 삭제', 'Delete comment')}
                        size="small"
                        disabled={isMutatingComment}
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(comment);
                        }}
                      >
                        <DeleteOutlineIcon fontSize="inherit" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              )}
            </Box>
          );
        })}
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            placeholder={t('댓글 쓰기', 'Write a comment')}
            value={draft}
            // Not `disabled`: the browser blurs a disabled input, which would make the
            // writer click the box again after every Enter. submitComment already
            // guards against double posts; readOnly keeps the in-flight draft intact.
            slotProps={{ input: { readOnly: submitting } }}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void submitComment();
              }
            }}
          />
          <Button onClick={() => void submitComment()}>{t('게시', 'Post')}</Button>
        </Stack>
      </Stack>

      <Dialog open={Boolean(deleteTarget)} onClose={() => !mutatingCommentId && setDeleteTarget(null)}>
        <DialogTitle>{t('댓글을 삭제하시겠어요?', 'Delete this comment?')}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            {deleteError && <Alert severity="error">{deleteError}</Alert>}
            <Typography>{t('삭제한 댓글은 되돌릴 수 없습니다.', 'Deleted comments cannot be restored.')}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={Boolean(mutatingCommentId)} onClick={() => setDeleteTarget(null)}>{t('취소', 'Cancel')}</Button>
          <Button color="error" variant="contained" disabled={Boolean(mutatingCommentId)} onClick={submitCommentDelete}>
            {mutatingCommentId ? t('삭제 중…', 'Deleting…') : t('삭제', 'Delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FeedCommentThread;
