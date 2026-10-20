# Test Plan — Rental System (Sprint 1)

## 1. Scope
MVP core: Auth (JWT), Rental CRUD + Components, Scheduler (reminders + expired check), In-app + Telegram notifications, Dashboard/List/Calendar/Export UI.

## 2. Test Levels & Tools

| Level | Tool | Target | Coverage Gate |
|-------|------|--------|---------------|
| Unit (backend) | pytest + pytest-asyncio + httpx | Models, services, utils | >80% |
| Integration (API) | pytest + httpx (async client) | All endpoints, auth, permissions | 100% endpoints |
| Contract | schemathesis | OpenAPI 3.1 spec vs implementation | 0 failures |
| E2E | Playwright (TS) | Chromium, Firefox, WebKit | 0 flaky |
| Load (smoke) | locust | 10 concurrent rental creates | <2s p95 |

## 3. Backend Unit/Integration Matrix

### Auth (`/api/v1/auth`)
| Case | Method | Expected |
|------|--------|----------|
| Register new user | POST /register | 201, user created, hashed password |
| Login valid credentials | POST /login | 200, access+refresh tokens |
| Login invalid password | POST /login | 401 |
| Refresh valid token | POST /refresh | 200, new access token |
| Refresh expired token | POST /refresh | 401 |
| /me with valid token | GET /me | 200, user data |
| /me with expired token | GET /me | 401 |

### Computers (`/api/v1/computers`)
| Case | Method | Expected |
|------|--------|----------|
| Create computer | POST / | 201, spec_json stored |
| List with pagination | GET / | 200, paginated |
| Get by ID | GET /{id} | 200 / 404 |
| Update | PUT /{id} | 200 |
| Delete (soft) | DELETE /{id} | 204, is_deleted=true |

### Components (`/api/v1/components`)
| Case | Method | Expected |
|------|--------|----------|
| Create component | POST / | 201 |
| List with filter | GET / | 200 |
| Stock validation | - | qty >= 0 enforced |

### Rentals (`/api/v1/rentals`)
| Case | Method | Expected |
|------|--------|----------|
| Create rental + components[] | POST / | 201, nested rows, total calculated, computer availability=false |
| Create: overlap same computer | POST / | 409 Conflict |
| Create: component qty > stock | POST / | 400 |
| Create: past end_date | POST / | 400 |
| Create: negative price | POST / | 400 |
| List with filters | GET / | 200, status/date_range/customer filters |
| Get by ID | GET /{id} | 200 with components |
| Start rental | POST /{id}/start | 200, status=active |
| Complete rental | POST /{id}/complete | 200, status=completed, computer available=true |
| Cancel rental | POST /{id}/cancel | 200, status=cancelled, computer available=true |

### Reminders (`/api/v1/reminders`)
| Case | Method | Expected |
|------|--------|----------|
| Pending reminders | GET /pending | 200, T-7/T-3/T-1/T+0 due |
| Mark sent | POST /{id}/sent | 200, sent_at set |

### Notifications (`/api/v1/notifications`)
| Case | Method | Expected |
|------|--------|----------|
| List unread | GET /?unread=true | 200, only unread |
| Mark read | POST /{id}/read | 200, read_at set |
| Unread count | GET /unread-count | 200, count |

## 4. Scheduler Jobs (APScheduler)

| Job | Trigger | Verification |
|-----|---------|--------------|
| Daily 08:00 (Asia/Jakarta) | Cron | Creates in-app notifs + Telegram for T-7/T-3/T-1/T+0; marks overdue rentals |
| Hourly reminder check | Interval | Processes pending reminders, idempotent (sent_at guard) |

**Test approach**: Use `freezegun` to control time; trigger job manually; assert side effects (DB rows, Telegram mock calls).

## 5. Telegram Integration
- Unit: Mock `httpx.AsyncClient.post` → assert `sendMessage` payload
- Integration: Optional test bot token in CI (secrets.TELEGRAM_BOT_TOKEN)

## 6. E2E Scenarios (Playwright)

### Smoke Flow (QA-2)
```
1. Login (admin@test.com / password)
2. Dashboard → verify summary cards load
3. Create Rental (multi-step wizard):
   - Customer: "Test Customer"
   - Computer: "PC-001" (available)
   - Components: Monitor x1, Keyboard x1 (qty, price/day)
   - Duration: 7 days
   - Summary → Submit
4. Verify success toast → redirected to list
5. List → verify rental appears with correct status
6. Calendar (month view) → verify color-coded event
7. Click event → detail modal matches API data
8. Notification bell → badge count > 0
9. Mark notification read → badge decrements
10. Export CSV → file downloads, headers correct
11. Logout → redirect to login
```

### Edge Cases
- Overlap attempt → inline error on step 2
- Component qty > stock → inline error on step 3
- Past end_date → validation error
- Empty list export → CSV with headers only
- Calendar week view → drag-resize not allowed (MVP)

### Cross-browser
- Chromium (primary)
- Firefox
- WebKit

## 7. Frontend Unit/Component (Vitest)
- Auth store: token persistence, refresh logic
- Rental wizard: step validation, component qty input
- Calendar: event rendering, color mapping
- Export: CSV blob generation, UTF-8 BOM

## 8. CI Gates (`.github/workflows/ci.yml`)
```yaml
jobs:
  lint-and-test-backend:
    # pytest --cov=app --cov-fail-under=80
  lint-and-test-frontend:
    # npm run lint, typecheck, test --coverage
  e2e-tests:
    # playwright test (needs backend+frontend up)
  contract-tests:
    # schemathesis run openapi.json
  docker-build:
    # docker build + compose config
```

## 9. Test Data & Fixtures
- `backend/tests/conftest.py`: async client, auth headers, sample computer/component/rental factories
- `backend/seed.py`: idempotent dev seed (admin user, 3 computers, 5 components, 3 rentals)
- Playwright: `test-use` fixtures for login, cleanup via API

## 10. Bug Report Template
```markdown
## Bug: [Short title]
**Severity**: Critical / High / Medium / Low
**Environment**: local / staging / prod
**Steps to Reproduce**:
1.
2.
3.
**Expected**:
**Actual**:
**Evidence**: screenshot / video / logs / curl
**API Request/Response** (if applicable):
```
POST /api/v1/rentals
{...}
```
**Related**: #issue
```

## 11. Definition of Done (Sprint 1)
- [ ] All unit tests pass (>80% coverage)
- [ ] All integration tests pass
- [ ] Contract tests: 0 failures
- [ ] E2E smoke passes on 3 browsers
- [ ] Load smoke: 10 concurrent creates <2s p95
- [ ] CI pipeline green on PR
- [ ] No known Critical/High bugs
