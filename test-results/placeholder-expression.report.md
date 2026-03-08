# Placeholder Expression Report

Generated at: 2026-03-08T12:00:00.000Z

- Total: 4
- Passing: 4
- Failing: 0

| Case | Type | Status | Expected | Suggestions | Mode | Receiver |
| --- | --- | --- | --- | --- | --- | --- |
| set selector suggestions | Set<DBNation> | pass | nation: | nation:, nation/id=, Borg, 189573, nation(5d | set-root | DBNation |
| predicate filter suggestions | Predicate<DBNation> | pass | #vm_turns | #vm_turns | predicate-filter-field | DBNation |
| function string member suggestions | TypedFunction<DBNation,String> | pass | getname | getname, getnations | member-chain | DBAlliance |
| function numeric map key suggestions | TypedFunction<DBCity,Double> | pass | FOOD | FOOD | member-chain | Map<ResourceType, Double> |

## Details

### set selector suggestions
- Value: `nat`
- Expected suggestion: `nation:`
- Suggestions: nation:, nation/id=, Borg, 189573, nation(5d
- Hint: DBNation selector
- Meta: receiver: DBNation | source: placeholder
- Errors: (none)

### predicate filter suggestions
- Value: `nation:Borg,#vm_`
- Expected suggestion: `#vm_turns`
- Suggestions: #vm_turns
- Hint: DBNation filter
- Meta: receiver: DBNation | source: filter
- Errors: (none)

### function string member suggestions
- Value: `prefix {getalliance.getna} suffix`
- Expected suggestion: `getname`
- Suggestions: getname, getnations
- Hint: getname
- Meta: receiver: DBAlliance | returns: String | source: member
- Errors: (none)

### function numeric map key suggestions
- Value: `{getrevenue.fo}`
- Expected suggestion: `FOOD`
- Suggestions: FOOD
- Hint: ResourceType key
- Meta: receiver: Map<ResourceType, Double> | returns: Map<ResourceType, Double> | source: map-key-options
- Errors: (none)

