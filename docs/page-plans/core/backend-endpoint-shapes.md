# Backend Endpoint Shapes

- Status: `Cross-cutting`
- Scope: `Companion to docs/page-plans/core/backend-endpoint-gaps.md`
- Related briefs: `docs/page-plans/members/*.md`, `docs/page-plans/war/*.md`, `docs/page-plans/economy/*.md`
- Current references: `docs/page-plans/core/backend-endpoint-gaps.md`, `src/lib/endpoints.ts`, `src/lib/apitypes.d.ts`, `src/lib/commands.ts`, `scripts/list-placeholder-types.cjs`, `scripts/list-placeholders.cjs`, `scripts/list-commands.cjs`

## Why It Exists

- `backend-endpoint-gaps.md` says what backend work is still missing.
- This document says what those missing reads or previews should look like when they become JSON.
- It also separates work that should stay command-backed or TABLE-backed from work that genuinely needs a native read model.
- The names and shapes here are guidance, not locked public contracts.

## Design Rules

- Keep existing route foundations additive. `BALANCE`, `BANK_ACCESS`, `RAID`, `UNPROTECTED`, and `RECORDS` should not lose their current fields or current consumers.
- When the frontend needs preflight data for an existing command, prefer a dry-run or JSON mode on that command instead of a brand new durable resource endpoint.
- `WebTable` is intentionally small: `cells`, `renderers`, and optional `errors`. Use TABLE for row-level supporting context, not queue state, preview diffs, or multi-panel summary models.
- Use epoch milliseconds for times. Existing site payloads already use ms fields like `active_ms`, `expires`, and `getdatems`.
- Return stable ids plus human-readable labels. The UI should not need to parse markdown, slash commands, or raw note strings just to recover identity.
- Read models should generally return `generated_at`, `filters`, `summary`, `rows`, and optional `warnings`.
- Detail models should generally return `generated_at`, `id`, `summary`, `context`, `actions`, and optional `warnings`.
- Preview models should always return `generated_at`, `input`, `summary`, `rows`, `warnings`, `errors`, `can_execute`, and `generated_command`.
- Context-dependent scores belong in dedicated JSON read models. Do not add them to generic placeholder types unless the value is stable without extra page context.
- Example resource arrays below are shortened for readability. Real payloads can keep the full site resource ordering and optionally add parallel object maps for clarity.
- Examples below omit zero-value resources and unrelated fields for readability.

## Shared Response Skeletons

### Read Model

```json
{
  "generated_at": 1741862400000,
  "filters": {},
  "summary": {},
  "rows": [],
  "warnings": []
}
```

### Detail Model

```json
{
  "generated_at": 1741862400000,
  "id": "detail-id",
  "summary": {},
  "context": {},
  "actions": [],
  "warnings": []
}
```

### Preview Model

```json
{
  "generated_at": 1741862400000,
  "input": {},
  "summary": {},
  "rows": [],
  "warnings": [],
  "errors": [],
  "can_execute": true,
  "generated_command": {
    "path": "war room create",
    "args": {},
    "slash_command": "/war room create ..."
  }
}
```

## Endpoint Shape Guidance

### Members

#### Recruitment Settings And Timed Messages

- Gap mapping: `recruitment_timed_messages`
- Best fit: a dedicated recruitment summary family, not a `GuildSetting` table pretending to be a timed-message list.
- Suggested family:
  - `recruitment_settings_summary`
  - `recruitment_timed_messages`
  - `recruitment_referral_summary`

| Endpoint | Must return |
| --- | --- |
| `recruitment_settings_summary` | applicant-mail state, recruit-message state, output channel, validation warnings |
| `recruitment_timed_messages` | timed-message rows with trigger, delay, subject/body preview, output target, validity |
| `recruitment_referral_summary` | top referrers, recent referral activity, reward or incentive context |

Example `recruitment_timed_messages` JSON:

```json
{
  "generated_at": 1741862400000,
  "summary": {
    "timed_message_count": 2,
    "applicant_mail_enabled": true,
    "recruit_message_delay_ms": 86400000
  },
  "rows": [
    {
      "id": "NEW_MEMBER:86400000",
      "trigger": "NEW_MEMBER",
      "delay_ms": 86400000,
      "subject": "Welcome to the alliance",
      "message_preview": "Welcome to Cataclysm. Join Discord and say hello...",
      "output_channel": {
        "id": "98123",
        "name": "recruit-log"
      },
      "is_valid": true
    }
  ],
  "warnings": []
}
```

#### Interview Desk Read Model

- Gap mapping: `interview desk read model`
- Best fit: a small family of IA desk reads. This is too stateful and cross-cutting for TABLE alone.
- Suggested family:
  - `interview_queue`
  - `interview_detail`
  - `mentor_load_summary`
  - `interview_channel_state`

| Endpoint | Must return |
| --- | --- |
| `interview_queue` | queue rows, queue summary, saved-filter inputs, stale or verification warnings |
| `interview_detail` | member context, mentor/referrer context, audit flags, recommended actions |
| `mentor_load_summary` | mentor rows, mentee counts, stale-load indicators |
| `interview_channel_state` | channel id/name/category, participants, last activity, archive readiness |

