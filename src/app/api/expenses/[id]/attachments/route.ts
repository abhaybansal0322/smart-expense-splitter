import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { saveExpenseImageAttachment } from '@/services/expenseAttachmentService';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

type Params = { params: Promise<{ id: string }> };

interface ExpenseAccessRow {
  group_id: string;
  is_member: boolean;
}

export async function POST(req: NextRequest, { params }: Params) {
  const request_id = crypto.randomUUID();
  const { id } = await params;

  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { rows } = await query<ExpenseAccessRow>(
      `SELECT e.group_id,
              CASE WHEN gm.user_id IS NOT NULL THEN true ELSE false END AS is_member
       FROM expenses e
       LEFT JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = $2 AND gm.status = 'accepted'
       WHERE e.id = $1 AND e.deleted_at IS NULL`,
      [id, session.user.id]
    );

    if (rows.length === 0) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    if (!rows[0].is_member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
