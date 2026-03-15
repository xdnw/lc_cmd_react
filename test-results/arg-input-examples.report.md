# ArgInput Example Report

Generated at: 2026-03-08T12:00:00.000Z

## Summary

- Total examples: 260
- Supported examples: 254
- Unsupported examples: 6
- Default failures: 56
- Paste failures: 67
- Unsupported or paste-unfriendly cases: 6

## Default Failures

- AppMenu | "user" | QueryComponent [AppMenu] | Backend request failed for AppMenu: Failed to fetch: 502 Bad Gateway
- AppMenu | "message" | QueryComponent [AppMenu] | Backend request failed for AppMenu: Failed to fetch: 502 Bad Gateway
- DBAlliance | "Singularity" | QueryComponent [DBAlliance] | Backend request failed for DBAlliance: Failed to fetch: 502 Bad Gateway
- DBAlliance | "13809" | QueryComponent [DBAlliance] | Backend request failed for DBAlliance: Failed to fetch: 502 Bad Gateway
- DBAlliance | "https://politicsandwar.com/alliance/id=13809" | QueryComponent [DBAlliance] | Backend request failed for DBAlliance: Failed to fetch: 502 Bad Gateway
- DBAlliancePosition | "23212" | QueryComponent [DBAlliancePosition] | Backend request failed for DBAlliancePosition: Failed to fetch: 502 Bad Gateway
- DBAlliancePosition | "Meow" | QueryComponent [DBAlliancePosition] | Backend request failed for DBAlliancePosition: Failed to fetch: 502 Bad Gateway
- DBBan | "1234" | QueryComponent [DBBan] | Backend request failed for DBBan: Failed to fetch: 502 Bad Gateway
- DBLoan | "1234" | QueryComponent [DBLoan] | Backend request failed for DBLoan: Failed to fetch: 502 Bad Gateway
- DBNation | "Borg" | QueryComponent [DBNation] | Backend request failed for DBNation: Failed to fetch: 502 Bad Gateway
- DBNation | "<@664156861033086987>" | QueryComponent [DBNation] | Backend request failed for DBNation: Failed to fetch: 502 Bad Gateway
- DBNation | "189573" | QueryComponent [DBNation] | Backend request failed for DBNation: Failed to fetch: 502 Bad Gateway
- DBNation | "https://politicsandwar.com/nation/id=189573" | QueryComponent [DBNation] | Backend request failed for DBNation: Failed to fetch: 502 Bad Gateway
- GrantRequest | "1234" | QueryComponent [GrantRequest] | Backend request failed for GrantRequest: Failed to fetch: 502 Bad Gateway
- Guild | "672217848311054346" | QueryComponent [Guild] | Backend request failed for Guild: Failed to fetch: 502 Bad Gateway
- GuildDB | "672217848311054346" | QueryComponent [GuildDB] | Backend request failed for GuildDB: Failed to fetch: 502 Bad Gateway
- GuildOrAlliance | "guild:672217848311054346" | CompositeQueryComponent [GuildDB, DBAlliance] | Backend request failed for GuildDB, DBAlliance: GuildDB: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway
- GuildOrAlliance | "aa:11657" | CompositeQueryComponent [GuildDB, DBAlliance] | Backend request failed for GuildDB, DBAlliance: GuildDB: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway
- Map<Research,Integer> | "{GROUND_COST=12,AIR_CAPACITY=2}" | MapInput | Expected 2 map entries, rendered 1.
- Map<ResourceType,Double> | "{money=1.2,food=6}" | MapInput | Expected 2 map entries, rendered 0.
- Member | "@xdnw" | QueryComponent [Member] | Backend request failed for Member: Failed to fetch: 502 Bad Gateway
- Member | "borg" | QueryComponent [Member] | Backend request failed for Member: Failed to fetch: 502 Bad Gateway
- NationOrAlliance | "Borg" | CompositeQueryComponent [DBNation, DBAlliance] | Backend request failed for DBNation, DBAlliance: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway
- NationOrAlliance | "https://politicsandwar.com/alliance/id=11657" | CompositeQueryComponent [DBNation, DBAlliance] | Backend request failed for DBNation, DBAlliance: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway
- NationOrAlliance | "aa:11657" | CompositeQueryComponent [DBNation, DBAlliance] | Backend request failed for DBNation, DBAlliance: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway
- NationOrAllianceOrGuild | "Borg" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB] | Backend request failed for DBNation, DBAlliance, GuildDB: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway
- NationOrAllianceOrGuild | "alliance/id=11657" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB] | Backend request failed for DBNation, DBAlliance, GuildDB: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway
- NationOrAllianceOrGuild | "672217848311054346" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB] | Backend request failed for DBNation, DBAlliance, GuildDB: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway
- NationOrAllianceOrGuildOrTaxid | "Borg" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | Backend request failed for DBNation, DBAlliance, GuildDB, TaxBracket: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway | TaxBracket: Failed to fetch: 502 Bad Gateway
- NationOrAllianceOrGuildOrTaxid | "alliance/id=11657" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | Backend request failed for DBNation, DBAlliance, GuildDB, TaxBracket: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway | TaxBracket: Failed to fetch: 502 Bad Gateway
- NationOrAllianceOrGuildOrTaxid | "672217848311054346" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | Backend request failed for DBNation, DBAlliance, GuildDB, TaxBracket: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway | TaxBracket: Failed to fetch: 502 Bad Gateway
- NationOrAllianceOrGuildOrTaxid | "tax_id=26171" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | Backend request failed for DBNation, DBAlliance, GuildDB, TaxBracket: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway | TaxBracket: Failed to fetch: 502 Bad Gateway
- NationOrAllianceOrGuildOrTaxid | "https://politicsandwar.com/index.php?id=15&tax_id=26171" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | Backend request failed for DBNation, DBAlliance, GuildDB, TaxBracket: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway | TaxBracket: Failed to fetch: 502 Bad Gateway
- Report | "292636" | QueryComponent [Report] | Backend request failed for Report: Failed to fetch: 502 Bad Gateway
- Role | "@drone" | QueryComponent [Role] | Backend request failed for Role: Failed to fetch: 502 Bad Gateway
- Role | "drone" | QueryComponent [Role] | Backend request failed for Role: Failed to fetch: 502 Bad Gateway
- Role | "672263980193939469" | QueryComponent [Role] | Backend request failed for Role: Failed to fetch: 502 Bad Gateway
- Set<Category> | "interview,test,info" | QueryComponent [Category] | Backend request failed for Category: Failed to fetch: 502 Bad Gateway
- Set<Member> | "*" | QueryComponent [Member] | Backend request failed for Member: Failed to fetch: 502 Bad Gateway
- Set<NationOrAllianceOrGuild> | "borg,AA:Singularity,672217848311054346" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB] | Backend request failed for DBNation, DBAlliance, GuildDB: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway
- Set<NationOrAllianceOrGuildOrTaxid> | "borg,AA:Singularity,672217848311054346,tax_id=26171" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | Backend request failed for DBNation, DBAlliance, GuildDB, TaxBracket: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway | TaxBracket: Failed to fetch: 502 Bad Gateway
- Set<Role> | "@drone,@cube" | QueryComponent [Role] | Backend request failed for Role: Failed to fetch: 502 Bad Gateway
- String[GuildCoalition] | "dnr" | QueryComponent [String[GuildCoalition]] | Backend request failed for String[GuildCoalition]: Failed to fetch: 502 Bad Gateway
- String[MenuLabel] | "Confirm" | QueryComponent [String[MenuLabel]] | Backend request failed for String[MenuLabel]: Failed to fetch: 502 Bad Gateway
- TaxBracket | "26171" | QueryComponent [TaxBracket] | Backend request failed for TaxBracket: Failed to fetch: 502 Bad Gateway
- TaxBracket | "tax_id=26171" | QueryComponent [TaxBracket] | Backend request failed for TaxBracket: Failed to fetch: 502 Bad Gateway
- TaxBracket | "https://politicsandwar.com/index.php?id=15&tax_id=26171" | QueryComponent [TaxBracket] | Backend request failed for TaxBracket: Failed to fetch: 502 Bad Gateway
- TextChannel | "#xdn" | QueryComponent [TextChannel] | Backend request failed for TextChannel: Failed to fetch: 502 Bad Gateway
- TextChannel | "672310912090243092" | QueryComponent [TextChannel] | Backend request failed for TextChannel: Failed to fetch: 502 Bad Gateway
- TextChannel | "<#672310912090243092>" | QueryComponent [TextChannel] | Backend request failed for TextChannel: Failed to fetch: 502 Bad Gateway
- Treaty | "1234:5678" | QueryComponent [Treaty] | Backend request failed for Treaty: Failed to fetch: 502 Bad Gateway
- User | "@xdnw" | QueryComponent [User] | Backend request failed for User: Failed to fetch: 502 Bad Gateway
- User | "xdnw" | QueryComponent [User] | Backend request failed for User: Failed to fetch: 502 Bad Gateway
- User | "664156861033086987" | QueryComponent [User] | Backend request failed for User: Failed to fetch: 502 Bad Gateway
- User | "Borg" | QueryComponent [User] | Backend request failed for User: Failed to fetch: 502 Bad Gateway
- User | "<@664156861033086987>" | QueryComponent [User] | Backend request failed for User: Failed to fetch: 502 Bad Gateway

