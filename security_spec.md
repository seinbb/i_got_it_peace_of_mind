# Security Specification - Maum-swim (마음쉼)

This specification defines the security invariants and testing protocols for the Cloud Firestore database used in the Maum-swim (마음쉼) Teenager Emotional Support AI Diary application.

## 1. Data Invariants

For the `/diaries/{diaryId}` collection:
*   **Path Variable Security**: `{diaryId}` must be a valid alphanumeric string with a maximum length of 128 characters.
*   **Owner Isolation**: No authenticated or unauthenticated user can read, list, create, update, or delete any diary entry where `userId != request.auth.uid`.
*   **Volumetric Limits**:
    *   `content` must be a string with a size <= 10,000 characters.
    *   `reflection_answer` must be a string with a size <= 5,000 characters.
*   **Immutability**:
    *   `userId` is immutable once created.
    *   `id` is immutable once created.
    *   `createdAt` is immutable once created.
*   **Verified Accounts**: Users must be authenticated with an email-verified account (`request.auth.token.email_verified == true`).

---

## 2. The "Dirty Dozen" Payloads

The following 12 attack payloads are designed to bypass security. All must be rejected with `PERMISSION_DENIED`.

### Scenario 1: Identity Spoofing (Create other's diary)
An authenticated attacker tries to write a diary entry claiming to belong to a victim.
```json
{
  "id": "1784072337062",
  "userId": "victim_uid_abc123",
  "date": "2026년 7월 16일 (목)",
  "time": "오후 7:56",
  "content": "Malicious payload writing into victim's account.",
  "createdAt": "2026-07-16T19:56:34.000Z"
}
```

### Scenario 2: Path ID Mismatch (ID Injection)
An attacker specifies `diaryId = "diary_999"` but puts `"id": "diary_111"` in the payload body.
```json
{
  "id": "diary_111",
  "userId": "attacker_uid",
  "date": "2026년 7월 16일 (목)",
  "time": "오후 7:56",
  "content": "ID Mismatch attack.",
  "createdAt": "2026-07-16T19:56:34.000Z"
}
```

### Scenario 3: Deny-of-Wallet Long ID Attack
An attacker attempts to write a document with a 2MB generated ID string to exhaust storage and billing.
```json
// Path: /diaries/A_very_long_generated_string_exceeding_128_characters_...
{
  "id": "A_very_long_generated_string_exceeding_128_characters_...",
  "userId": "attacker_uid",
  "content": "Valid content size but massive ID.",
  "createdAt": "2026-07-16T19:56:34.000Z"
}
```

### Scenario 4: Content Size Flooding
An attacker sends a `content` string containing 200,000 characters to crash rendering or inflate db size.
```json
{
  "id": "1784072337062",
  "userId": "attacker_uid",
  "content": "<200,000 characters repeating...>",
  "createdAt": "2026-07-16T19:56:34.000Z"
}
```

### Scenario 5: Shadow Update (Ghost Field Injection)
An attacker attempts to update a diary entry and injects a "isVerified" or "isAdmin" system-like ghost field.
```json
{
  "id": "1784072337062",
  "userId": "attacker_uid",
  "content": "Updated content.",
  "isVerifiedAdmin": true,
  "createdAt": "2026-07-16T19:56:34.000Z"
}
```

### Scenario 6: Unverified Email Write
A user who registered but did not verify their email attempts to create a diary entry.
```json
// request.auth.token.email_verified == false
{
  "id": "1784072337062",
  "userId": "unverified_uid",
  "content": "Trying to write.",
  "createdAt": "2026-07-16T19:56:34.000Z"
}
```

### Scenario 7: Identity Hijacking (Update Owner ID)
An attacker updates their own diary entry but changes `userId` to a victim's ID to transfer ownership or orphan records.
```json
{
  "id": "1784072337062",
  "userId": "victim_uid",
  "content": "Hijacked entry content.",
  "createdAt": "2026-07-16T19:56:34.000Z"
}
```

### Scenario 8: Creation Time Tampering (Backdating)
An attacker attempts to update the immutable `createdAt` field on an existing document.
```json
{
  "id": "1784072337062",
  "userId": "attacker_uid",
  "content": "Some content.",
  "createdAt": "2000-01-01T00:00:00.000Z" // Changed from original
}
```

### Scenario 9: Blanket Query Scraping
An authenticated user attempts to execute a collection group query or list query on `/diaries` without restricting the filter to their own `userId`.
```ts
// Query: getDocs(collection(db, "diaries"))
// Should be blocked unless user specifies query(collection(db, "diaries"), where("userId", "==", currentUserId))
```

### Scenario 10: Reflection Answer Flooding
An attacker submits a reflection answer containing 100,000 characters.
```json
{
  "reflection_answer": "<100,000 character string...>"
}
```

### Scenario 11: Unauthenticated Read Attempt
An unauthenticated user tries to fetch a diary entry.
```ts
// request.auth == null
// getDoc(doc(db, "diaries", "some_id")) -> Denied
```

### Scenario 12: Anonymous User Write
An anonymous user trying to write.
```json
// request.auth.provider == 'anonymous' or token.email_verified is undefined
{
  "id": "1784072337062",
  "userId": "anonymous_uid",
  "content": "Anonymous entry write attempt.",
  "createdAt": "2026-07-16T19:56:34.000Z"
}
```

---

## 3. The Test Runner Structure

A conceptual test runner (`firestore.rules.test.ts`) that asserts correctness across these scenarios:

```typescript
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { setDoc, getDoc, doc, collection, getDocs, query, where } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'remixed-project-id',
    firestore: {
      rules: require('fs').readFileSync('firestore.rules', 'utf8')
    }
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

test('Scenario 1: Reject identity spoofing', async () => {
  const attackerDb = testEnv.authenticatedContext('attacker_uid', { email_verified: true }).firestore();
  await assertFails(
    setDoc(doc(attackerDb, 'diaries', 'diary123'), {
      id: 'diary123',
      userId: 'victim_uid',
      content: 'Hello',
      createdAt: new Date().toISOString()
    })
  );
});
```
