TODO:
Fix paste into custom table not working unless edit text
Make cumulative revenue/growth etc. prompt for num days
- Shift things to nation list page
- Add different views in nation list page (to determine which options get shown as primary buttons, and which are under a `More Options`)

When running a command, link to any pages that host it (that the user can use, otherwise link to the prereq page, such as login)

/help argument
/help command

Argument list

- /help find_argument

Command list

- /help find_command

Placeholder list:
/help find_nation_placeholder

## Counter if has wars - prominent if wars against current guild

/war counter auto
/spy counter

Reports:
/report add
/report analyze
/report comment add
/report comment delete
/report remove
/report search
/report show
/report sheet generate

If member of alliance or guild (and has perm)
/nation stockpile
/nation set rank
/nation set taxbracket

- View account (with guild)
- /interview create (if interviews are enabled)

## Guild grant templates

/grant_template list

/grant_template delete
/grant_template disable
/grant_template enable
/grant_template info
/grant_template send

/grant_template create build
/grant_template create city
/grant_template create infra
/grant_template create land
/grant_template create project
/grant_template create raws
/grant_template create warchest

# Guild - Discord role

/role addRoleToAllMembers
/role autoassign
/role autorole
/role clearAllianceRoles
/role clearNicks
/role hasRole
/role mask
/role mask_sheet

/self add
/self create
/self list
/self remove

/role removeAssignableRole
/role setAlias
/role unregister

# Guild taxes extends NationList taxes

/nation set taxbracketAuto
/nation set taxinternalAuto
/tax set_from_sheet

# Guild mail

/mail search
/mail read
/mail reply
/mail send
/mail sheet

/mail targets
/mail web_login

# Nation list escrow

/escrow add
/escrow set
/escrow set_sheet
/escrow view_sheet

# Nation cities

/city cost

# Nation city

/city cost
/city optimalBuild
/building cost
/city revenue
/infra cost
/infra roi

# Nation (SELF)

/bank deposit
/me

# Color blocs

/color revenue

# Guild extends NationList

- Invite locutus: /invite
- Link to # guild settings
- Link to announcements
- War room management button
- Link to builds
  -> Link to templates
  -> interviews (if enabled)

/admin importEmoji

# Builds

/build add
/build delete
/build assign
/build get
/build listall

## Guild blockades

-> TODO: List of nations blockaded / the requests
/war blockade cancelRequest
/war blockade request

## Guild settings

List of settings and their commands
/help find_setting
/settings delete
/settings info
/settings sheets
-> Group settings by category and have pages for each

# Guild banking

/transfer bulk
/transfer raws
/transfer resources
/transfer self
/transfer warchest

/transfer internal from_nation_account
/transfer internal from_offshore_account

/bank import
/bank limits setTransferLimit
/bank deposit
/deposits addSheet
/deposits add
/deposits reset
/deposits sheet

/sheets_econ IngameNationTransfersByReceiver
/sheets_econ IngameNationTransfersBySender
/sheets_econ getIngameNationTransfers
/sheets_econ getNationsInternalTransfers
/sheets_econ taxBracketSheet
/sheets_econ taxRecords
/sheets_econ taxRevenue

/sheets_econ warReimburseByNationCsv

If has account with offshore
/deposits check (self)

If offshore:
/bank records (prefilled for Offshore)

## Guild grants (links to nation list grants)

## Guild treaties

-> Link coalitions
/treaty list
/treaty approve
/treaty cancel
/treaty gw_nap
/treaty send

# Guild channels/categories

TODO: Assign to setting
/channel channelMembers
/channel memberChannels
/channel members

/channel close current
/channel close inactive
/channel count
/channel create
/channel delete current
/channel delete inactive

/channel rename bulk

/channel setCategory

/channel sort category_filter
/channel sort category_rule_sheet
/channel sort sheet

/channel permissions

/channel move Down
/channel move Up
/channel open

# channel

Send embed template to channel

# embeds (linked from channels)

/embed add command
/embed add modal
/embed add raw
/embed commands
/embed create
/embed info
/embed remove button
/embed rename button
/embed title
/embed update

TODO: All the embed templates

# Announcements

/copyPasta

/announcement archive

## create

/announcement create
/announcement document
/announcement invite

## create

/announcement find
/announcement find_invite

/announcement watermark
/announcement ocr

/announcement read
/announcement view
/announcement list #TODO

# War rooms

Set war server (setting)
/admin sync warrooms
/war room create
/war room delete_for_enemies
/war room delete_planning
/war room from_sheet
/war room list
/war room pin
/war room purge
/war room setCategory
/war room sort

/mail targets

# Guild offshore (if offshore server) - Manage Offshore

/offshore accountSheet
/offshore add

# Guild offshoring - Setup Offshore / Manage Offshoring

/offshore add
/offshore send
/deposits check

## Guild interviews

- Linked on guild page (if enabled)
  /interview channel auto_rename
  /interview create
  /interview iacat
  /interview iachannels
  /interview incentiveRanking
  /interview interviewMessage
  /interview listMentors
  /interview mentee
  /interview mentor
  /interview mymentees
  /interview questions set
  /interview questions view
  /interview recruitmentRankings
  /interview setReferrer
  /interview setreferrerid
  /interview sheet
  /interview sortInterviews
  /interview syncInterviews
  /interview unassignMentee

# coalition

/war dnr
Linked on guild page
Each coalition has a link to the nation list (with a filter for View Nations | All | Active Members, Unslotted Members) - Maybe have these common options to the top of nation list page??

- Description of what colitions are
  /admin clear_deleted_coalition_entries
  /coalition add
  /coalition create
  /coalition delete
  /coalition remove
  /coalition list
  /coalition generate

