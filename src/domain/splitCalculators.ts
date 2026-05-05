// ─────────────── Split Calculators ───────────────
// Pure functions that compute how an expense is divided among participants.
// No I/O, no database access, no side effects.
// All functions are deterministic: same input → same output.

import { SplitInput } from './types';

/**
 * Split an amount equally among participants, distributing remainder to the first participant.
 */
export function computeEqualSplit(
  amount: number,
  participants: string[]
): Record<string, number> {
  const count = participants.length;
  const base = Math.floor((amount * 100) / count) / 100;
  const remainder = parseFloat((amount - base * count).toFixed(2));
  const shares: Record<string, number> = {};
  participants.forEach((uid, i) => {
    shares[uid] = i === 0 ? parseFloat((base + remainder).toFixed(2)) : base;
  });
  return shares;
}

/**
 * Validate and return exact amounts specified by the user.
 */
export function computeExactSplit(
  amount: number,
  exactAmounts: Record<string, number>
): Record<string, number> {
  const total = Object.values(exactAmounts).reduce((s, v) => s + v, 0);
  if (Math.abs(total - amount) > 0.01) {
    throw new Error(
      `Exact amounts (${total}) do not sum to expense amount (${amount})`
    );
  }
  return exactAmounts;
}

/**
 * Split by percentage, ensuring the last participant absorbs rounding error.
 */
export function computePercentageSplit(
  amount: number,
  percentages: Record<string, number>
): Record<string, number> {
  const total = Object.values(percentages).reduce((s, v) => s + v, 0);
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(`Percentages must sum to 100, got ${total}`);
  }
  const shares: Record<string, number> = {};
  const uids = Object.keys(percentages);
  let allocated = 0;
  uids.forEach((uid, i) => {
    if (i === uids.length - 1) {
      shares[uid] = parseFloat((amount - allocated).toFixed(2));
    } else {
      const s = parseFloat(((amount * percentages[uid]) / 100).toFixed(2));
      shares[uid] = s;
      allocated += s;
    }
  });
  return shares;
}

/**
 * Split equally but exclude certain users from the split.
 */
export function computeExcludeSplit(
  amount: number,
  participants: string[],
  excludedUsers: string[]
): Record<string, number> {
  const included = participants.filter((uid) => !excludedUsers.includes(uid));
  if (included.length === 0) {
    throw new Error('All participants are excluded — cannot split expense');
  }
  return computeEqualSplit(amount, included);
}

/**
 * Split with individual adjustments (e.g. drinks surcharge) before equal split of remainder.
 */
export function computeAdjustmentSplit(
  amount: number,
  participants: string[],
  adjustments: Record<string, number>
): Record<string, number> {
  const totalAdjustments = Object.values(adjustments).reduce((s, v) => s + v, 0);
  if (totalAdjustments > amount) {
    throw new Error(`Total adjustments (${totalAdjustments}) cannot exceed total amount (${amount})`);
  }
  const remainingAmount = parseFloat((amount - totalAdjustments).toFixed(2));

  // The remaining amount is split equally among participants
  const equalShares = computeEqualSplit(remainingAmount, participants);

  const shares: Record<string, number> = {};
  participants.forEach(uid => {
    shares[uid] = parseFloat(((equalShares[uid] || 0) + (adjustments[uid] || 0)).toFixed(2));
  });
  return shares;
}

/**
 * Master dispatcher: given a split configuration, computes the final shares and validates
 * that they sum to the expense amount (the "Ledger Rule").
 */
export function computeSplits(input: SplitInput): Record<string, number> {
  const { amount, split_type, participants, exact_amounts, percentages, excluded_users, adjustments } = input;

  let shares: Record<string, number>;
  switch (split_type) {
    case 'equal':
      shares = computeEqualSplit(amount, participants);
      break;
    case 'exact':
      if (!exact_amounts) throw new Error('exact_amounts required for split_type=exact');
      shares = computeExactSplit(amount, exact_amounts);
      break;
    case 'percentage':
      if (!percentages) throw new Error('percentages required for split_type=percentage');
      shares = computePercentageSplit(amount, percentages);
      break;
    case 'exclude':
      shares = computeExcludeSplit(amount, participants, excluded_users ?? []);
      break;
    case 'adjustment':
      if (!adjustments) throw new Error('adjustments required for split_type=adjustment');
      shares = computeAdjustmentSplit(amount, participants, adjustments);
      break;
    default:
      throw new Error(`Unknown split_type: ${split_type}`);
  }

  // Ledger rule: SUM(splits) == expense.amount
  // Using integer math (cents) to avoid floating point precision issues
  const totalCents = Object.values(shares).reduce((sum, val) => sum + Math.round(val * 100), 0);
  const amountCents = Math.round(amount * 100);

  if (totalCents !== amountCents) {
    throw new Error(`Ledger mismatch: Splits sum (${totalCents / 100}) does not match expense amount (${amountCents / 100})`);
  }

  return shares;
}
