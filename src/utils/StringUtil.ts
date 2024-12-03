import {Command} from "@/utils/Command.ts";
import {TableNumberFormat, TimeFormat} from "../components/api/apitypes";

export function formatNumber(value: number, format: TableNumberFormat): string {
  switch (format) {
    case "SI_UNIT":
      return formatSi(value);
    case "PERCENTAGE_ONE":
      return (value * 100).toFixed(2) + "%";
    case "PERCENTAGE_100":
      return (value).toFixed(2) + "%";
    case "DECIMAL_ROUNDED":
      return commafy(value);
  }
}

export function formatTime(time: number, format: TimeFormat): string {
  switch (format) {
    case "NUMERIC":
      return time.toString();
    case "DECIMAL_ROUNDED":
      return commafy(time);
    case "SI_UNIT":
      return formatSi(time);
    case "TURN_TO_DATE":
      return formatTurnsToDate(time);
    case "DAYS_TO_DATE":
      return formatDaysToDate(time);
    case "MILLIS_TO_DATE":
      return formatDate(time);
    case "SECONDS_TO_DATE":
      return formatDate(time * 1000);
  }
}

export function formatDate(data: number | null): string {
  if (data == null || data == -1) return "N/A";
  const date = new Date(data);
  const formattedDate = date.toISOString().slice(0, 16).replace("T", " ");
  return formattedDate.endsWith("00:00") ? formattedDate.slice(0, 10) : formattedDate;
}

export function formatDaysToDate(value: number) {
  return formatTurnsToDate(value * 12);
}

// Convert the slider (turns) to a time string
export function formatTurnsToDate(value: number) {
  const timeMillis = (value / 12) * 60 * 60 * 24 * 1000;
  const date = new Date();
  date.setTime(timeMillis);
  const formattedDate = date.toISOString().slice(0, 16).replace("T", " ");
  return formattedDate.endsWith("00:00") ? formattedDate.slice(0, 10) : formattedDate;
}

export function split(input: string, delimiter: string): string[] {
  return splitCustom(input, (input, index) => {
    if (input.charAt(index) === delimiter) return 1;
    return null;
  }, Number.MAX_SAFE_INTEGER).map(s => s.content);
}

export type SplitStr = {
    delimiter: string;
    offset: number; // the extra amt of characters skipped in addition to the delimiter (e.g. brackets or quotes)
    content: string;
}

export function commafy(num: number): string {
  const parts = (''+(num<0?-num:num)).split(".");
  const s=parts[0];
  let L, i= L = s.length, o='';
  while(i--){ o = (i===0?'':((L-i)%3?'':','))
      +s.charAt(i) +o }
  return (num<0?'-':'') + o + (parts[1] ? '.' + (parts[1].length > 2 ? parts[1].substring(0, 2) : parts[1]) : '');
}

const si = [
  { value: 1E18, symbol: "E" },
  { value: 1E15, symbol: "P" },
  { value: 1E12, symbol: "T" },
  { value: 1E9, symbol: "B" },
  { value: 1E6, symbol: "M" },
  { value: 1E3, symbol: "k" }
];

export function formatDuration(x: number, maxWords: number): string {
  const units = [
    { label: 'y', value: 31536000 },
    { label: 'w', value: 604800 },
    { label: 'd', value: 86400 },
    { label: 'h', value: 3600 },
    { label: 'm', value: 60 },
    { label: 's', value: 1 }
  ];

  let result = '';
  for (const unit of units) {
    const amount = Math.floor(x / unit.value);
    if (amount > 0) {
      result += amount + "" + unit.label;
      x -= amount * unit.value;
    }
    if (result.length >= maxWords * 2) break; // each unit is 2 characters long
  }

  return result;
}

export function formatSi(num: number): string {
  for (let i = 0; i < si.length; i++) {
    if (num >= si[i].value) {
      const formattedNum = num / si[i].value;
      return (formattedNum % 1 === 0 ? formattedNum.toString() : formattedNum.toFixed(2)) + si[i].symbol;
    }
  }
  return (num % 1 === 0 ? num.toString() : num.toFixed(2));
}

