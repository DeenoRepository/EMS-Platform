type FeedbackJsonValue = string | number | boolean | null | FeedbackJsonValue[] | { [key: string]: FeedbackJsonValue };
type FeedbackJsonValueOrNull = Exclude<FeedbackJsonValue, null> | null;

export interface FeedbackInput {
  title: string;
  description: string;
  type: string;
  feedbackModule: string;
  priority: string;
  pageUrl: string | null;
  browserInfo: FeedbackJsonValueOrNull;
  uploadedFiles: File[];
}

export interface FeedbackJsonBody {
  title?: unknown;
  description?: unknown;
  type?: unknown;
  module?: unknown;
  priority?: unknown;
  pageUrl?: unknown;
  browserInfo?: unknown;
}

export interface FeedbackMultipartSource {
  get: (name: string) => FormDataEntryValue | null;
  getAll: (name: string) => FormDataEntryValue[];
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function parseBrowserInfo(value: unknown): FeedbackJsonValueOrNull {
  if (typeof value !== 'string') return (value as FeedbackJsonValueOrNull) ?? null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function collectFiles(entries: FormDataEntryValue[]): File[] {
  return entries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

export function parseFeedbackJsonInput(body: FeedbackJsonBody): FeedbackInput {
  return {
    title: asString(body.title, ''),
    description: asString(body.description, ''),
    type: asString(body.type, 'BUG'),
    feedbackModule: asString(body.module, 'GENERAL'),
    priority: asString(body.priority, 'MEDIUM'),
    pageUrl: typeof body.pageUrl === 'string' ? body.pageUrl : null,
    browserInfo: (body.browserInfo as FeedbackJsonValueOrNull | undefined) ?? null,
    uploadedFiles: [],
  };
}

export function parseFeedbackMultipartInput(source: FeedbackMultipartSource): FeedbackInput {
  const browserInfo = source.get('browserInfo');

  return {
    title: asString(source.get('title'), ''),
    description: asString(source.get('description'), ''),
    type: asString(source.get('type'), 'BUG'),
    feedbackModule: asString(source.get('module'), 'GENERAL'),
    priority: asString(source.get('priority'), 'MEDIUM'),
    pageUrl: asString(source.get('pageUrl'), '') || null,
    browserInfo: parseBrowserInfo(browserInfo),
    uploadedFiles: collectFiles(source.getAll('files')),
  };
}
