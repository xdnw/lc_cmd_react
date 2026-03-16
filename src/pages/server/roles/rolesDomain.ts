import { COMMANDS } from "@/lib/commands";
import type {
  AutoRoleBulkResult,
  AutoRoleIssue,
  AutoRoleMemberResult,
  AutoRoleMaskedMember,
  AutoRoleIssueType,
  UnmaskedReason,
  WebAutoRoleRoles,
  WebRoleAliases,
} from "@/lib/apitypes";
import type { SettingKey } from "@/pages/settings/settingsDomain";

const rolesOptionConfig = COMMANDS.options.Roles;
const JAVA_INTEGER_MAX_VALUE = 2147483647;
type AutoRoleManagedRoles = WebAutoRoleRoles;

export const LOCUTUS_ROLE_OPTIONS = [
  ...((typeof rolesOptionConfig === "string" ? [] : rolesOptionConfig.options) ?? []),
] as const;

export const AUTO_ROLE_SETTING_KEYS = [
  "AUTONICK",
  "AUTOROLE_ALLIANCES",
  "AUTOROLE_ALLIANCE_RANK",
  "AUTOROLE_ALLY_GOV",
  "AUTOROLE_ALLY_ROLES",
  "AUTOROLE_MEMBER_APPS",
  "AUTOROLE_TOP_X",
  "CONDITIONAL_ROLES",
] as const satisfies readonly SettingKey[];

export type RoleAliasMapping = {
  key: string;
  allianceId: number | null;
  scopeLabel: string;
  roleId: string; // kept as string — Discord snowflakes exceed Number.MAX_SAFE_INTEGER
  discordRoleName: string | null;
};

export type RoleAliasEntry = {
  ordinal: number;
  roleName: string;
  isKnownRole: boolean;
  isInvalid: boolean;
  mappings: RoleAliasMapping[];
  mappingCount: number;
  hasAllianceSpecificMappings: boolean;
};

export type RoleAliasSummary = {
  totalRoles: number;
  mappedRoles: number;
  invalidRoles: number;
  totalMappings: number;
  allianceScopedMappings: number;
};

export type ManagedRoleSummary = {
  total: number;
  allianceRoles: number;
  cityRoles: number;
  taxRoles: number;
  duplicateKeys: number;
};

export type AutoRoleMemberReference = {
  userId: number;
  username: string;
  displayName: string;
  nationId: number | null;
  allianceId: number | null;
};

export type AutoRoleBulkRoleBucket = {
  roleId: number;
  members: AutoRoleMemberReference[];
};

export type AutoRoleBulkNicknameBucket = {
  nickname: string;
  members: AutoRoleMemberReference[];
};

export type AutoRoleBulkIssueMemberEntry = {
  member: AutoRoleMemberReference;
  issues: AutoRoleIssue[];
};

export type AutoRoleBulkIssueBucket = {
  type: AutoRoleIssueType;
  members: AutoRoleBulkIssueMemberEntry[];
};

export type AutoRoleTopLevelIssueBucket = {
  type: AutoRoleIssueType;
  issues: AutoRoleIssue[];
};

export type AutoRoleMaskedMemberBucket = {
  reason: UnmaskedReason;
  members: AutoRoleMemberReference[];
};

export type AutoRoleBulkSummary = {
  plannedAdds: AutoRoleBulkRoleBucket[];
  plannedRemovals: AutoRoleBulkRoleBucket[];
  plannedNicknames: AutoRoleBulkNicknameBucket[];
  plannedNicknameClears: AutoRoleMemberReference[];
  appliedAdds: AutoRoleBulkRoleBucket[];
  appliedRemovals: AutoRoleBulkRoleBucket[];
  appliedNicknames: AutoRoleBulkNicknameBucket[];
  appliedNicknameClears: AutoRoleMemberReference[];
  planningIssues: AutoRoleBulkIssueBucket[];
  executionIssues: AutoRoleBulkIssueBucket[];
  topLevelIssues: AutoRoleTopLevelIssueBucket[];
  maskedNonMembers: AutoRoleMaskedMemberBucket[];
};

