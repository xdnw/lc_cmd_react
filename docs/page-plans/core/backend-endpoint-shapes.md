# Backend Endpoint Shapes

- Status: `Cross-cutting`
- Scope: `Companion to docs/page-plans/core/backend-endpoint-gaps.md`
- Related briefs: `docs/page-plans/members/*.md`, `docs/page-plans/war/*.md`, `docs/page-plans/economy/*.md`
- Current references: `docs/page-plans/core/backend-endpoint-gaps.md`, `src/lib/endpoints.ts`, `src/lib/apitypes.d.ts`, `scripts/list-placeholders.cjs`

## Current Endpoint Constraints

- `BANK_ACCESS` has no selector args and currently returns only `access`.
- `BALANCE` currently accepts only `nation`.
- `RECORDS` currently accepts only `nation` and returns `WebTable` rather than typed transaction rows.
- `GrantRequest` and `AGrantTemplate` are not `TABLE` placeholder types today.
- `Transaction2` currently exposes only `getresource` and `getresourcevalue` through `TABLE`.

## Current Shapes

### `recruitment_timed_messages`

Needed response data:

- `message_id`
- `trigger`
- `delay_ms`
- `subject`
- `body` or `body_preview`
- `output_channel_id`
- `output_channel_name`
- `is_valid`

Example:

```json
{
  "rows": [
    {
      "message_id": "NEW_MEMBER:86400000",
      "trigger": "NEW_MEMBER",
      "delay_ms": 86400000,
      "subject": "Welcome to the alliance",
      "body": "Welcome to Cataclysm. Join Discord and say hello...",
      "output_channel_id": "98123",
      "output_channel_name": "recruit-log",
      "is_valid": true
    }
  ]
}
```

### `BANK_ACCESS` account rows

Current response is only:

```json
{
  "access": {
    "AA:9": 2
  }
}
```

Needed addition:

- keep `access` for compatibility
- add `accounts[]` with:
  - `account_id`
  - `account_kind`
  - `account_name`
  - optional scope ids such as `nation_id`, `alliance_id`, `guild_id`
  - `can_view`
  - `can_withdraw`
  - `is_default`

Example:

```json
{
  "access": {
    "nation:123": 1,
    "AA:9": 2,
    "guild:456": 2
  },
  "accounts": [
    {
      "account_id": "nation:123",
      "account_kind": "NATION",
      "account_name": "Borg",
      "nation_id": 123,
      "alliance_id": 9,
      "can_view": true,
      "can_withdraw": false,
      "is_default": true
    },
    {
      "account_id": "AA:9",
      "account_kind": "ALLIANCE",
      "account_name": "Cataclysm",
      "alliance_id": 9,
      "can_view": true,
      "can_withdraw": true,
      "is_default": false
    }
  ]
}
```

### account-scoped `BALANCE`

Needed request change:

- add an explicit account selector instead of a nation-only request
- the selector can be `account_id` or another stable scoped id; the page only needs to target non-nation accounts without overloading `nation`

Needed response additions:

- `account_id`
- `account_kind`
- `account_name`
- `available`
- `escrow`
- `expired`
- `ignored`

Example:

```json
{
  "id": 123,
  "is_aa": false,
  "total": [12500000, 0, 0],
  "include_grants": true,
  "access": {
    "AA:9": 2
  },
  "breakdown": {
    "DEPOSIT": [10000000, 0, 0],
    "GRANT": [2500000, 0, 0]
  },
  "account_id": "nation:123",
  "account_kind": "NATION",
  "account_name": "Borg",
  "available": {
    "MONEY": 10000000
  },
  "escrow": {
    "MONEY": 1000000
  },
  "expired": {
    "MONEY": 500000
  },
  "ignored": {
    "MONEY": 1000000
  }
}
```

### typed `RECORDS` JSON

Needed request changes:

- account selector instead of nation-only filtering
- time window filters
- note or category filter
- include or exclude flags for expired, ignored, and escrow rows

Needed row fields:

- `tx_id`
- `date_ms`
- `sender_id`
- `sender_name`
- `sender_type`
- `receiver_id`
- `receiver_name`
- `receiver_type`
- `banker_nation_id`
- `banker_nation_name`
- `note_raw`
- `note_category`
- `flow_type`
- `resources`
- `market_value`
- `expire_ms`
- `is_expired`
- `is_ignored`
- `is_escrow`

Example:

```json
{
  "rows": [
    {
      "tx_id": 551923,
      "date_ms": 1741776000000,
      "sender_id": 9,
      "sender_name": "Cataclysm",
      "sender_type": "ALLIANCE",
      "receiver_id": 123,
      "receiver_name": "Borg",
      "receiver_type": "NATION",
      "banker_nation_id": 777,
      "banker_nation_name": "EconLead",
      "note_raw": "#grant city",
      "note_category": "GRANT",
      "flow_type": "DEPOSIT",
      "resources": {
        "MONEY": 3000000
      },
      "market_value": 3000000,
      "expire_ms": 1744473600000,
      "is_expired": false,
      "is_ignored": false,
      "is_escrow": false
    }
  ]
}
```

### correction preview

Apply this shape to the existing correction commands rather than adding a new durable resource.

Needed response fields:

