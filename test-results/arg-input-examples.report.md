# ArgInput Example Report

Generated at: 2026-03-08T12:00:00.000Z

## Summary

- Total examples: 260
- Supported examples: 255
- Unsupported examples: 5
- Default failures: 29
- Paste failures: 31
- Unsupported or paste-unfriendly cases: 5

## Default Failures

- AppMenu | "user" | QueryComponent [AppMenu] | Backend request failed for AppMenu: AppMenu requires a guild. Please select a guild.
- AppMenu | "message" | QueryComponent [AppMenu] | Backend request failed for AppMenu: AppMenu requires a guild. Please select a guild.
- DBAlliancePosition | "23212" | QueryComponent [DBAlliancePosition] | Backend request failed for DBAlliancePosition: DBAlliancePosition requires a guild. Please select a guild.
- DBAlliancePosition | "Meow" | QueryComponent [DBAlliancePosition] | Backend request failed for DBAlliancePosition: DBAlliancePosition requires a guild. Please select a guild.
- DBLoan | "1234" | QueryComponent [DBLoan] | Backend returned 0 options for DBLoan.
- DBNation | "<@664156861033086987>" | QueryComponent [DBNation] | No backend match for "<@664156861033086987>". Unmatched: <@664156861033086987>. Backend options (18258): Viltrum empire [745350], Weona [673189], United Kingdom 2011 [747724], Pakistan99 [752210], Hindu Swaraj [751023], Jordandia [572139], New Sealand [754584], BlackWaterCorporation [160416], CANZUK [435864], Aaryavrt [749836] ... (+18248 more).
- GrantRequest | "1234" | QueryComponent [GrantRequest] | Backend request failed for GrantRequest: GrantRequest requires a guild. Please select a guild.
- Map<Research,Integer> | "{GROUND_COST=12,AIR_CAPACITY=2}" | MapInput | Expected 2 map entries, rendered 1.
- Map<ResourceType,Double> | "{money=1.2,food=6}" | MapInput | Expected 2 map entries, rendered 0.
- Member | "@xdnw" | QueryComponent [Member] | Backend request failed for Member: Member requires a guild. Please select a guild.
- Member | "borg" | QueryComponent [Member] | Backend request failed for Member: Member requires a guild. Please select a guild.
- NationOrAllianceOrGuildOrTaxid | "tax_id=26171" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | No backend match for "tax_id=26171". Unmatched: tax_id=26171. Backend options (18817): Viltrum empire [745350], Weona [673189], United Kingdom 2011 [747724], Pakistan99 [752210], Hindu Swaraj [751023], Jordandia [572139], New Sealand [754584], BlackWaterCorporation [160416], CANZUK [435864], Aaryavrt [749836] ... (+18807 more). Warning: TaxBracket: TaxBracket requires a guild. Please select a guild.
- NationOrAllianceOrGuildOrTaxid | "https://politicsandwar.com/index.php?id=15&tax_id=26171" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | No backend match for "https://politicsandwar.com/index.php?id=15&tax_id=26171". Unmatched: https://politicsandwar.com/index.php?id=15&tax_id=26171. Backend options (18817): Viltrum empire [745350], Weona [673189], United Kingdom 2011 [747724], Pakistan99 [752210], Hindu Swaraj [751023], Jordandia [572139], New Sealand [754584], BlackWaterCorporation [160416], CANZUK [435864], Aaryavrt [749836] ... (+18807 more). Warning: TaxBracket: TaxBracket requires a guild. Please select a guild.
- Role | "@drone" | QueryComponent [Role] | Backend request failed for Role: Role requires a guild. Please select a guild.
- Role | "drone" | QueryComponent [Role] | Backend request failed for Role: Role requires a guild. Please select a guild.
- Role | "672263980193939469" | QueryComponent [Role] | Backend request failed for Role: Role requires a guild. Please select a guild.
- SelectionAlias | "nation:*,#cities>10" | QueryComponent [SelectionAlias] | Backend request failed for SelectionAlias: SelectionAlias requires a guild. Please select a guild.
- Set<Category> | "interview,test,info" | QueryComponent [Category] | Backend request failed for Category: Category requires a guild. Please select a guild.
- Set<Member> | "*" | QueryComponent [Member] | Backend request failed for Member: Member requires a guild. Please select a guild.
- Set<NationOrAllianceOrGuildOrTaxid> | "borg,AA:Singularity,672217848311054346,tax_id=26171" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | No backend match for "borg,AA:Singularity,672217848311054346,tax_id=26171". Unmatched: tax_id=26171. Backend options (18817): Viltrum empire [745350], Weona [673189], United Kingdom 2011 [747724], Pakistan99 [752210], Hindu Swaraj [751023], Jordandia [572139], New Sealand [754584], BlackWaterCorporation [160416], CANZUK [435864], Aaryavrt [749836] ... (+18807 more). Warning: TaxBracket: TaxBracket requires a guild. Please select a guild.
- Set<Role> | "@drone,@cube" | QueryComponent [Role] | Backend request failed for Role: Role requires a guild. Please select a guild.
- TaxBracket | "26171" | QueryComponent [TaxBracket] | Backend request failed for TaxBracket: TaxBracket requires a guild. Please select a guild.
- TaxBracket | "tax_id=26171" | QueryComponent [TaxBracket] | Backend request failed for TaxBracket: TaxBracket requires a guild. Please select a guild.
- TaxBracket | "https://politicsandwar.com/index.php?id=15&tax_id=26171" | QueryComponent [TaxBracket] | Backend request failed for TaxBracket: TaxBracket requires a guild. Please select a guild.
- TextChannel | "#xdn" | QueryComponent [TextChannel] | Backend request failed for TextChannel: TextChannel requires a guild. Please select a guild.
- TextChannel | "672310912090243092" | QueryComponent [TextChannel] | Backend request failed for TextChannel: TextChannel requires a guild. Please select a guild.
- TextChannel | "<#672310912090243092>" | QueryComponent [TextChannel] | Backend request failed for TextChannel: TextChannel requires a guild. Please select a guild.
- Treaty | "1234:5678" | QueryComponent [Treaty] | No backend match for "1234:5678". Unmatched: 1234:5678. Backend options (517): NAP:Defensive Treaty Organization/AA:14120 [31331], MDOAP:United Socialist Nations/Paddys Pub [32716], NAP:The Imperial Grand House/Chimera [31793], OFFSHORE:United Workers Network/Borgs Cat Cafe [32980], ODP:The Commonwealth of orbis/Agora [32584], MDOAP:Singularity/House Stark [32651], MDOAP:Federated States of Orbis/The Fremen [31200], MDP:Elastic Bands/The Rising Coast [31727], MDOAP:Singularity/The Fighting Pacifists [32650], PROTECTORATE:Yarr/AA:12544 [29615] ... (+507 more).
- User | "Borg" | QueryComponent [User] | No backend match for "Borg". Unmatched: Borg. Backend options (252): cadn [228928965845188608], imgnAI [1054891522786611231], epicbeetle626 [501191012493033482], assisaki [1051851858735534141], kztor [202523678078926858], dr.rush [217897994375266304], booboo5298 [1123729132379971656], Ticket Tool [557628352828014614], therealiodinamacer [974805584845099028], pwmernal [1338479826637557760] ... (+242 more).