/coalition sheet

/offshore find for_coalition
/offshore find for_enemies

# Player settings

/credentials addApiKey

/credentials login
/credentials logout

Opt outs:
/alerts audit optout
/alerts beige beigeAlertOptOut
/alerts bounty opt_out
/alerts enemy optout
/alerts login
/role optOut

Trade
-> Link to trade util page
-> Link to nation trade page
/alerts trade list
/alerts trade margin
/alerts trade mistrade
/alerts trade no_offers
/alerts trade price
/alerts trade undercut
/alerts trade unsubscribe

Beige
/alerts beige beigeAlert
/alerts beige beigeAlertMode
/alerts beige beigeAlertRequiredLoot
/alerts beige beigeAlertRequiredStatus
/alerts beige beigeReminders
/alerts beige removeBeigeReminder
/alerts beige setBeigeAlertScoreLeeway
/alerts beige test_auto

Bank alerts
/alerts bank list
/alerts bank min_value
/alerts bank subscribe
/alerts bank unsubscribe

# Baseball

/baseball baseBallChallengeInflow
/baseball baseballChallengeEarningsRanking
/baseball baseballChallengeRanking
/baseball baseballEarningsRanking
/baseball baseballRanking

# Conflicts

/conflict alliance add
/conflict alliance remove
/conflict create
/conflict create_temp
/conflict delete
/conflict edit add_forum_post
/conflict edit casus_bel
/conflict edit category
/conflict edit rename
/conflict edit end
/conflict edit start
/conflict edit status
/conflict edit wiki

/conflict featured add_rule
/conflict featured list_rules
/conflict featured remove_rule

/conflict info
/conflict list

/conflict purge featured
/conflict purge user_generated
/conflict sync alliance_names
/conflict sync multiple_sources
/conflict sync recalculate_graphs
/conflict sync recalculate_tables
/conflict sync website
/conflict sync wiki_all
/conflict sync wiki_page

# Wars list

# War page

/stats_war warCost

# War stats

-> Link from nation list page, with enemies being \* or ~enemies
-> Create conflict first, then link to these commands?

/stats_war warRanking
/stats_war warCostRanking
/nation stats warStatusRankingByNation
/sheets_milcom WarCostByResourceSheet
/sheets_milcom WarCostByAllianceSheet
/sheets_milcom WarCostSheet
/sheets_milcom lootValueSheet
/stats_war by_day warcost_global
/stats_war by_day warcost_versus
/stats_war myloot
/stats_war warRanking
/stats_war warStatusRankingByAA
/stats_war warattacksbyday
/stats_war warsCost

/stats_war attack_breakdown sheet
/stats_war attack_breakdown versus

/stats_war attack_ranking

# Graphs

keep existing
/stats_other global_metrics by_time
/stats_other radiationByTurn
/stats_tier attributeTierGraph#

# Cost calculation

-> Linked on home? under tools

- Linked???
  Link to the grant commands
  /building cost
  /project cost
  /city cost
  /infra cost
  /infra roi
  /land cost
  /land roi
  /city optimalbuild
  /project cost
  /project costsheet

# Menu commands

-> Linked in guild
/menu list
TODO: The menu commands

# Custom sheets

/selection_alias list
/selection_alias remove
/selection_alias rename

/sheet_custom add_tab
/sheet_custom auto
/sheet_custom list
/sheet_custom remove_ta
/sheet_custom update
/sheet_custom view

/sheet_template list
/sheet_template remove
/sheet_template remove_column
/sheet_template rename
/sheet_template view

/sheet_template add <type>

/selection_alias add <type>

# Spy sheets

-> Linked under Blitzes / Espionage on guild page
/sheets_milcom convertHidudeSpySheet
/sheets_milcom convertTKRSpySheet
/sheets_milcom convertdtcspysheet

/sheets_milcom validateSpyBlitzSheet
/sheets_milcom SpySheet
/sheets_milcom listSpyTargets
/spy sheet free_ops

/spy tierGraph
/mail targets

# Blitzes

-> Linked under BLitzes / Espionage on guild page
TODO:
/war sheet blitzSheet
/war find blitztargets
/war sheet validate
/mail targets

## Target finder

TODO: Link embed panel
/war find blitztargets
/spy find intel
/spy find target
/war dnr
/war find bounty
/war find damage
/war find enemy
/war find raid
/war find treasure
/war find unblockade -> Link to blockades page
/war find unprotected

# Unsorted

-- Actually useful ---
/embassy

---

/nation sheet NationSheet
/bank stats weeklyInterest
/fun say
/fun stealborgscity
/invite
/modal create

# War Sim

/simulate air
/simulate casualties
/simulate fastBeige
/simulate ground
/simulate naval

# Trade utilities

-> Link to nation trading page
-> Link to trade alerts
/trade average
/trade compareStockpileValueByDay
/trade findProducer
/trade margin
/trade marginByDay
/trade price
/trade priceByDay
/trade profit
/trade ranking
/trade totalByDay
/trade trending
/trade value
/trade volume
/trade volumebyday

# unused, report loan

/report loan add
/report loan purge
/report loan remove
/report loan sheet
/report loan update

# GPT - unused

/chat conversion delete
/chat conversion list
/chat conversion pause
/chat conversion resume
/chat dataset delete
/chat dataset import_sheet
/chat dataset list
/chat dataset select
/chat dataset view
/chat providers list
/chat providers configure
/chat providers pause
/chat providers resume
/chat providers set

# Unused trade offers

/trade offer buy
/trade offer buy_list
/trade offer delete
/trade offer info
/trade offer my_offers
/trade offer sell
/trade offer sell_list
/trade offer update

---
