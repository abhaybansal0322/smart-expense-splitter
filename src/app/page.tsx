'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SplitkaroLogo } from '@/components/SplitkaroLogo';

const people = [
  { name: 'Aarav', color: '#28d989' },
  { name: 'Nisha', color: '#ff8a5b' },
  { name: 'Rohan', color: '#5fa8ff' },
  { name: 'Meera', color: '#f5cf55' },
];

const billTemplates = [
  { title: 'Cafe run', amount: 1860, paidBy: 'Nisha', note: '4 friends, snacks, coffee' },
  { title: 'Goa stay', amount: 12400, paidBy: 'Aarav', note: '2 rooms, shared weekend' },
  { title: 'Movie night', amount: 2680, paidBy: 'Meera', note: 'Tickets, popcorn, cab' },
];

const flowOffsets = [18, 38, 59, 80];

export default function LandingPage() {
  const [activeBill, setActiveBill] = useState(0);
  const [tipPercent, setTipPercent] = useState(8);
  const [mode, setMode] = useState<'equal' | 'smart'>('equal');
  const [settled, setSettled] = useState<string[]>(['Rohan']);

  const bill = billTemplates[activeBill];
  const total = Math.round(bill.amount * (1 + tipPercent / 100));
  const perPerson = Math.round(total / people.length);
  const smartSplit = [0.35, 0.25, 0.2, 0.2].map((ratio) => Math.round(total * ratio));

  const rows = people.map((person, index) => ({
    ...person,
    amount: mode === 'equal' ? perPerson : smartSplit[index],
    settled: settled.includes(person.name),
  }));

  const toggleSettled = (name: string) => {
    setSettled((current) => (
      current.includes(name)
        ? current.filter((person) => person !== name)
        : [...current, name]
    ));
  };

  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Landing navigation">
        <SplitkaroLogo href="/" size="md" />
        <div className="landing-nav-actions">
          <Link href="/login" className="landing-link">Login</Link>
          <Link href="/signup" className="landing-button landing-button-small">Start splitting</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-copy">
          <h1>Split bills before the group chat explodes.</h1>
          <p>
            splitkaro turns messy shared expenses into clean balances, quick settlements,
            and group codes your friends can join in seconds.
          </p>
          <div className="hero-actions">
            <Link href="/signup" className="landing-button">Start splitting</Link>
            <Link href="/login" className="landing-button landing-button-ghost">Login</Link>
          </div>
          <div className="hero-proof" aria-label="Product highlights">
            <span>Live balances</span>
            <span>Join codes</span>
            <span>Settlement tracking</span>
          </div>
        </div>

        <div className="split-lab" aria-label="Interactive bill split preview">
          <div className="split-lab-header">
            <div>
              <span>Live split lab</span>
              <strong>{bill.title}</strong>
            </div>
            <button className="mode-toggle" onClick={() => setMode(mode === 'equal' ? 'smart' : 'equal')}>
              {mode === 'equal' ? 'Equal split' : 'Smart split'}
            </button>
          </div>

          <div className="bill-stage">
            <div className="bill-card-main">
              <span className="bill-label">Paid by {bill.paidBy}</span>
              <strong>Rs {total.toLocaleString('en-IN')}</strong>
              <p>{bill.note}</p>
              <div className="tip-control">
                <label htmlFor="tip">Tip {tipPercent}%</label>
                <input
                  id="tip"
                  type="range"
                  min="0"
                  max="20"
                  value={tipPercent}
                  onChange={(event) => setTipPercent(Number(event.target.value))}
                />
              </div>
            </div>

            <div className="flow-field" aria-hidden="true">
              {flowOffsets.map((offset, index) => (
                <span
                  key={offset}
                  className={`flow-line flow-line-${index + 1}`}
                  style={{ top: `${offset}%` }}
                />
              ))}
            </div>

            <div className="people-stack">
              {rows.map((row) => (
                <button
                  type="button"
                  key={row.name}
                  className={`person-row ${row.settled ? 'person-row-settled' : ''}`}
                  onClick={() => toggleSettled(row.name)}
                >
                  <span className="person-avatar" style={{ backgroundColor: row.color }}>
                    {row.name[0]}
                  </span>
                  <span>
                    <strong>{row.name}</strong>
                    <small>{row.settled ? 'Settled' : 'Owes now'}</small>
                  </span>
                  <b>Rs {row.amount.toLocaleString('en-IN')}</b>
                </button>
              ))}
            </div>
          </div>

          <div className="bill-tabs" role="tablist" aria-label="Choose sample expense">
            {billTemplates.map((template, index) => (
              <button
                key={template.title}
                type="button"
                className={activeBill === index ? 'active' : ''}
                onClick={() => setActiveBill(index)}
              >
                {template.title}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-strip" aria-label="How splitkaro works">
        <div>
          <span className="strip-number">01</span>
          <h2>Create a group</h2>
          <p>Name the trip, flat, office lunch, or weekend plan.</p>
        </div>
        <div>
          <span className="strip-number">02</span>
          <h2>Add expenses</h2>
          <p>Track who paid, who joined, and how each bill should split.</p>
        </div>
        <div>
          <span className="strip-number">03</span>
          <h2>Settle cleanly</h2>
          <p>See exactly who owes what and close the loop without drama.</p>
        </div>
      </section>

      <section className="landing-feature-band">
        <div className="feature-copy">
          <h2>Built for real friend groups, not perfect spreadsheets.</h2>
          <p>
            Use join codes for fast onboarding, activity history for memory,
            and balance summaries that stay readable even when the group gets busy.
          </p>
        </div>
        <div className="feature-grid">
          <div>
            <strong>Group codes</strong>
            <span>Invite friends without sending long links.</span>
          </div>
          <div>
            <strong>Fair balances</strong>
            <span>Equal and custom splits stay easy to scan.</span>
          </div>
          <div>
            <strong>Settlements</strong>
            <span>Mark repayments and keep the group honest.</span>
          </div>
          <div>
            <strong>History</strong>
            <span>Every bill and settlement has a clear trail.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