export function splitCustom(input: string, startsWith: ((input: string, index: number) => number | null) | null, limit: number): SplitStr[] {
  const result: SplitStr[] = [];
  let start = 0;
  let bracket = 0;
  let inQuotes = false;
  let quoteChar: string | null = null;
  let lastDelim = ""

  for (let current = 0; current < input.length; current++) {
    let currentChar = input.charAt(current);
    if (currentChar === '\u201C') currentChar = '\u201D';
    const atLastChar = current === input.length - 1;

    switch (currentChar) {
      case '[':
      case '(':
      case '{':
        bracket++;
        break;
      case '}':
      case ')':
      case ']':
        bracket--;
        break;
    }

    if (!atLastChar && bracket > 0) {
      continue;
    }

    if (atLastChar) {
      let toAdd: SplitStr;
      if (inQuotes) {
        toAdd = {
          delimiter: lastDelim,
          offset: 1,
          content: input.substring(start + 1, input.length - 1)
        };
      } else {
        toAdd = {
            delimiter: lastDelim,
            offset: 0,
            content: input.substring(start)
        };
      }
      if (toAdd) result.push(toAdd);
      continue;
    }

    if (isQuote(currentChar)) {
      if (!quoteChar || (isQuote(quoteChar) && isQuote(currentChar) && currentChar === quoteChar)) {
        inQuotes = !inQuotes;
        quoteChar = inQuotes ? currentChar : null;
      }
    }

    if (!inQuotes && startsWith) {
      const foundLen = startsWith(input, current);

      if (foundLen !== null && foundLen !== -1) {
        let toAdd = input.substring(start, current);
        let offset = 0;
        if (toAdd) {
          switch (toAdd.charAt(0)) {
            case '\'':
            case '"':
            case '\u201C':
            case '\u201D':
              toAdd = toAdd.substring(1, toAdd.length - 1);
              offset++;
          }
          if (toAdd.trim()) {
            result.push({
              delimiter: lastDelim,
              offset: offset,
              content: toAdd
            });
            lastDelim = input.substring(current, current + foundLen);
          }
        }
        start = current + foundLen;
        current = start - 1;
        if (--limit <= 1) {
          startsWith = null;
        }
      }
    }
  }

  return result;
}

export function parseArguments(params: Set<string>, input: string, checkUnbound: boolean): Map<string, string> {
  const lowerCase = new Map<string, string>();
  params.forEach(param => {
    lowerCase.set(param.toLowerCase(), param);
  });

  const result = new Map<string, string>();
  const joinedParams = Array.from(lowerCase.keys()).join("|");
  const pattern = new RegExp(`(?i)(^| |,)(${joinedParams}):[ ]{0,1}[^ ]`, 'i');
  const matches = input.matchAll(pattern);

  const fuzzyArgPattern = checkUnbound ? new RegExp(`[ ,]([a-zA-Z]+):[ ]{0,1}[^ ]`, 'i') : null;

  const argStart = new Map<string, number>();
  const argEnd = new Map<string, number>();
  let lastArg: string | null = null;

  for (const match of matches) {
    const argName = match[2].toLowerCase();
    const index = match.index + match[0].length;
    if (argStart.has(argName)) {
      throw new Error(`Duplicate argument \`${argName}\` in \`${input}\``);
    }
    argStart.set(argName, index);

    if (lastArg !== null) {
      argEnd.set(lastArg, match.index);
    }
    lastArg = argName;
  }

  if (lastArg !== null) {
    argEnd.set(lastArg, input.length);
  }

  argStart.forEach((start, id) => {
    const end = argEnd.get(id)!;
    let value = input.substring(start, end).trim();
    let hasQuote = false;

    if (value.length > 1 && isQuote(value.charAt(0)) && isQuote(value.charAt(value.length - 1))) {
      value = value.substring(1, value.length - 1);
      hasQuote = true;
    }

    if (fuzzyArgPattern && !hasQuote) {
      const valueMatch = value.match(fuzzyArgPattern);
      if (valueMatch) {
        throw new Error(`Invalid argument: \`${valueMatch[1]}\` for \`${input}\` options: ${Array.from(params).join(", ")}
Please use quotes if you did not intend to specify an argument: \`${value}\``);
      }
    }

    result.set(lowerCase.get(id)!, value);
  });

  if (argStart.size === 0) {
    throw new Error(`No arguments found for \`${input}\` options: ${Array.from(params).join(", ")}`);
  }

  return result;
}

