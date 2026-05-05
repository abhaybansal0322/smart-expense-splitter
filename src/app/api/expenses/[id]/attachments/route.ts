import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { ExpenseRepository } from '@/db/repositories/ExpenseRepository';
import { GroupRepository } from '@/db/repositories/GroupRepository';
import { saveExpenseImageAttachment } from '@/services/expenseAttachmentService';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const request_id = crypto.randomUUID();
  const { id } = await params;

  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const expense = await ExpenseRepository.findById(id);
    if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

    const isMember = await GroupRepository.isUserInGroup(expense.groupId, session.user.id);
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const form = await req.formData();
    const files = form.getAll('images').filter((value): value is File => value instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: 'No images uploaded' }, { status: 400 });
    }
    if (files.length > 4) {
      return NextResponse.json({ error: 'Upload up to 4 images per expense' }, { status: 400 });
    }

    const attachments = [];
    for (const file of files) {
      attachments.push(await saveExpenseImageAttachment({ expenseId: id, uploadedBy: session.user.id, file }));
    }

    return NextResponse.json({ attachments }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload images';
    logger.error('POST /api/expenses/[id]/attachments error', { request_id, expense_id: id }, error);
    if (message.includes('Only JPG') || message.includes('5MB')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 });
  }
}
