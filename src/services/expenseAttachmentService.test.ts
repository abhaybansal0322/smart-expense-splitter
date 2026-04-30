import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExpenseImageUpload } from './expenseAttachmentService';

test('validateExpenseImageUpload allows supported image files up to 5MB', () => {
  assert.doesNotThrow(() => {
    validateExpenseImageUpload({
      name: 'receipt.webp',
      type: 'image/webp',
      size: 5 * 1024 * 1024,
    });
  });
});

test('validateExpenseImageUpload rejects non-images and oversized files', () => {
  assert.throws(
    () => validateExpenseImageUpload({ name: 'song.mp3', type: 'audio/mpeg', size: 1024 }),
    /Only JPG, PNG, and WEBP images are supported/
  );

  assert.throws(
    () => validateExpenseImageUpload({ name: 'huge.png', type: 'image/png', size: 5 * 1024 * 1024 + 1 }),
    /Image must be 5MB or smaller/
  );
});
