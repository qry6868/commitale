export interface FileChange {
  path: string;
  added: number;
  deleted: number;
}

export interface Commit {
  hash: string;
  repo: string;
  authorName: string;
  authorEmail: string;
  /** Calendar date in the author's own timezone, YYYY-MM-DD. */
  date: string;
  /** Hour in the author's own timezone, 0-23. */
  hour: number;
  minute: number;
  /** 0 = Sunday. */
  weekday: number;
  timestamp: number;
  subject: string;
  files: FileChange[];
}