## Paste Failures

- AppMenu | "user" | QueryComponent [AppMenu] | Backend request failed for AppMenu: AppMenu requires a guild. Please select a guild.
- AppMenu | "message" | QueryComponent [AppMenu] | Backend request failed for AppMenu: AppMenu requires a guild. Please select a guild.
- DBAlliancePosition | "23212" | QueryComponent [DBAlliancePosition] | Backend request failed for DBAlliancePosition: DBAlliancePosition requires a guild. Please select a guild.
- DBAlliancePosition | "Meow" | QueryComponent [DBAlliancePosition] | Backend request failed for DBAlliancePosition: DBAlliancePosition requires a guild. Please select a guild.
- DBLoan | "1234" | QueryComponent [DBLoan] | Backend returned 0 options for DBLoan.
- DBNation | "<@664156861033086987>" | QueryComponent [DBNation] | No backend match for "<@664156861033086987>". Unmatched: <@664156861033086987>. Backend options (18258): Viltrum empire [745350], Weona [673189], United Kingdom 2011 [747724], Pakistan99 [752210], Hindu Swaraj [751023], Jordandia [572139], New Sealand [754584], BlackWaterCorporation [160416], CANZUK [435864], Aaryavrt [749836] ... (+18248 more).
- GrantRequest | "1234" | QueryComponent [GrantRequest] | Backend request failed for GrantRequest: GrantRequest requires a guild. Please select a guild.
- Map<MilitaryUnit,Long> | "{soldiers=12,tanks=56}" | MapInput | Expected pasted map output soldiers=12,tanks=56, got (empty).
- Map<Research,Integer> | "{GROUND_COST=12,AIR_CAPACITY=2}" | MapInput | Expected pasted map output GROUND_COST=12,AIR_CAPACITY=2, got (empty).
- Map<ResourceType,Double> | "{money=1.2,food=6}" | MapInput | Expected pasted map output MONEY=1.2,FOOD=6, got (empty).
- Map<ResourceType,Double> | "{food=1}*1.5" | MapInput | Expected pasted map output {food=1}*1.5, got (empty).
- Member | "@xdnw" | QueryComponent [Member] | Backend request failed for Member: Member requires a guild. Please select a guild.
- Member | "borg" | QueryComponent [Member] | Backend request failed for Member: Member requires a guild. Please select a guild.
- NationOrAllianceOrGuildOrTaxid | "tax_id=26171" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | No backend match for "tax_id=26171". Unmatched: tax_id=26171. Backend options (18817): Viltrum empire [745350], Weona [673189], United Kingdom 2011 [747724], Pakistan99 [752210], Hindu Swaraj [751023], Jordandia [572139], New Sealand [754584], BlackWaterCorporation [160416], CANZUK [435864], Aaryavrt [749836] ... (+18807 more). Warning: TaxBracket: TaxBracket requires a guild. Please select a guild.
- NationOrAllianceOrGuildOrTaxid | "https://politicsandwar.com/index.php?id=15&tax_id=26171" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | No backend match for "https://politicsandwar.com/index.php?id=15&tax_id=26171". Unmatched: https://politicsandwar.com/index.php?id=15&tax_id=26171. Backend options (18817): Viltrum empire [745350], Weona [673189], United Kingdom 2011 [747724], Pakistan99 [752210], Hindu Swaraj [751023], Jordandia [572139], New Sealand [754584], BlackWaterCorporation [160416], CANZUK [435864], Aaryavrt [749836] ... (+18807 more). Warning: TaxBracket: TaxBracket requires a guild. Please select a guild.
- Role | "@drone" | QueryComponent [Role] | Backend request failed for Role: Role requires a guild. Please select a guild.
- Role | "drone" | QueryComponent [Role] | Backend request failed for Role: Role requires a guild. Please select a guild.
- Role | "672263980193939469" | QueryComponent [Role] | Backend request failed for Role: Role requires a guild. Please select a guild.
- SelectionAlias | "nation:*,#cities>10" | QueryComponent [SelectionAlias] | Backend request failed for SelectionAlias: SelectionAlias requires a guild. Please select a guild.
- Set<Category> | "interview,test,info" | QueryComponent [Category] | Backend request failed for Category: Category requires a guild. Please select a guild.
- Set<Member> | "*" | QueryComponent [Member] | Backend request failed for Member: Member requires a guild. Please select a guild.
- Set<NationOrAllianceOrGuildOrTaxid> | "borg,AA:Singularity,672217848311054346,tax_id=26171" | CompositeQueryComponent [DBNation, DBAlliance, GuildDB, TaxBracket] | No backend match for "borg,AA:Singularity,672217848311054346,tax_id=26171". Unmatched: tax_id=26171. Backend options (18817): Viltrum empire [745350], Weona [673189], United Kingdom 2011 [747724], Pakistan99 [752210], Hindu Swaraj [751023], Jordandia [572139], New Sealand [754584], BlackWaterCorporation [160416], CANZUK [435864], Aaryavrt [749836] ... (+18807 more). Warning: TaxBracket: TaxBracket requires a guild. Please select a guild.
- Set<Role> | "@drone,@cube" | QueryComponent [Role] | Backend request failed for Role: Role requires a guild. Please select a guild.
- TaxBracket | "26171" | QueryComponent [TaxBracket] | Backend request failed for TaxBracket: TaxBracket requires a guild. Please select a guild.
- TaxBracket | "tax_id=26171" | QueryComponent [TaxBracket] | Backend request failed for TaxBracket: TaxBracket requires a guild. Please select a guild.
- TaxBracket | "https://politicsandwar.com/index.php?id=15&tax_id=26171" | QueryComponent [TaxBracket] | Backend request failed for TaxBracket: TaxBracket requires a guild. Please select a guild.
- TextChannel | "#xdn" | QueryComponent [TextChannel] | Backend request failed for TextChannel: TextChannel requires a guild. Please select a guild.
- TextChannel | "672310912090243092" | QueryComponent [TextChannel] | Backend request failed for TextChannel: TextChannel requires a guild. Please select a guild.
- TextChannel | "<#672310912090243092>" | QueryComponent [TextChannel] | Backend request failed for TextChannel: TextChannel requires a guild. Please select a guild.
- Treaty | "1234:5678" | QueryComponent [Treaty] | No backend match for "1234:5678". Unmatched: 1234:5678. Backend options (517): NAP:Defensive Treaty Organization/AA:14120 [31331], MDOAP:United Socialist Nations/Paddys Pub [32716], NAP:The Imperial Grand House/Chimera [31793], OFFSHORE:United Workers Network/Borgs Cat Cafe [32980], ODP:The Commonwealth of orbis/Agora [32584], MDOAP:Singularity/House Stark [32651], MDOAP:Federated States of Orbis/The Fremen [31200], MDP:Elastic Bands/The Rising Coast [31727], MDOAP:Singularity/The Fighting Pacifists [32650], PROTECTORATE:Yarr/AA:12544 [29615] ... (+507 more).
- User | "Borg" | QueryComponent [User] | No backend match for "Borg". Unmatched: Borg. Backend options (252): cadn [228928965845188608], imgnAI [1054891522786611231], epicbeetle626 [501191012493033482], assisaki [1051851858735534141], kztor [202523678078926858], dr.rush [217897994375266304], booboo5298 [1123729132379971656], Ticket Tool [557628352828014614], therealiodinamacer [974805584845099028], pwmernal [1338479826637557760] ... (+242 more).

## Unsupported Or Skipped

- ChatModel | "gpt-4o-mini" | UnknownType | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput.
- DataQueryMode | "PLAN" | UnknownType | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput.
- ExecuteMode | "VALIDATE" | UnknownType | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput.
- ImageType | "CLEAR" | UnknownType | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput.
- ImageType | "CAPTCHA_NORMAL" | UnknownType | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput. | unsupported: Type is not currently supported by ArgInput.
