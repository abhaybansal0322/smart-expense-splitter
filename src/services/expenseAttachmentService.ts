import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from '@/db/client';
import { expenseAttachments } from '@/db/schema';
import { ExpenseAttachment } from '@/lib/types';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface UploadLike {
  name: string;
  type: string;
  size: number;
}

export function validateExpenseImageUpload(file: UploadLike): void {
  if (!IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error('Only JPG, PNG, and WEBP images are supported');
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image must be 5MB or smaller');
  }
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '';
}

export async function saveExpenseImageAttachment(params: {
  expenseId: string;
  uploadedBy: string;
  file: File;
}): Promise<ExpenseAttachment> {
  validateExpenseImageUpload(params.file);

  const bytes = Buffer.from(await params.file.arrayBuffer());
  const relativeDir = `/uploads/expenses/${params.expenseId}`;
  const diskDir = path.join(process.cwd(), 'public', 'uploads', 'expenses', params.expenseId);
  await mkdir(diskDir, { recursive: true });

  const filename = `${crypto.randomUUID()}${extensionForMimeType(params.file.type)}`;
  const diskPath = path.join(diskDir, filename);
  const fileUrl = `${relativeDir}/${filename}`;

  await writeFile(diskPath, bytes);

  const [newAttachment] = await db.insert(expenseAttachments).values({
    expenseId: params.expenseId,
    fileUrl,
    originalName: params.file.name,
    mimeType: params.file.type,
    sizeBytes: params.file.size,
    uploadedBy: params.uploadedBy
  }).returning();

  return {
    id: newAttachment.id,
    expense_id: newAttachment.expenseId,
    file_url: newAttachment.fileUrl,
    original_name: newAttachment.originalName,
    mime_type: newAttachment.mimeType,
    size_bytes: newAttachment.sizeBytes,
    uploaded_by: newAttachment.uploadedBy,
    created_at: newAttachment.createdAt.toISOString()
  };
}