- `rows[]` with affected account or transaction context
- `before_note`
- `after_note`
- `before_resources`
- `after_resources`
- `warnings[]`
- `errors[]`
- `command`

Example:

```json
{
  "rows": [
    {
      "account_id": "nation:123",
      "account_name": "Borg",
      "before_note": "GRANT",
      "after_note": "DEPOSIT",
      "before_resources": {
        "MONEY": 3000000
      },
      "after_resources": {
        "MONEY": 3000000
      }
    }
  ],
  "warnings": [
    {
      "code": "EXPIRE_TIME_REMOVED",
      "message": "Expiry will be cleared"
    }
  ],
  "errors": [],
  "command": "deposits shift nation=123 from=GRANT to=DEPOSIT"
}
```

### `grant_requests`

Needed request support:

- basic queue filters such as `status`, `requester`, or `grant_type` only if the queue is too large to filter client-side

Needed row fields:

- `request_id`
- `status`
- `created_ms`
- `requester_id`
- `requester_name`
- `receiver_kind`
- `receiver_id`
- `receiver_name`
- `grant_type`
- `estimated_amounts`
- `reason_preview`
- `blocking_flags`

Example:

```json
{
  "rows": [
    {
      "request_id": 901,
      "status": "OPEN",
      "created_ms": 1741850000000,
      "requester_id": 123,
      "requester_name": "Borg",
      "receiver_kind": "NATION",
      "receiver_id": "123",
      "receiver_name": "Borg",
      "grant_type": "CITY",
      "estimated_amounts": {
        "MONEY": 12000000
      },
      "reason_preview": "City 11 grant",
      "blocking_flags": [
        "LOW_FUNDS"
      ]
    }
  ]
}
```

### `war counter sheet` JSON output

Needed row fields:

- `group_id`
- `enemy_id`
- `enemy_name`
- `attacker_id`
- `attacker_name`
- `fit_score`
- `warnings`

Example:

```json
{
  "rows": [
    {
      "group_id": 1,
      "enemy_id": 900,
      "enemy_name": "Target",
      "attacker_id": 101,
      "attacker_name": "Counter A",
      "fit_score": 87,
      "warnings": []
    }
  ],
  "warnings": [],
  "errors": [],
  "command": "war counter sheet enemyFilter=~enemies,#cities>10 allies=%guild_alliances%"
}
```

### `war room create` and `war room from_sheet` preview

Needed row fields:

- `source_row` for batch flows
- `room_name`
- `enemy_id`
- `enemy_name`
- `attacker_ids`
- `attacker_names`
- `category_id`
- `category_name`
- `warnings`

Example:

```json
{
  "rows": [
    {
      "source_row": 7,
      "room_name": "counter-target",
      "enemy_id": 900,
      "enemy_name": "Target",
      "attacker_ids": [101, 102, 103],
      "attacker_names": ["Counter A", "Counter B", "Counter C"],
      "category_id": "12",
      "category_name": "Counter Rooms",
      "warnings": []
    }
  ],
  "warnings": [],
  "errors": [],
  "command": "war room create enemy=900 attackers=101,102,103"
}
```

### `war sheet` JSON outputs

Current page needs structured output on existing commands rather than a new endpoint family.

Needed outputs:

- `war sheet validate`: `sheet_row`, `attacker_name`, `defender_name`, `status`, `message`
- `war sheet blitzsheet` and `war sheet raid`: assignment rows with attacker, defender, slot or grouping info, and warnings
- `war sheet costsheet`, `war sheet costbyresource`, and `war sheet reimbursebynation`: typed cost or reimbursement rows only for the tabs the page actually renders

Example validation output:

```json
{
  "rows": [
    {
      "sheet_row": 7,
      "attacker_name": "Borg",
      "defender_name": "Target",
      "status": "WARNING",
      "message": "Attacker already has 5 offensives"
    }
  ],
  "warnings": [],
  "errors": [],
  "command": "war sheet validate sheet=https://docs.google.com/spreadsheets/d/example"
}
```

### `tax_automation_preview`

Needed row fields:

- `nation_id`
- `nation_name`
- `current_bracket`
- `target_bracket`
- `reason`
- `warnings`

Example:

```json
{
  "rows": [
    {
      "nation_id": 123,
      "nation_name": "Borg",
      "current_bracket": "C10 70/70",
      "target_bracket": "C11 75/75",
      "reason": "Required bracket rule matched",
      "warnings": []
    }
  ],
  "warnings": [],
  "errors": [],
  "command": "tax setnationbracketauto nations=123"
}
```

## `TABLE` Facts That Still Matter

- `Transaction2` is still too thin to power ledger tables on its own. If any ledger or deposits view stays table-backed, the missing fields are transaction id, date, sender and receiver identity, note/category, market value, and expiry or escrow flags.
- `TaxDeposit` already has id, date, nation, alliance, rates, resources, and market value. If Tax record tables need more, the missing fields are note/category, expiry, and account-scope markers.
- `TaxBracket` already has id, name, alliance, rates, nation list, and sheet URL. It does not yet cover internal rates or automation reasoning.
- `GuildSetting` already covers settings reads well enough that the current page plans should not invent settings-summary endpoints.
- `DBNation` already covers a large amount of member, tax, and war context; add stable row facts there before inventing new endpoints for simple tables.