export function isQuote(c: string): boolean {
  return ['\'', '"', '\u201C', '\u201D'].includes(c);
}

export function findMatchingBracket(sequence: string, index: number): number {
  const startC = sequence.charAt(index);
  const lookC = getMatchingBracket(startC);
  if (lookC === startC) return -1;
  const forward = isBracketForwards(startC);
  const increment = forward ? 1 : -1;
  const end = forward ? sequence.length : -1;
  const incrementTest = forward ? (i: number) => i < end : (i: number) => i > end;
  let count = 0;
  for (let i = index + increment; incrementTest(i); i += increment) {
    const c = sequence.charAt(i);
    if (c === startC) {
      count++;
    } else if (c === lookC && count-- === 0) {
      return i;
    }
  }
  return -1;
}

function isBracketForwards(c: string): boolean {
  switch (c) {
    case '[':
    case '(':
    case '{':
    case '<':
      return true;
    default:
      return false;
  }
}

function getMatchingBracket(c: string): string {
  switch (c) {
    case '[':
      return ']';
    case '(':
      return ')';
    case '{':
      return '}';
    case '<':
      return '>';
    case ']':
      return '[';
    case ')':
      return '(';
    case '}':
      return '{';
    case '>':
      return '<';
    default:
      return c;
  }
}

export function isQuoteOrBracket(c: string): boolean {
  return isQuote(c) || isBracketForwards(c);
}

export function findMatchingQuoteOrBracket(sequence: string, index: number): number {
  const startC = sequence.charAt(index);
  if (isBracketForwards(startC)) {
    return findMatchingBracket(sequence, index);
  }
  const endC = isQuote(startC) ? startC : null;
  if (endC === null) return -1;
  for (let i = index + 1; i < sequence.length; i++) {
    const c = sequence.charAt(i);
    if (c === endC) {
      return i;
    }
  }
  return -1;
}

export function getCharFrequency(str: string): { [key: string]: number } {
  return [...str].reduce((freq, char) => {
    freq[char] = (freq[char] || 0) + 1;
    return freq;
  }, {} as { [key: string]: number });
}

export function simpleSimilarity(input: string,
                          inputFreq: { [key: string]: number },
                          inputWordFreq: Set<string>,
                          cmd: Command): number {
  const command = cmd.name.toLowerCase();
  if (command.includes(input)) {
    if (command.startsWith(input)) {
      return 5;
    }
    return 4;
  }
  let inputIndex = 0;
  for (let i = 0; i < command.length; i++) {
    if (command[i] === input[inputIndex]) {
      inputIndex++;
      if (inputIndex === input.length) {
        return 2;
      }
    }
  }
  const commandFreq = cmd.getCharFrequency();
  let freqMatchScore = 0;
  for ( const [char, freq] of Object.entries(inputFreq)) {
    const foundAmt = commandFreq[char] || 0;
    if (foundAmt >= freq) {
      freqMatchScore += Math.min(freq, foundAmt);
    } else {
      const wordFreq = cmd.getWordFrequency();
      for (const word of inputWordFreq) {
        if (!wordFreq.has(word)) {
          return 0;
        }
      }
      return 3;
    }
  }
  return freqMatchScore / input.length;
}