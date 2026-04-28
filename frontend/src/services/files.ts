import type { VaultAttachment } from '../types';

const MAX_TOTAL_SIZE_MB = 8;

export const readFileAsAttachment = (file: File): Promise<VaultAttachment> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve({
        filename: file.name,
        mimetype: file.type || 'application/octet-stream',
        data: base64,
        size: file.size,
      });
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

export const checkAttachmentSize = (attachments: VaultAttachment[]): string | null => {
  const total = attachments.reduce((sum, a) => sum + a.size, 0);
  const max = MAX_TOTAL_SIZE_MB * 1024 * 1024;
  if (total > max) {
    return `Total attachment size ${formatBytes(total)} exceeds ${MAX_TOTAL_SIZE_MB} MB limit`;
  }
  return null;
};

export const downloadAttachment = (attachment: VaultAttachment) => {
  const bin = atob(attachment.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: attachment.mimetype });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = attachment.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const isImage = (mimetype: string) => mimetype.startsWith('image/');

export const makePreviewDataUrl = (attachment: VaultAttachment) =>
  `data:${attachment.mimetype};base64,${attachment.data}`;