function parseOrdinalKey(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseAllianceScopeKey(value: string): { allianceId: number | null; scopeLabel: string } {
  const normalized = value.trim();
  if (!normalized || normalized === "0" || normalized === "*" || normalized.toLowerCase() === "global") {
    return { allianceId: null, scopeLabel: "Global" };
  }

  const parsed = Number.parseInt(normalized, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return {
      allianceId: parsed,
      scopeLabel: `AA:${parsed}`,
    };
  }

  return {
    allianceId: null,
    scopeLabel: normalized,
  };
}

/**
 * Validate and normalise a raw role ID value arriving from JSON.
 *
 * Because JSON.parse() converts every bare number to a JS double, any
 * snowflake that exceeds Number.MAX_SAFE_INTEGER (2^53 − 1) will already
 * have been rounded by the time this function is called.  The backend
 * must therefore serialise Discord role IDs as JSON strings, not numbers.
 * This function accepts both forms for resilience but always returns a
 * plain decimal string so that the rest of the codebase never touches a
 * JS number for a role ID.
 *
 * Returns null when the value is absent, zero, or non-numeric.
 */
function normaliseRoleId(raw: unknown): string | null {
  if (raw == null) return null;

  const str = String(raw).trim();
  if (!str || str === "0") return null;

  // Reject anything that is not a plain non-negative integer string.
  // The regex intentionally rejects scientific notation (e.g. "1.2e18")
  // which would indicate the backend sent a number that was already
  // mangled by JSON.parse().
  if (!/^\d+$/.test(str)) return null;

  return str;
}

/** Compare two snowflake strings numerically without converting to Number. */
function compareRoleIds(a: string, b: string): number {
  // Longer string is always larger; equal length falls back to lexicographic
  // order which matches numeric order for zero-padded-free decimal strings.
  if (a.length !== b.length) return a.length - b.length;
  return a < b ? -1 : a > b ? 1 : 0;
}

function normalizeText(value: string | undefined): string {
  return value?.trim() ?? "";
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function compareMemberReferences(left: AutoRoleMemberReference, right: AutoRoleMemberReference): number {
  return compareText(left.displayName, right.displayName)
    || compareText(left.username, right.username)
    || left.userId - right.userId;
}

function toMemberReference(member: Pick<AutoRoleMemberResult | AutoRoleMaskedMember, "user_id" | "username" | "display_name" | "nation_id"> & { alliance_id?: number }): AutoRoleMemberReference {
  return {
    userId: member.user_id,
    username: normalizeText(member.username),
    displayName: getAutoRoleMemberDisplayName(member),
    nationId: member.nation_id ?? null,
    allianceId: member.alliance_id ?? null,
  };
}

function finalizeMemberMap(memberMap: Map<number, AutoRoleMemberReference>): AutoRoleMemberReference[] {
  return Array.from(memberMap.values()).sort(compareMemberReferences);
}

function compareRoleBuckets(left: AutoRoleBulkRoleBucket, right: AutoRoleBulkRoleBucket): number {
  return right.members.length - left.members.length || left.roleId - right.roleId;
}

function compareNicknameBuckets(left: AutoRoleBulkNicknameBucket, right: AutoRoleBulkNicknameBucket): number {
  return right.members.length - left.members.length || compareText(left.nickname, right.nickname);
}

function compareIssueBuckets(left: AutoRoleBulkIssueBucket, right: AutoRoleBulkIssueBucket): number {
  return right.members.length - left.members.length || compareText(left.type, right.type);
}

function compareTopLevelIssueBuckets(left: AutoRoleTopLevelIssueBucket, right: AutoRoleTopLevelIssueBucket): number {
  return right.issues.length - left.issues.length || compareText(left.type, right.type);
}

function compareMaskedBuckets(left: AutoRoleMaskedMemberBucket, right: AutoRoleMaskedMemberBucket): number {
  return right.members.length - left.members.length || compareText(left.reason, right.reason);
}

function buildRoleBuckets(
  members: readonly AutoRoleMemberResult[],
  getRoleIds: (member: AutoRoleMemberResult) => readonly number[],
): AutoRoleBulkRoleBucket[] {
  const buckets = new Map<number, Map<number, AutoRoleMemberReference>>();

  members.forEach((member) => {
    const reference = toMemberReference(member);
    const seenRoleIds = new Set<number>();

    getRoleIds(member).forEach((roleId) => {
      if (seenRoleIds.has(roleId)) {
        return;
      }

      seenRoleIds.add(roleId);
      const memberMap = buckets.get(roleId) ?? new Map<number, AutoRoleMemberReference>();
      memberMap.set(reference.userId, reference);
      buckets.set(roleId, memberMap);
    });
  });

  return Array.from(buckets.entries())
    .map(([roleId, memberMap]) => ({
      roleId,
      members: finalizeMemberMap(memberMap),
    }))
    .sort(compareRoleBuckets);
}

function buildNicknameBuckets(
  members: readonly AutoRoleMemberResult[],
  getNickname: (member: AutoRoleMemberResult) => string | undefined,
): AutoRoleBulkNicknameBucket[] {
  const buckets = new Map<string, Map<number, AutoRoleMemberReference>>();

  members.forEach((member) => {
    const nickname = normalizeText(getNickname(member));
    if (!nickname) {
      return;
    }

    const reference = toMemberReference(member);
    const memberMap = buckets.get(nickname) ?? new Map<number, AutoRoleMemberReference>();
    memberMap.set(reference.userId, reference);
    buckets.set(nickname, memberMap);
  });

  return Array.from(buckets.entries())
    .map(([nickname, memberMap]) => ({
      nickname,
      members: finalizeMemberMap(memberMap),
    }))
    .sort(compareNicknameBuckets);
}

function buildMemberList(
  members: readonly AutoRoleMemberResult[],
  predicate: (member: AutoRoleMemberResult) => boolean,
): AutoRoleMemberReference[] {
  const memberMap = new Map<number, AutoRoleMemberReference>();

  members.forEach((member) => {
    if (!predicate(member)) {
      return;
    }

    const reference = toMemberReference(member);
    memberMap.set(reference.userId, reference);
  });

  return finalizeMemberMap(memberMap);
}

function buildIssueBuckets(
  members: readonly AutoRoleMemberResult[],
  getIssues: (member: AutoRoleMemberResult) => readonly AutoRoleIssue[],
): AutoRoleBulkIssueBucket[] {
  const buckets = new Map<AutoRoleIssueType, Map<number, AutoRoleBulkIssueMemberEntry>>();

  members.forEach((member) => {
    const reference = toMemberReference(member);

    getIssues(member).forEach((issue) => {
      const memberIssues = buckets.get(issue.type) ?? new Map<number, AutoRoleBulkIssueMemberEntry>();
      const existing = memberIssues.get(reference.userId);

      if (existing) {
        existing.issues.push(issue);
      } else {
        memberIssues.set(reference.userId, {
          member: reference,
          issues: [issue],
        });
      }

      buckets.set(issue.type, memberIssues);
    });
  });

  return Array.from(buckets.entries())
    .map(([type, memberIssues]) => ({
      type,
      members: Array.from(memberIssues.values()).sort((left, right) => compareMemberReferences(left.member, right.member)),
    }))
    .sort(compareIssueBuckets);
}

function buildTopLevelIssueBuckets(issues: readonly AutoRoleIssue[]): AutoRoleTopLevelIssueBucket[] {
  const buckets = new Map<AutoRoleIssueType, AutoRoleIssue[]>();

  issues.forEach((issue) => {
    const bucket = buckets.get(issue.type) ?? [];
    bucket.push(issue);
    buckets.set(issue.type, bucket);
  });

  return Array.from(buckets.entries())
    .map(([type, bucketIssues]) => ({
      type,
      issues: bucketIssues,
    }))
    .sort(compareTopLevelIssueBuckets);
}

function buildMaskedMemberBuckets(maskedMembers: readonly AutoRoleMaskedMember[]): AutoRoleMaskedMemberBucket[] {
  const buckets = new Map<UnmaskedReason, Map<number, AutoRoleMemberReference>>();

  maskedMembers.forEach((member) => {
    const reference = toMemberReference(member);
    const memberMap = buckets.get(member.reason) ?? new Map<number, AutoRoleMemberReference>();
    memberMap.set(reference.userId, reference);
    buckets.set(member.reason, memberMap);
  });

  return Array.from(buckets.entries())
    .map(([reason, memberMap]) => ({
      reason,
      members: finalizeMemberMap(memberMap),
    }))
    .sort(compareMaskedBuckets);
}

export function getLocutusRoleName(ordinal: number): string {
  return LOCUTUS_ROLE_OPTIONS[ordinal] ?? `Role #${ordinal}`;
}

export function buildRoleAliasEntries(data?: WebRoleAliases | null): RoleAliasEntry[] {
  const mappingsByOrdinal = data?.mappings ?? {};
  const invalidOrdinals = new Set(data?.invalid_role_ordinals ?? []);
  const ordinals = new Set<number>(LOCUTUS_ROLE_OPTIONS.map((_, index) => index));

  Object.keys(mappingsByOrdinal).forEach((key) => {
    const parsed = parseOrdinalKey(key);
    if (parsed != null) {
      ordinals.add(parsed);
    }
  });

  invalidOrdinals.forEach((ordinal) => ordinals.add(ordinal));

  return Array.from(ordinals)
    .sort((left, right) => left - right)
    .map((ordinal) => {
      const rawMappings = mappingsByOrdinal[String(ordinal)] ?? {};
      const mappings = Object.entries(rawMappings)
        .map(([scopeKey, rawRoleId]) => {
          // Never convert to Number — use the string representation directly
          // to preserve full 64-bit snowflake precision.
          const roleId = normaliseRoleId(rawRoleId);
          if (roleId === null) return null;

          const scope = parseAllianceScopeKey(scopeKey);
          return {
            key: `${ordinal}:${scopeKey}:${roleId}`,
            allianceId: scope.allianceId,
            scopeLabel: scope.scopeLabel,
            roleId,
            // discord_role_names is keyed by role ID string on the backend;
            // look up directly without an intermediate Number conversion.
            discordRoleName: data?.discord_role_names?.[roleId] ?? null,
          } satisfies RoleAliasMapping;
        })
        .filter((mapping): mapping is RoleAliasMapping => mapping != null)
        .sort((left, right) => {
          if (left.allianceId == null && right.allianceId != null) return -1;
          if (left.allianceId != null && right.allianceId == null) return 1;

          const allianceDiff = (left.allianceId ?? 0) - (right.allianceId ?? 0);
          if (allianceDiff !== 0) return allianceDiff;

          // Use string-safe comparison instead of numeric subtraction.
          return compareRoleIds(left.roleId, right.roleId);
        });

      return {
        ordinal,
        roleName: getLocutusRoleName(ordinal),
        isKnownRole: ordinal >= 0 && ordinal < LOCUTUS_ROLE_OPTIONS.length,
        isInvalid: invalidOrdinals.has(ordinal),
        mappings,
        mappingCount: mappings.length,
        hasAllianceSpecificMappings: mappings.some((mapping) => mapping.allianceId != null),
      } satisfies RoleAliasEntry;
    });
}

export function summarizeRoleAliases(entries: readonly RoleAliasEntry[]): RoleAliasSummary {
  const totalMappings = entries.reduce((sum, entry) => sum + entry.mappingCount, 0);
  const allianceScopedMappings = entries.reduce(
    (sum, entry) => sum + entry.mappings.filter((mapping) => mapping.allianceId != null).length,
    0,
  );

  return {
    totalRoles: entries.length,
    mappedRoles: entries.filter((entry) => entry.mappingCount > 0).length,
    invalidRoles: entries.filter((entry) => entry.isInvalid).length,
    totalMappings,
    allianceScopedMappings,
  };
}

export function summarizeManagedRoles(data?: AutoRoleManagedRoles | null): ManagedRoleSummary {
  const allianceRoles = data?.alliance_roles.length ?? 0;
  const cityRoles = data?.city_roles.length ?? 0;
  const taxRoles = data?.tax_roles.length ?? 0;
  const duplicateKeys = [
    ...(data?.alliance_roles ?? []),
    ...(data?.city_roles ?? []),
    ...(data?.tax_roles ?? []),
  ].filter((entry) => entry.duplicate_key).length;

  return {
    total: allianceRoles + cityRoles + taxRoles,
    allianceRoles,
    cityRoles,
    taxRoles,
    duplicateKeys,
  };
}

export function mergeRoleNameMaps(...maps: Array<Record<string, string> | undefined | null>): Record<string, string> {
  return maps.reduce<Record<string, string>>((merged, nextMap) => {
    if (!nextMap) return merged;
    return { ...merged, ...nextMap };
  }, {});
}

// All public helpers that accept a roleId now take `string` so that callers
// are forced by the type system to avoid an intermediate Number conversion.

export function getDiscordRoleName(roleId: string, roleNames?: Record<string, string> | null): string | null {
  const knownName = roleNames?.[roleId]?.trim();
  return knownName ? knownName : null;
}

export function formatDiscordRoleName(roleId: string, roleNames?: Record<string, string> | null): string {
  const knownName = getDiscordRoleName(roleId, roleNames);
  return knownName ? `@${knownName.replace(/^@+/, "")}` : `Role #${roleId}`;
}

export function formatDiscordRoleLabel(roleId: string, roleNames?: Record<string, string> | null): string {
  const formattedName = formatDiscordRoleName(roleId, roleNames);
  return formattedName.startsWith("@") ? `${formattedName} (${roleId})` : formattedName;
}

export function getRoleMention(roleId: string): string {
  return `<@&${roleId}>`;
}

export function formatAllianceLabel(allianceId: number, allianceNames?: Record<string, string> | null): string {
  const knownName = allianceNames?.[String(allianceId)]?.trim();
  return knownName ? knownName : `AA:${allianceId}`;
}

export function formatAliasScopeLabel(
  mapping: Pick<RoleAliasMapping, "allianceId" | "scopeLabel">,
  allianceNames?: Record<string, string> | null,
): string {
  return mapping.allianceId != null ? formatAllianceLabel(mapping.allianceId, allianceNames) : mapping.scopeLabel;
}

export function formatCityRoleRangeLabel(rangeStart: number, rangeEnd: number): string {
  if (
    !Number.isFinite(rangeEnd)
    || rangeEnd <= 0
    || rangeEnd < rangeStart
    || rangeEnd >= JAVA_INTEGER_MAX_VALUE
  ) {
    return `c${rangeStart}+`;
  }

  if (rangeStart === rangeEnd) {
    return `c${rangeStart}`;
  }

  return `c${rangeStart}-${rangeEnd}`;
}

export function formatTaxRoleRateLabel(moneyRate: number, rssRate: number): string {
  return `${moneyRate}/${rssRate}`;
}

export function formatAutoRoleIssueType(issueType: AutoRoleIssueType): string {
  return issueType
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatUnmaskedReason(reason: UnmaskedReason): string {
  return reason
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function hasAutoRoleMemberActivity(result: AutoRoleMemberResult): boolean {
  return result.create_roles.length > 0
    || result.add_roles.length > 0
    || result.remove_roles.length > 0
    || Boolean(result.nickname)
    || result.clear_nickname
    || result.issues.length > 0
    || result.added_roles.length > 0
    || result.removed_roles.length > 0
    || Boolean(result.applied_nickname)
    || result.cleared_nickname
    || result.execution_issues.length > 0;
}

export function hasMaskedMemberReason(maskedMember: AutoRoleMaskedMember, expected: UnmaskedReason): boolean {
  return maskedMember.reason === expected;
}

export function getAutoRoleMemberDisplayName(
  member: Pick<AutoRoleMemberResult | AutoRoleMaskedMember, "user_id" | "username" | "display_name">,
): string {
  const displayName = normalizeText(member.display_name);
  if (displayName) {
    return displayName;
  }

  const username = normalizeText(member.username);
  if (username) {
    return username;
  }

  return `User #${member.user_id}`;
}

export function summarizeAutoRoleBulkResult(result: AutoRoleBulkResult): AutoRoleBulkSummary {
  return {
    plannedAdds: buildRoleBuckets(result.results, (member) => member.add_roles),
    plannedRemovals: buildRoleBuckets(result.results, (member) => member.remove_roles),
    plannedNicknames: buildNicknameBuckets(result.results, (member) => member.nickname),
    plannedNicknameClears: buildMemberList(result.results, (member) => member.clear_nickname),
    appliedAdds: buildRoleBuckets(result.results, (member) => member.added_roles),
    appliedRemovals: buildRoleBuckets(result.results, (member) => member.removed_roles),
    appliedNicknames: buildNicknameBuckets(result.results, (member) => member.applied_nickname),
    appliedNicknameClears: buildMemberList(result.results, (member) => member.cleared_nickname),
    planningIssues: buildIssueBuckets(result.results, (member) => member.issues),
    executionIssues: buildIssueBuckets(result.results, (member) => member.execution_issues),
    topLevelIssues: buildTopLevelIssueBuckets(result.execution_issues),
    maskedNonMembers: buildMaskedMemberBuckets(result.masked_non_members),
  };
}