export type Note = {
  id: string;
  category: string;
  date: string;
  title: string;
  excerpt: string;
  body: string[];
  pullQuote?: string;
  notebook: string;
  tags: string[];
  wordCount: number;
};