Example `interview_queue` JSON:

```json
{
  "generated_at": 1741862400000,
  "filters": {
    "state": "ACTIVE",
    "include_missing_guild": true
  },
  "summary": {
    "pending": 11,
    "stale": 3,
    "unassigned": 4,
    "missing_guild_verification": 2
  },
  "rows": [
    {
      "nation_id": 123,
      "nation_name": "Borg",
      "alliance_id": 9,
      "alliance_name": "Cataclysm",
      "queue_state": "WAITING_FOR_MENTOR",
      "channel": {
        "id": "555",
        "name": "interview-borg",
        "category_id": "44",
        "last_message_ms": 1741855200000
      },
      "mentor": null,
      "referrer": {
        "nation_id": 77,
        "nation_name": "MentorOne"
      },
      "audit_flags": [
        "NOT_IN_GUILD"
      ],
      "nation_active_ms": 1741858800000,
      "tags": [
        "NOT_VERIFIED",
        "LOW_CITY_COUNT"
      ]
    }
  ],
  "warnings": []
}
```

### War

#### War And Spy Target Search Family

- Gap mapping: `war target read models`
- Best fit: a target-search family that extends the raid experience into other search modes without forcing the UI to parse command blobs.
- Suggested family:
  - `war_find_enemy`
  - `war_find_damage`
  - `war_find_treasure`
  - `war_find_bounty`
  - `war_find_unblockade`
  - `spy_find_target`
  - `spy_find_intel`
  - `spy_counter`

| Endpoint | Must return |
| --- | --- |
| `war_find_enemy` | attacker-aware enemy rows, policy chips, quick-action eligibility |
| `war_find_damage` | same target row shape plus infra-damage fields |
| `war_find_treasure` | same target row shape plus treasure or bounty context |
| `war_find_bounty` | same target row shape plus bounty value and bounty type context |
| `war_find_unblockade` | same row shape plus allied blockade context and unblockade priority |
| `spy_find_target` | spy target rows with intel freshness and spy-cap context |
| `spy_find_intel` | intel-focused rows with freshness, likely spy count, and recency |
| `spy_counter` | defender and counter-spy opportunity rows with risk markers |

Example `war_find_enemy` JSON:

```json
{
  "generated_at": 1741862400000,
  "mode": "WAR_FIND_ENEMY",
  "attacker": {
    "nation_id": 321,
    "nation_name": "Attacker",
    "score": 1680.25
  },
  "filters": {
    "include_inactives": false,
    "only_weak": true
  },
  "summary": {
    "results": 25,
    "dnr_excluded": 4,
    "beige_excluded": 2
  },
  "rows": [
    {
      "nation_id": 900,
      "nation_name": "Target",
      "alliance_id": 41,
      "alliance_name": "Enemy AA",
      "score": 1622.33,
      "cities": 16,
      "avg_infra": 1880,
      "off": 2,
      "def": 1,
      "last_active_ms": 1741859400000,
      "beige_turns": 0,
      "vm_turns": 0,
      "estimated_loot_value": 21000000,
      "intel_freshness_ms": 7200000,
      "policy": {
        "is_dnr": false,
        "reasons": []
      },
      "quick_actions": {
        "can_counter": true,
        "can_room": true
      }
    }
  ],
  "warnings": []
}
```

#### Counter Planner Read Model

- Gap mapping: `war counter planner read model`
- Best fit: a dedicated counter planner family. Candidate generation and fit scoring are too context-dependent for TABLE.
- Suggested family:
  - `war_counter_nation`
  - `war_counter_url`
  - `war_counter_auto`

| Endpoint | Must return |
| --- | --- |
| `war_counter_nation` | enemy summary, candidate attacker rows, fit reasons, risk markers |
| `war_counter_url` | same as `war_counter_nation`, but seeded from a specific war |
| `war_counter_auto` | same row shape plus auto-selected plan and policy assumptions |

Example `war_counter_nation` JSON:

```json
{
  "generated_at": 1741862400000,
  "mode": "NATION",
  "enemy": {
    "nation_id": 900,
    "nation_name": "Target",
    "alliance_id": 41,
    "alliance_name": "Enemy AA"
  },
  "summary": {
    "candidate_count": 14,
    "recommended_count": 3
  },
  "rows": [
    {
      "nation_id": 101,
      "nation_name": "Counter A",
      "cities": 15,
      "score": 1510.2,
      "free_off_slots": 1,
      "discord_state": "ONLINE",
      "has_discord": true,
      "last_active_ms": 1741860000000,
      "military_readiness": {
        "ground_pct": 0.94,
        "air_pct": 0.88,
        "naval_pct": 0.71
      },
      "fit": {
        "score": 87,
        "reasons": [
          "In range",
          "Free slot"
        ],
        "risks": [
          "Low ships"
        ]
      },
      "selected": true
    }
  ],
  "warnings": []
}
```

