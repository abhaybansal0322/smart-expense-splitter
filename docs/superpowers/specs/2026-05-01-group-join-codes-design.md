# Group Join Codes And Google Auth Design

## Goal

Allow a user to create a group without inviting anyone by email, receive a unique code for that group, and let another authenticated user join the group by entering that code. Also expose Google sign-in and sign-up clearly in the auth screens.

## Current State

The app uses Next.js App Router, NextAuth, and Postgres. Group membership is stored in `group_members` with `pending` and `accepted` statuses. Email invitations currently require invited users to already exist and `POST /api/groups` requires at least one email. Google provider support already exists in `src/lib/auth.ts`, and login already has a Google button, but signup does not.

## Data Model

Add `join_code` to `groups`.

- Type: short uppercase text code.
- Constraint: unique and not null.
- Existing groups get backfilled with generated codes.
- New groups get a code at creation time.
- Codes are stable for each group. Regeneration/rotation is out of scope.

## Group Creation

`memberEmails` becomes optional and may be an empty array. The creator is always added as an accepted member. If emails are provided, the existing pending-invitation behavior remains unchanged: invited emails must map to existing users and become pending members.

The group creation response returns both `groupId` and `joinCode`.

## Join By Code

Add `POST /api/groups/join`.

Request:

```json
{ "code": "ABC123" }
```

Behavior:

- Requires an authenticated session.
- Normalizes the code by trimming, uppercasing, and removing internal whitespace/hyphens for forgiving entry.
- Looks up the group by `join_code`.
- Returns `404` when the code does not match a group.
- Returns `409` if the user is already an accepted member.
- Updates a pending invitation to `accepted` if one exists for the current user and group.
- Inserts a new accepted membership if no membership exists.
- Returns the joined `groupId`.

## UI

The create group modal will no longer require invited emails. It will explain that invites are optional and show the generated group code after successful creation. The user can copy the code and continue into the group.

The groups page will add a "Join with code" action. The join modal accepts a code, calls `POST /api/groups/join`, shows errors inline/toast, and navigates to the joined group on success.

## Google Auth

Keep using NextAuth's existing Google provider. The login page keeps "Sign in with Google"; the signup page adds "Sign up with Google", which calls the same provider with `callbackUrl: '/'`. Existing callback logic creates a local `users` row for Google accounts that do not already exist.

The app still requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXTAUTH_SECRET` in `.env.local` for Google OAuth to work.

## Testing

Add service-level tests for code generation and joining:

- New group creation returns a code and allows zero invite emails.
- Generated codes are unique across groups.
- Joining by code inserts an accepted membership.
- Joining by code accepts a pending invitation.
- Joining by an invalid code returns no group to join.
- Joining a group the user already belongs to reports a duplicate membership.

Add route-level or direct service coverage where practical without over-mocking NextAuth internals. Run the existing test script, lint, and build after implementation.

## Out Of Scope

- Sending actual Gmail messages.
- Join-code expiration or regeneration.
- Owner-only controls for code visibility.
- Public unauthenticated join links.
