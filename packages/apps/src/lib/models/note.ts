export type Note = {
  id: string;
  category: string;
  date: string;
  excerpt: string;
  body: string[];
  pullQuote?: string;
  notebook: string;
  tags: string[];
  wordCount: number;
  /** From `GET /notes/items` — seeds local starred state. */
  starred?: boolean;
  /** From `GET /notes/items` — seeds archive view. */
  archived?: boolean;
};