#### Counter Sheet Preview

- Gap mapping: `war counter sheet preview`
- Best fit: a preview mode on `war counter sheet`.

| Endpoint | Must return |
| --- | --- |
| `war_counter_sheet_preview` | per-enemy preview rows, selected or recommended attackers, warnings, generated command |

Example `war_counter_sheet_preview` JSON:

```json
{
  "generated_at": 1741862400000,
  "input": {
    "enemy_filter": "~enemies,#cities>10",
    "allies": "%guild_alliances%"
  },
  "summary": {
    "enemy_rows": 12,
    "rows_with_candidates": 10,
    "rows_blocked": 2
  },
  "rows": [
    {
      "enemy_nation_id": 900,
      "enemy_nation_name": "Target",
      "recommended_attackers": [
        {
          "nation_id": 101,
          "nation_name": "Counter A",
          "fit_score": 87
        }
      ],
      "warnings": []
    }
  ],
  "warnings": [],
  "errors": [],
  "can_execute": true,
  "generated_command": {
    "path": "war counter sheet",
    "args": {
      "enemyFilter": "~enemies,#cities>10",
      "allies": "%guild_alliances%"
    },
    "slash_command": "/war counter sheet enemyFilter=... allies=..."
  }
}
```

#### War Room Board And Inventory

- Gap mapping: `war room board read model`
- Best fit: a room-board family plus category inventory. TABLE can help with channel context, but it should not be the primary room-management read model.
- Suggested family:
  - `war_room_list`
  - `war_room_detail`
  - `discord_category_inventory`

| Endpoint | Must return |
| --- | --- |
| `war_room_list` | room rows, stale-state markers, grouped category context |
| `war_room_detail` | room member list, enemy context, pin state, links, cleanup status |
| `discord_category_inventory` | category rows, capacity state, permissions or readiness warnings |

Example `war_room_list` JSON:

```json
{
  "generated_at": 1741862400000,
  "summary": {
    "active_rooms": 18,
    "stale_rooms": 4,
    "uncategorized": 1
  },
  "rooms": [
    {
      "channel_id": "777",
      "channel_name": "counter-target",
      "jump_url": "https://discord.com/channels/1/2/777",
      "status": "ACTIVE",
      "enemy": {
        "nation_id": 900,
        "nation_name": "Target"
      },
      "category": {
        "id": "12",
        "name": "Counter Rooms"
      },
      "participants": [
        {
          "nation_id": 101,
          "nation_name": "Counter A"
        }
      ],
      "participant_count": 4,
      "last_message_ms": 1741860600000
    }
  ],
  "warnings": []
}
```

#### War Room Create And Batch Previews

- Gap mapping: `war_room_create_preview`, `war_room_batch_preview`
- Best fit: preview modes on `war room create` and `war room from_sheet`.

| Endpoint | Must return |
| --- | --- |
| `war_room_create_preview` | one or more planned room rows, category choice, participant list, warnings |
| `war_room_batch_preview` | per-source-row room plans, partial-failure markers, category or sheet warnings |

Example `war_room_create_preview` JSON:

```json
{
  "generated_at": 1741862400000,
  "input": {
    "enemy": 900,
    "attackers": [
      101,
      102,
      103
    ]
  },
  "summary": {
    "rooms_to_create": 1,
    "members_to_add": 4,
    "reused_channels": 0
  },
  "rows": [
    {
      "room_name": "counter-target",
      "enemy": {
        "nation_id": 900,
        "nation_name": "Target"
      },
      "attackers": [
        {
          "nation_id": 101,
          "nation_name": "Counter A"
        }
      ],
      "category": {
        "id": "12",
        "name": "Counter Rooms",
        "capacity_state": "OK"
      },
      "warnings": []
    }
  ],
  "warnings": [],
  "errors": [],
  "can_execute": true,
  "generated_command": {
    "path": "war room create",
    "args": {
      "enemy": 900,
      "attackers": [101, 102, 103]
    },
    "slash_command": "/war room create enemy=900 attackers=101,102,103"
  }
}
```

#### War Sheet Preview, Validation, And Cost JSON

- Gap mapping: `war sheet preview and validation JSON`
- Best fit: preview or JSON modes on the existing `war sheet *` family.
- Suggested family:
  - `war_sheet_blitz_preview`
  - `war_sheet_validation`
  - `war_sheet_raid_preview`
  - `war_sheet_active_wars`
  - `war_sheet_costsheet`
  - `war_sheet_cost_by_resource`
  - `war_sheet_reimburse_by_nation`

| Endpoint | Must return |
| --- | --- |
| `war_sheet_blitz_preview` | planned attacker-defender rows, slot assumptions, warnings |
| `war_sheet_validation` | row-level validation results, warnings, hard errors, summary counts |
| `war_sheet_raid_preview` | raid-planning rows and assignment warnings |
| `war_sheet_active_wars` | live war rows and summary totals |
| `war_sheet_costsheet` | war-cost rows by type plus summary cards |
| `war_sheet_cost_by_resource` | nation rows broken down by resource plus totals |
| `war_sheet_reimburse_by_nation` | reimbursement rows, payer/payee totals, exclusions |