## Paste Failures

- AppMenu | "user" | QueryComponent [AppMenu] | Backend request failed for AppMenu: Failed to fetch: 502 Bad Gateway
- AppMenu | "message" | QueryComponent [AppMenu] | Backend request failed for AppMenu: Failed to fetch: 502 Bad Gateway
- DBAlliance | "Singularity" | QueryComponent [DBAlliance] | Backend request failed for DBAlliance: Failed to fetch: 502 Bad Gateway
- DBAlliance | "13809" | QueryComponent [DBAlliance] | Backend request failed for DBAlliance: Failed to fetch: 502 Bad Gateway
- DBAlliance | "https://politicsandwar.com/alliance/id=13809" | QueryComponent [DBAlliance] | Backend request failed for DBAlliance: Failed to fetch: 502 Bad Gateway
- DBAlliancePosition | "23212" | QueryComponent [DBAlliancePosition] | Backend request failed for DBAlliancePosition: Failed to fetch: 502 Bad Gateway
- DBAlliancePosition | "Meow" | QueryComponent [DBAlliancePosition] | Backend request failed for DBAlliancePosition: Failed to fetch: 502 Bad Gateway
- DBBan | "1234" | QueryComponent [DBBan] | Backend request failed for DBBan: Failed to fetch: 502 Bad Gateway
- DBLoan | "1234" | QueryComponent [DBLoan] | Backend request failed for DBLoan: Failed to fetch: 502 Bad Gateway
- DBNation | "Borg" | QueryComponent [DBNation] | Backend request failed for DBNation: Failed to fetch: 502 Bad Gateway
- DBNation | "<@664156861033086987>" | QueryComponent [DBNation] | Backend request failed for DBNation: Failed to fetch: 502 Bad Gateway
- DBNation | "189573" | QueryComponent [DBNation] | Backend request failed for DBNation: Failed to fetch: 502 Bad Gateway
- DBNation | "https://politicsandwar.com/nation/id=189573" | QueryComponent [DBNation] | Backend request failed for DBNation: Failed to fetch: 502 Bad Gateway
- GrantRequest | "1234" | QueryComponent [GrantRequest] | Backend request failed for GrantRequest: Failed to fetch: 502 Bad Gateway
- Guild | "672217848311054346" | QueryComponent [Guild] | Backend request failed for Guild: Failed to fetch: 502 Bad Gateway
- GuildDB | "672217848311054346" | QueryComponent [GuildDB] | Backend request failed for GuildDB: Failed to fetch: 502 Bad Gateway
- GuildOrAlliance | "guild:672217848311054346" | CompositeQueryComponent [GuildDB, DBAlliance] | Backend request failed for GuildDB, DBAlliance: GuildDB: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway
- GuildOrAlliance | "aa:11657" | CompositeQueryComponent [GuildDB, DBAlliance] | Backend request failed for GuildDB, DBAlliance: GuildDB: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway
- Map<CityRanges,Set<BeigeReason>> | "c1-9:*\nc10+:INACTIVE,VACATION_MODE,APPLICANT" | MapInput | Expected pasted map output c1-9=*,c10+=INACTIVE,VACATION_MODE,APPLICANT, got (empty).
- Map<MilitaryUnit,Long> | "{soldiers=12,tanks=56}" | MapInput | Expected pasted map output soldiers=12,tanks=56, got (empty).
- Map<NationFilter,MMRMatcher> | "#cities<10:505X\n#cities>=10:0250" | MapInput | Expected pasted map output #cities<10=505X,#cities>=1002, got (empty).
- Map<NationFilter,Role> | "#cities<10:@someRole\n#cities>=10:@otherRole" | MapInput | Expected pasted map output #cities<10=@someRole,#cities>=10:@otherRole, got (empty).
- Map<NationFilter,TaxBracket> | "#cities<10:1\n#cities>=10:2" | MapInput | Expected pasted map output #cities<10=1,#cities>=10:2, got (empty).
- Map<NationFilter,TaxRate> | "#cities<10:100/100\n#cities>=10:25/25" | MapInput | Expected pasted map output #cities<10=100/100,#cities>=10:25/25, got (empty).
- Map<Research,Integer> | "{GROUND_COST=12,AIR_CAPACITY=2}" | MapInput | Expected pasted map output GROUND_COST=12,AIR_CAPACITY=2, got (empty).
- Map<ResourceType,Double> | "{money=1.2,food=6}" | MapInput | Expected pasted map output MONEY=1.2,FOOD=6, got (empty).
- Map<ResourceType,Double> | "{food=1}*1.5" | MapInput | Expected pasted map output {food=1}*1.5, got (empty).
- Map<Role,Set<Role>> | "@drone=@cube,@la\n@cube=@la,@drone" | MapInput | Expected pasted map output @drone=@cube,@la,@cube=@la,@drone, got (empty).
- Map<String,String> | "foo=bar,baz=qux" | MapInput | Expected pasted map output foo=bar,baz=qux, got (empty).
- Member | "@xdnw" | QueryComponent [Member] | Backend request failed for Member: Failed to fetch: 502 Bad Gateway
- Member | "borg" | QueryComponent [Member] | Backend request failed for Member: Failed to fetch: 502 Bad Gateway
- NationOrAlliance | "Borg" | CompositeQueryComponent [DBNation, DBAlliance] | Backend request failed for DBNation, DBAlliance: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway
- NationOrAlliance | "https://politicsandwar.com/alliance/id=11657" | CompositeQueryComponent [DBNation, DBAlliance] | Backend request failed for DBNation, DBAlliance: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway
- NationOrAlliance | "aa:11657" | CompositeQueryComponent [DBNation, DBAlliance] | Backend request failed for DBNation, DBAlliance: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway
- NationOrAllianceOrGuild | "Borg" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB] | Backend request failed for DBNation, DBAlliance, GuildDB: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway
- NationOrAllianceOrGuild | "alliance/id=11657" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB] | Backend request failed for DBNation, DBAlliance, GuildDB: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway
- NationOrAllianceOrGuild | "672217848311054346" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB] | Backend request failed for DBNation, DBAlliance, GuildDB: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway
- NationOrAllianceOrGuildOrTaxid | "Borg" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | Backend request failed for DBNation, DBAlliance, GuildDB, TaxBracket: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway | TaxBracket: Failed to fetch: 502 Bad Gateway
- NationOrAllianceOrGuildOrTaxid | "alliance/id=11657" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | Backend request failed for DBNation, DBAlliance, GuildDB, TaxBracket: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway | TaxBracket: Failed to fetch: 502 Bad Gateway
- NationOrAllianceOrGuildOrTaxid | "672217848311054346" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | Backend request failed for DBNation, DBAlliance, GuildDB, TaxBracket: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway | TaxBracket: Failed to fetch: 502 Bad Gateway
- NationOrAllianceOrGuildOrTaxid | "tax_id=26171" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | Backend request failed for DBNation, DBAlliance, GuildDB, TaxBracket: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway | TaxBracket: Failed to fetch: 502 Bad Gateway
- NationOrAllianceOrGuildOrTaxid | "https://politicsandwar.com/index.php?id=15&tax_id=26171" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | Backend request failed for DBNation, DBAlliance, GuildDB, TaxBracket: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway | TaxBracket: Failed to fetch: 502 Bad Gateway
- Report | "292636" | QueryComponent [Report] | Backend request failed for Report: Failed to fetch: 502 Bad Gateway
- Role | "@drone" | QueryComponent [Role] | Backend request failed for Role: Failed to fetch: 502 Bad Gateway
- Role | "drone" | QueryComponent [Role] | Backend request failed for Role: Failed to fetch: 502 Bad Gateway
- Role | "672263980193939469" | QueryComponent [Role] | Backend request failed for Role: Failed to fetch: 502 Bad Gateway
- Set<Category> | "interview,test,info" | QueryComponent [Category] | Backend request failed for Category: Failed to fetch: 502 Bad Gateway
- Set<Member> | "*" | QueryComponent [Member] | Backend request failed for Member: Failed to fetch: 502 Bad Gateway
- Set<MembershipChangeReason> | "RECRUITED" | SetInput | Expected pasted set output RECRUITED, got (empty).
- Set<NationOrAllianceOrGuild> | "borg,AA:Singularity,672217848311054346" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB] | Backend request failed for DBNation, DBAlliance, GuildDB: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway
- Set<NationOrAllianceOrGuildOrTaxid> | "borg,AA:Singularity,672217848311054346,tax_id=26171" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | Backend request failed for DBNation, DBAlliance, GuildDB, TaxBracket: DBNation: Failed to fetch: 502 Bad Gateway | DBAlliance: Failed to fetch: 502 Bad Gateway | GuildDB: Failed to fetch: 502 Bad Gateway | TaxBracket: Failed to fetch: 502 Bad Gateway
- Set<Role> | "@drone,@cube" | QueryComponent [Role] | Backend request failed for Role: Failed to fetch: 502 Bad Gateway
- Set<SpreadSheet> | "sheet:1X2Y3Z4, sheet:9A8B7C6D" | SetInput | Expected pasted set output sheet:1X2Y3Z4,sheet:9A8B7C6D, got (empty).
- String[GuildCoalition] | "dnr" | QueryComponent [String[GuildCoalition]] | Backend request failed for String[GuildCoalition]: Failed to fetch: 502 Bad Gateway
- String[MenuLabel] | "Confirm" | QueryComponent [String[MenuLabel]] | Backend request failed for String[MenuLabel]: Failed to fetch: 502 Bad Gateway
- TaxBracket | "26171" | QueryComponent [TaxBracket] | Backend request failed for TaxBracket: Failed to fetch: 502 Bad Gateway
- TaxBracket | "tax_id=26171" | QueryComponent [TaxBracket] | Backend request failed for TaxBracket: Failed to fetch: 502 Bad Gateway
- TaxBracket | "https://politicsandwar.com/index.php?id=15&tax_id=26171" | QueryComponent [TaxBracket] | Backend request failed for TaxBracket: Failed to fetch: 502 Bad Gateway
- TextChannel | "#xdn" | QueryComponent [TextChannel] | Backend request failed for TextChannel: Failed to fetch: 502 Bad Gateway
- TextChannel | "672310912090243092" | QueryComponent [TextChannel] | Backend request failed for TextChannel: Failed to fetch: 502 Bad Gateway
- TextChannel | "<#672310912090243092>" | QueryComponent [TextChannel] | Backend request failed for TextChannel: Failed to fetch: 502 Bad Gateway
- Treaty | "1234:5678" | QueryComponent [Treaty] | Backend request failed for Treaty: Failed to fetch: 502 Bad Gateway
- User | "@xdnw" | QueryComponent [User] | Backend request failed for User: Failed to fetch: 502 Bad Gateway
- User | "xdnw" | QueryComponent [User] | Backend request failed for User: Failed to fetch: 502 Bad Gateway
- User | "664156861033086987" | QueryComponent [User] | Backend request failed for User: Failed to fetch: 502 Bad Gateway
- User | "Borg" | QueryComponent [User] | Backend request failed for User: Failed to fetch: 502 Bad Gateway
- User | "<@664156861033086987>" | QueryComponent [User] | Backend request failed for User: Failed to fetch: 502 Bad Gateway

## Unsupported Or Skipped

- ChatModel | "gpt-4o-mini" | UnknownType | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput.
- DataQueryMode | "PLAN" | UnknownType | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput.
- ExecuteMode | "VALIDATE" | UnknownType | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput.
- ImageType | "CLEAR" | UnknownType | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput.
- ImageType | "CAPTCHA_NORMAL" | UnknownType | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput.
- SelectionAlias | "nation:*,#cities>10" | UnknownType | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput.
