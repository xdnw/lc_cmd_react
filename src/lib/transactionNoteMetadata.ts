import { COMMANDS } from "@/lib/commands";

type CommandOptionValue<Key extends keyof typeof COMMANDS.options> =
  typeof COMMANDS.options[Key] extends { options: readonly (infer Value extends string)[] }
    ? Value
    : never;

type ProjectOptionValue = CommandOptionValue<"Project">;
type DepositTypeOptionValue = CommandOptionValue<"DepositType">;
export type TransactionNoteDepositTypeKey = Lowercase<DepositTypeOptionValue>;
export type TransactionNoteNationMetaName = CommandOptionValue<"NationMeta">;
export type TransactionNoteProjectNameById = Readonly<Record<number, string>>;

type CommandOptionConfig = { options?: readonly string[] } | string | undefined;

function getCommandOptionValues<Key extends keyof typeof COMMANDS.options>(key: Key): readonly CommandOptionValue<Key>[] {
  const optionConfig = COMMANDS.options[key] as CommandOptionConfig;
  if (!optionConfig || typeof optionConfig === "string") {
    return [];
  }
  return (optionConfig.options ?? []) as readonly CommandOptionValue<Key>[];
}

export const TRANSACTION_NOTE_DEPOSIT_TYPE_KEYS = getCommandOptionValues("DepositType").map(
  (value) => value.toLowerCase() as TransactionNoteDepositTypeKey,
) as readonly TransactionNoteDepositTypeKey[];

export const TRANSACTION_NOTE_NATION_META_NAMES = [
  ...getCommandOptionValues("NationMeta"),
] as readonly TransactionNoteNationMetaName[];

const PROJECT_NOTE_LEGACY_NAMES_BY_ID: Readonly<Record<number, string>> = {
  14: "urban_planning",
  15: "advanced_urban_planning",
  30: "metropolitan_planning",
};

const EXPECTED_PROJECT_OPTION_COUNT = 38;
const EXPECTED_PROJECT_OPTIONS_FINGERPRINT = "f72f3c8d";

// Transaction-note project ids still use a legacy ordinal space. Keep only the
// index mapping into COMMANDS.options.Project here so the names come from one source.
const PROJECT_OPTION_INDEX_BY_TRANSACTION_NOTE_ID = [
  7,
  1,
  0,
  3,
  8,
  5,
  9,
  11,
  6,
  16,
  4,
  2,
  12,
  15,
  null,
  null,
  13,
  14,
  10,
  18,
  17,
  20,
  19,
  22,
  23,
  24,
  21,
  27,
  25,
  26,
  null,
  28,
  29,
  30,
  31,
  32,
  33,
  34,
  35,
  36,
  37,
] as const satisfies readonly (number | null)[];

function fingerprintOptionValues(values: readonly string[]): string {
  const text = values.join("|");
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

function validateProjectOptions(projectOptions: readonly ProjectOptionValue[]): void {
  const actualFingerprint = fingerprintOptionValues(projectOptions);

  if (
    projectOptions.length !== EXPECTED_PROJECT_OPTION_COUNT
    || actualFingerprint !== EXPECTED_PROJECT_OPTIONS_FINGERPRINT
  ) {
    throw new Error(
      [
        "Transaction note project mapping is stale.",
        `Expected COMMANDS.options.Project count ${EXPECTED_PROJECT_OPTION_COUNT} and fingerprint ${EXPECTED_PROJECT_OPTIONS_FINGERPRINT},`,
        `received count ${projectOptions.length} and fingerprint ${actualFingerprint}.`,
        "Update PROJECT_OPTION_INDEX_BY_TRANSACTION_NOTE_ID and any legacy ids in src/lib/transactionNoteMetadata.ts.",
        `Current project options: ${projectOptions.join(", ")}`,
      ].join(" "),
    );
  }
}

function createTransactionNoteProjectNamesById(): TransactionNoteProjectNameById {
  const projectOptions = getCommandOptionValues("Project");
  validateProjectOptions(projectOptions);

  const projectNamesById: Record<number, string> = {
    ...PROJECT_NOTE_LEGACY_NAMES_BY_ID,
  };

  PROJECT_OPTION_INDEX_BY_TRANSACTION_NOTE_ID.forEach((projectOptionIndex, projectId) => {
    if (projectOptionIndex == null) {
      return;
    }

    const projectName = projectOptions[projectOptionIndex];
    if (!projectName) {
      throw new Error(
        `Transaction note project mapping is stale. Transaction-note project id ${projectId} points to Project option index ${projectOptionIndex}, but only ${projectOptions.length} project options exist. Update PROJECT_OPTION_INDEX_BY_TRANSACTION_NOTE_ID in src/lib/transactionNoteMetadata.ts.`,
      );
    }

    projectNamesById[projectId] = projectName.toLowerCase();
  });

  return projectNamesById;
}

export const TRANSACTION_NOTE_PROJECT_NAMES_BY_ID = createTransactionNoteProjectNamesById();