Example `war_sheet_validation` JSON:

```json
{
  "generated_at": 1741862400000,
  "input": {
    "sheet_url": "https://docs.google.com/spreadsheets/d/example"
  },
  "summary": {
    "row_count": 25,
    "valid_rows": 22,
    "warning_rows": 2,
    "error_rows": 1
  },
  "rows": [
    {
      "row_number": 7,
      "attacker": "Borg",
      "defender": "Target",
      "status": "WARNING",
      "messages": [
        "Attacker already has 5 offensives"
      ]
    }
  ],
  "warnings": [],
  "errors": [],
  "can_execute": false,
  "generated_command": {
    "path": "war sheet validate",
    "args": {
      "sheet": "https://docs.google.com/spreadsheets/d/example"
    },
    "slash_command": "/war sheet validate sheet=https://docs.google.com/spreadsheets/d/example"
  }
}
```

Example `war_sheet_cost_by_resource` JSON:

```json
{
  "generated_at": 1741862400000,
  "summary": {
    "total_value": 540000000,
    "attackers": 18,
    "defenders": 23
  },
  "rows": [
    {
      "nation_id": 123,
      "nation_name": "Borg",
      "resources": {
        "MONEY": 12000000,
        "STEEL": 42000,
        "ALUMINUM": 38000
      },
      "market_value": 24400000
    }
  ],
  "warnings": []
}
```

### Economy

#### Accessible Bank Accounts

- Gap mapping: `accessible_bank_accounts`
- Best fit: additive expansion of `BANK_ACCESS`.
- Do not make the UI infer account scopes from session plus raw access bits alone.
- The exact account key syntax is not locked here. The important part is stable ids plus an explicit `kind`.

| Endpoint | Must return |
| --- | --- |
| expanded `BANK_ACCESS` | current `access` plus explicit account rows, scope labels, default and withdraw flags |

Example expanded `BANK_ACCESS` JSON:

```json
{
  "access": {
    "nation:123": 1,
    "AA:9": 2,
    "guild:456": 2
  },
  "accounts": [
    {
      "qualified_id": "nation:123",
      "kind": "NATION",
      "display_name": "Borg",
      "nation_id": 123,
      "nation_name": "Borg",
      "alliance_id": 9,
      "alliance_name": "Cataclysm",
      "can_view": true,
      "can_withdraw": false,
      "is_default": true
    },
    {
      "qualified_id": "AA:9",
      "kind": "ALLIANCE",
      "display_name": "Cataclysm",
      "alliance_id": 9,
      "alliance_name": "Cataclysm",
      "can_view": true,
      "can_withdraw": true,
      "is_default": false
    }
  ]
}
```

#### Account Holdings

- Gap mapping: `account_holdings`
- Best fit: additive expansion of `BALANCE`.
- Preserve the current `WebBalance` fields for legacy consumers and add new fields rather than replacing them.

| Endpoint | Must return |
| --- | --- |
| expanded `BALANCE` | current `WebBalance` fields plus selected account metadata, available vs blocked totals, note totals, explanatory messages |

