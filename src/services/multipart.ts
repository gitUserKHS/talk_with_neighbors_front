export const buildChatMessageFormData = (
  content: string | null | undefined,
  files: readonly File[]
): FormData => {
  const formData = new FormData();
  formData.append(
    'message',
    new Blob([JSON.stringify({ content: content ?? '' })], {
      type: 'application/json',
    })
  );
  files.forEach((file) => formData.append('files', file));
  return formData;
};