Example expanded `BALANCE` JSON:

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
  "account": {
    "qualified_id": "nation:123",
    "kind": "NATION",
    "display_name": "Borg"
  },
  "available_totals": {
    "MONEY": 10000000
  },
  "blocked_totals": {
    "ESCROW": {
      "MONEY": 1000000
    },
    "EXPIRED": {
      "MONEY": 500000
    },
    "IGNORED": {
      "MONEY": 1000000
    }
  },
  "note_totals": [
    {
      "note": "DEPOSIT",
      "resources": {
        "MONEY": 10000000
      }
    },
    {
      "note": "GRANT",
      "resources": {
        "MONEY": 2500000
      }
    }
  ],
  "messages": [
    "Escrowed funds are excluded from available_totals"
  ]
}
```

#### Deposit Investigation Family

- Gap mapping: `deposit investigation read model`
- Best fit: a dedicated investigation family. TABLE can help with supporting rows, but not with the whole holdings-vs-escrow-vs-offshore story.
- Suggested family:
  - `deposit_investigation`
  - `deposit_note_flows`
  - `escrow_summary`
  - `expiring_balance_summary`
  - `offshore_account_summary`

| Endpoint | Must return |
| --- | --- |
| `deposit_investigation` | account matrix, sticky health summary, note totals, warnings |
| `deposit_note_flows` | note-flow rows and net totals by flow type |
| `escrow_summary` | escrow rows, expiry info, withdrawability flags |
| `expiring_balance_summary` | expiring rows, days-left or expiry timestamps, risk totals |
| `offshore_account_summary` | offshore scope rows, owner/account mapping, warnings |

Example `deposit_investigation` JSON:

```json
{
  "generated_at": 1741862400000,
  "account": {
    "qualified_id": "nation:123",
    "kind": "NATION",
    "display_name": "Borg"
  },
  "summary": {
    "available": {
      "MONEY": 10000000
    },
    "escrow": {
      "MONEY": 1500000
    },
    "expiring": {
      "MONEY": 2500000
    },
    "offshore": {
      "MONEY": 4000000
    }
  },
  "accounts": [
    {
      "qualified_id": "nation:123",
      "kind": "NATION",
      "available": {
        "MONEY": 10000000
      },
      "escrow": {
        "MONEY": 1500000
      },
      "expired": {
        "MONEY": 500000
      },
      "ignored": {
        "MONEY": 1000000
      }
    }
  ],
  "escrow_rows": [
    {
      "nation_id": 123,
      "expires_ms": 1744473600000,
      "resources": {
        "MONEY": 1500000
      },
      "source": "escrow add"
    }
  ],
  "warnings": []
}
```

#### Deposit Correction Preview

- Gap mapping: `deposit_correction_preview`
- Best fit: shared preview shape for `deposits shift`, `deposits shiftflow`, `deposits convert`, `deposits reset`, and `escrow *` actions.

| Endpoint | Must return |
| --- | --- |
| `deposit_correction_preview` | before/after rows, balance deltas, warnings, blocking errors, generated command |

Example `deposit_correction_preview` JSON:

```json
{
  "generated_at": 1741862400000,
  "input": {
    "action": "SHIFT_NOTE",
    "nation": 123,
    "from": "GRANT",
    "to": "DEPOSIT"
  },
  "summary": {
    "rows_affected": 1,
    "market_value_delta": 0
  },
  "rows": [
    {
      "qualified_id": "nation:123",
      "before": {
        "note": "GRANT",
        "resources": {
          "MONEY": 3000000
        }
      },
      "after": {
        "note": "DEPOSIT",
        "resources": {
          "MONEY": 3000000
        }
      },
      "delta": {
        "GRANT": {
          "MONEY": -3000000
        },
        "DEPOSIT": {
          "MONEY": 3000000
        }
      }
    }
  ],
  "warnings": [
    {
      "severity": "warning",
      "code": "EXPIRE_TIME_REMOVED",
      "message": "Expiry will be cleared"
    }
  ],
  "errors": [],
  "can_execute": true,
  "generated_command": {
    "path": "deposits shift",
    "args": {
      "nation": 123,
      "from": "GRANT",
      "to": "DEPOSIT"
    },
    "slash_command": "/deposits shift nation=123 from=GRANT to=DEPOSIT"
  }
}
```

#### Ledger Expansion

- Gap mapping: `ledger expansion`
- Best fit: a JSON-friendly ledger family that grows the `/records` foundation without forcing the UI to stay a plain `WebTable` dump.
- Suggested family:
  - `ledger_records`
  - `ledger_summary`
  - `ledger_note_flow`
- Implementation note: this can be a sibling JSON mode on `RECORDS` if that is cleaner than overloading `WebTable`.

| Endpoint | Must return |
| --- | --- |
| `ledger_records` | filtered transaction rows with sender/receiver, note, market value, expiry, flags |
| `ledger_summary` | filtered totals, net flow, note totals, active account context |
| `ledger_note_flow` | note-flow rows, internal offsets, related correction context |

Example `ledger_records` JSON:

```json
{
  "generated_at": 1741862400000,
  "filters": {
    "account": "AA:9",
    "note": "GRANT"
  },
  "summary": {
    "row_count": 120,
    "net_value": 180000000,
    "money_in": 60000000,
    "money_out": 42000000
  },
  "rows": [
    {
      "tx_id": 551923,
      "date_ms": 1741776000000,
      "sender": {
        "kind": "ALLIANCE",
        "id": 9,
        "name": "Cataclysm"
      },
      "receiver": {
        "kind": "NATION",
        "id": 123,
        "name": "Borg"
      },
      "banker": {
        "nation_id": 777,
        "nation_name": "EconLead"
      },
      "note_raw": "#grant city",
      "note_category": "GRANT",
      "flow_type": "DEPOSIT",
      "resources": {
        "MONEY": 3000000
      },
      "market_value": 3000000,
      "expire_ms": 1744473600000,
      "flags": [
        "EXPIRING"
      ]
    }
  ],
  "warnings": []
}
```

#### Ledger Correction Preview

- Gap mapping: `ledger_correction_preview`
- Best fit: same preview family as deposit correction, but initiated from ledger rows.

| Endpoint | Must return |
| --- | --- |
| `ledger_correction_preview` | selected transaction or note-flow context, before/after balances, warnings, generated command |

#### Grant Request Queue Read Model

- Gap mapping: `grant request queue read model`
- Best fit: native JSON. `GrantRequest` exists today as a query type for command inputs, not as a TABLE placeholder type.
- Suggested family:
  - `grant_requests`
  - `grant_request_detail`
  - `grant_request_context`

| Endpoint | Must return |
| --- | --- |
| `grant_requests` | queue rows, status filters, amount estimates, blocking flags |
| `grant_request_detail` | full request context, source command, reason, balances, recent grants, warnings |
| `grant_request_context` | guild defaults, approval assumptions, template matches, account context |

Example `grant_requests` JSON:

```json
{
  "generated_at": 1741862400000,
  "filters": {
    "status": "OPEN"
  },
  "summary": {
    "open": 12,
    "needs_follow_up": 3
  },
  "rows": [
    {
      "request_id": 901,
      "status": "OPEN",
      "created_ms": 1741850000000,
      "requester": {
        "nation_id": 123,
        "nation_name": "Borg"
      },
      "receiver": {
        "kind": "NATION",
        "id": 123,
        "name": "Borg"
      },
      "grant_type": "CITY",
      "estimated_amounts": {
        "MONEY": 12000000
      },
      "estimated_value": 12000000,
      "reason_preview": "City 11 grant",
      "template_match_count": 2,
      "blocking_flags": [
        "LOW_FUNDS"
      ]
    }
  ],
  "warnings": []
}
```

#### Grant Template Library Read Model

- Gap mapping: `grant template library read model`
- Best fit: native JSON. `AGrantTemplate` exists today as a query type for command inputs, not as a TABLE placeholder type.
- Suggested family:
  - `grant_templates`
  - `grant_template_detail`
  - `grant_template_evaluation`

| Endpoint | Must return |
| --- | --- |
| `grant_templates` | template rows, enabled state, type, scope, limits, repeatability |
| `grant_template_detail` | subtype-specific config, eligibility summary, current settings, actions |
| `grant_template_evaluation` | receiver-specific eligibility checks, cost, warnings, generated command |

Example `grant_templates` JSON:

```json
{
  "generated_at": 1741862400000,
  "filters": {
    "type": "CITY"
  },
  "summary": {
    "enabled": 18,
    "disabled": 4
  },
  "rows": [
    {
      "template_name": "city-c11",
      "type": "CITY",
      "enabled": true,
      "scope": {
        "guild_id": "123",
        "alliance_id": 9
      },
      "allowed_recipients": "#cities<11,#ismember",
      "limits": {
        "max_total": {
          "MONEY": 30000000
        },
        "max_day": {
          "MONEY": 15000000
        }
      },
      "expire_ms": 0,
      "decay_ms": 0,
      "repeatable_ms": 86400000
    }
  ],
  "warnings": []
}
```

Example `grant_template_evaluation` JSON:

```json
{
  "generated_at": 1741862400000,
  "template_name": "city-c11",
  "receiver": {
    "nation_id": 123,
    "nation_name": "Borg"
  },
  "summary": {
    "eligible": false,
    "missing_requirements": 2
  },
  "checks": [
    {
      "code": "CITY_COUNT_TOO_HIGH",
      "passed": false,
      "message": "Receiver already has 11 cities"
    }
  ],
  "cost": {
    "MONEY": 12000000
  },
  "warnings": [],
  "errors": [],
  "can_execute": false,
  "generated_command": {
    "path": "grant_template send",
    "args": {
      "template": "city-c11",
      "receiver": 123
    },
    "slash_command": "/grant_template send template=city-c11 receiver=123"
  }
}
```

#### Tax Member, Record, And Automation Reads

- Gap mapping: `tax derived read surfaces`, `tax_automation_preview`
- Best fit: mixed approach. TABLE can help member and record views if the underlying placeholder types grow, but automation preview still wants native JSON.
- Suggested family:
  - `tax_member_status`
  - `tax_records_json`
  - `tax_bracket_assignments`
  - `tax_automation_preview`

| Endpoint | Must return |
| --- | --- |
| `tax_member_status` | member rows with bracket, internal rate, self-service flags, exception markers |
| `tax_records_json` | record rows, note totals, filtered summaries |
| `tax_bracket_assignments` | current vs target bracket rows, reasons, assignability warnings |
| `tax_automation_preview` | sample or full change rows, current vs target bracket, generated command |

Example `tax_member_status` JSON:

```json
{
  "generated_at": 1741862400000,
  "summary": {
    "taxable": 85,
    "self_assign_enabled": true,
    "noncompliant": 4
  },
  "rows": [
    {
      "nation_id": 123,
      "nation_name": "Borg",
      "current_bracket": {
        "id": 18,
        "name": "C10 70/70"
      },
      "internal_money_rate": 70,
      "internal_resource_rate": 70,
      "taxable": true,
      "self_assign_allowed": false,
      "last_tax_deposit_ms": 1741600000000,
      "exception_flags": [
        "WRONG_BRACKET"
      ]
    }
  ],
  "warnings": []
}
```

Example `tax_automation_preview` JSON:

```json
{
  "generated_at": 1741862400000,
  "input": {
    "mode": "SET_NATION_BRACKET_AUTO"
  },
  "summary": {
    "nations_checked": 88,
    "changes": 12
  },
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
  "can_execute": true,
  "generated_command": {
    "path": "tax setnationbracketauto",
    "args": {
      "nations": [123]
    },
    "slash_command": "/tax setnationbracketauto nations=123"
  }
}
```

#### Trade Market, Ranking, Profit, And Alerts

- Gap mapping: `trade market and ranking read surfaces`
- Best fit: mixed approach. Graph endpoints already own historical charting, but live snapshots, rankings, profit summaries, and subscriptions want explicit JSON.
- Suggested family:
  - `trade_market_snapshot`
  - `trade_rankings`
  - `trade_profit_summary`
  - `trade_alert_subscriptions`

| Endpoint | Must return |
| --- | --- |
| `trade_market_snapshot` | one row per resource with current buy/sell/spread/trend context |
| `trade_rankings` | nation or alliance ranking rows with metric selection and time window |
| `trade_profit_summary` | grouped profit rows with resource or trader breakdowns |
| `trade_alert_subscriptions` | current alert rows, conditions, expiry, unsubscribe metadata |

Example `trade_market_snapshot` JSON:

```json
{
  "generated_at": 1741862400000,
  "summary": {
    "resources": 12,
    "alerts": 5
  },
  "rows": [
    {
      "resource": "ALUMINUM",
      "top_buy_ppu": 3400,
      "top_sell_ppu": 3480,
      "spread_ppu": 80,
      "avg_ppu_1d": 3440,
      "avg_ppu_7d": 3510,
      "volume_1d": 180000,
      "trend": "DOWN"
    }
  ],
  "warnings": []
}
```

Example `trade_alert_subscriptions` JSON:

```json
{
  "generated_at": 1741862400000,
  "rows": [
    {
      "subscription_id": "trade:ALUMINUM:price:above:3500",
      "resource": "ALUMINUM",
      "kind": "PRICE",
      "direction": "ABOVE",
      "threshold_ppu": 3500,
      "expires_ms": 1742467200000
    }
  ],
  "warnings": []
}
```

### Shared

#### Job Status

- Gap mapping: `job_status`
- Best fit: a shared long-running job read model for reconnectable room and sheet workflows.

| Endpoint | Must return |
| --- | --- |
| `job_status` | job identity, state, progress, timestamps, summary, result counts, last error |

Example `job_status` JSON:

```json
{
  "job_id": "war-room-batch-1741862400",
  "kind": "WAR_ROOM_BATCH",
  "state": "RUNNING",
  "progress": {
    "complete": 7,
    "total": 12
  },
  "created_ms": 1741862400000,
  "started_ms": 1741862460000,
  "finished_ms": null,
  "summary": "Creating war rooms from blitz sheet",
  "result": {
    "completed_rows": 7,
    "failed_rows": 1
  },
  "last_error": null
}
```

## TABLE Placeholder Additions

### Rules For TABLE Backlog

- Add row-level facts that remain meaningful without extra page state.
- Do not add page-only fit scores, queue summaries, or before-and-after preview math to placeholder types.
- If a type only exists as a query selector today, it is not enough for TABLE until it also becomes a placeholder type.

### `DBNation`

- Current strength: already a strong supporting type for member, war, and tax context. It already covers activity, score, cities, war slots, beige/VM, some Discord state, and tax id.
- Add these properties:
  - `interview_state`
  - `interview_channel_id`
  - `interview_channel_name`
  - `mentor_nation_id`
  - `mentor_nation_name`
  - `referrer_nation_id`
  - `referrer_nation_name`
  - `audit_summary`
  - `alliance_guild_membership_state`
  - `milcom_guild_membership_state`
  - `tax_bracket_name`
  - `internal_tax_money_rate`
  - `internal_tax_resource_rate`
  - `last_tax_deposit_ms`
  - `last_spy_report_ms`
- Good for: interview side tables, tax member tables, supporting target drawers.
- Still not enough for: target generation, counter-fit scoring, room previews.

### `GuildSetting`

- Current strength: decent generic settings metadata. Current placeholder support already exposes name, category, subgroup, command path, raw/formatted value, help, and validity.
- Add these properties:
  - `channel_id`
  - `channel_name`
  - `role_id`
  - `role_name`
  - `sheet_url`
  - `typed_json`
  - `is_default`
  - `validation_message`
- Good for: settings summaries and settings readiness tables.
- Still not enough for: timed-message rows, grant request queues, war room boards.

### `Transaction2`

- Current strength: extremely thin. Current placeholder support only exposes `getresource` and `getresourcevalue`.
- Add these properties:
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
  - `resources_json`
  - `market_value`
  - `expire_ms`
  - `decay_ms`
  - `is_expired`
  - `is_ignored`
  - `is_escrow`
  - `account_scope`
  - `source_command`
- Good for: ledger tables, deposit and correction analysis, filtered `RECORDS` expansions.
- Still not enough for: before/after correction previews.

### `TaxDeposit`

- Current strength: moderate. It already covers date, nation/alliance references, rates, tax id, market value, and resource amounts.
- Add these properties:
  - `tax_bracket_name`
  - `note_category`
  - `effective_category`
  - `expire_ms`
  - `is_expired`
  - `is_ignored`
  - `is_escrow`
  - `account_scope`
  - `source_account_kind`
  - `source_account_id`
- Good for: tax record tables and parts of deposits analysis.
- Still not enough for: a full deposits investigation page or automation preview.

### `TaxBracket`

- Current strength: basic bracket identity and rate context. It already covers id, name, alliance, nation count, money rate, resource rate, and sheet url.
- Add these properties:
  - `internal_money_rate`
  - `internal_resource_rate`
  - `self_assign_enabled`
  - `self_assign_roles`
  - `auto_assign_rule_summary`
  - `tax_base_label`
- Good for: bracket summaries and assignment tables.
- Still not enough for: automation previews and member-level compliance reason rows.

### `DBTrade`

- Current strength: decent historical row support for accepted trades. It already covers buyer, seller, date, resource, quantity, price per unit, and side.
- Add these properties:
  - `accepted_ms`
  - `total_value`
  - `buyer_alliance_id`
  - `buyer_alliance_name`
  - `seller_alliance_id`
  - `seller_alliance_name`
  - `rolling_avg_ppu_1d`
  - `rolling_avg_ppu_7d`
  - `margin_vs_average`
  - `profit_estimate`
  - `offer_state`
- Good for: future trade tables and ranking support.
- Still not enough for: live market snapshot, subscriptions, or real-time alert management.

### `DBWar`

- Current strength: thin war identity and control-state support. It already covers attacker/defender ids, date, war type, status, activity, and turns left.
- Add these properties:
  - `attacker_nation_name`
  - `defender_nation_name`
  - `attacker_alliance_name`
  - `defender_alliance_name`
  - `attacker_resistance`
  - `defender_resistance`
  - `attacker_map`
  - `defender_map`
  - `blockaded_side`
  - `last_attack_ms`
  - `loot_value`
  - `beige_exit_ms`
  - `status_label`
- Good for: supporting war tables and richer target drawers.
- Still not enough for: target search ranking or counter planning.

### `TextChannelWrapper`

- Current strength: thin channel identity support. It already covers id, name, topic, members, jump url, and position-ish fields.
- Add these properties:
  - `parent_id`
  - `parent_name`
  - `channel_type`
  - `created_ms`
  - `last_message_ms`
  - `participant_count`
  - `participant_ids`
  - `is_war_room`
  - `enemy_nation_id`
  - `enemy_nation_name`
  - `room_status`
  - `stale_reason`
  - `pinned_message_url`
- Good for: lightweight room or channel readiness tables.
- Still not enough for: full room previews or batch-create job progress.

### `GuildDB`

- Current strength: basic guild and offshore context. It already covers alliance id, offshore state, delegate-server state, and offshore balance.
- Add these properties:
  - `registered_alliance_ids`
  - `registered_alliance_names`
  - `default_offshore_account_id`
  - `default_offshore_account_name`
  - `grant_request_channel_id`
  - `trade_alert_channel_id`
  - `tax_base`
  - `delegate_server_id`
- Good for: guild-level banking or setup tables.
- Still not enough for: the accessible account switcher itself, which should still come from expanded `BANK_ACCESS`.

### Types That Are Not TABLE Placeholders Today

#### `GrantRequest`

- Current state: query or autocomplete type for command inputs, not a placeholder type surfaced through TABLE.
- If TABLE support is ever wanted, first expose it as a placeholder type and then add:
  - `request_id`
  - `status`
  - `requester`
  - `receiver`
  - `reason`
  - `command_json`
  - `estimated_amounts`
  - `estimated_value`
  - `created_ms`
  - `updated_ms`
  - `approved_by`
  - `note`
  - `expire_ms`
  - `decay_ms`
  - `tax_account`
- Recommended path: use native JSON read models first.

#### `AGrantTemplate`

- Current state: query or autocomplete type for command inputs, not a placeholder type surfaced through TABLE.
- If TABLE support is ever wanted, first expose it as a placeholder type and then add:
  - `template_name`
  - `type`
  - `enabled`
  - `allowed_recipients_filter`
  - `econ_role`
  - `self_role`
  - `bracket_id`
  - `bracket_name`
  - `limits`
  - `expire_ms`
  - `decay_ms`
  - `allow_ignore`
  - `repeatable_ms`
  - `subtype_summary`
- Recommended path: use native JSON read models first.

## Practical Takeaways

- Best immediate backend wins for current page plans:
  - expand `BANK_ACCESS`
  - expand `BALANCE`
  - add preview JSON to `war counter sheet`, `war room create`, `war room from_sheet`, `war sheet *`, `deposits *`, and `tax setnationbracketauto`
  - add native JSON for grant request queues
- Best TABLE investments:
  - `Transaction2`
  - `DBNation`
  - `TaxDeposit`
  - `TaxBracket`
  - `DBTrade`
  - `DBWar`
  - `TextChannelWrapper`
- Poor TABLE candidates even after more placeholder fields:
  - interview desk queues
  - grant request review queues
  - grant template library detail and evaluation
  - war room create and batch previews
  - correction previews
