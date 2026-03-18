/**
 * 微信读书API的类型定义
 */

// 书架中的书籍信息
export interface BookInfo {
  bookId: string;
  title: string;
  author: string;
  cover: string;
  publishTime?: string;
  type?: number;
  categoryId?: number;
  url?: string;
  version?: number;
  format?: string;
  finishReading?: number;
}

// 书籍笔记信息
export interface BookNotesInfo {
  book: BookInfo;
  noteCount: number;
  reviewCount: number;
  sort: number; // 时间戳
}

// 书架响应
export interface BookshelfResponse {
  books: BookNotesInfo[];
}

// 划线信息
export interface Highlight {
  bookmarkId: string;
  created: number; // 时间戳
  bookId: string;
  chapterUid: number;
  chapterTitle?: string;
  markText: string;
  style: number;
  colorStyle: number;
  range: string;
}

// 章节内的划线标记
export interface ChapterMark {
  markText: string;
  createTime: number;
  chapterUid: number;
  bookId: string;
}

// 章节信息
export interface Chapter {
  chapterUid: number;
  title: string;
  marks: ChapterMark[];
}

// 划线响应
export interface HighlightsResponse {
  book?: {
    bookId: string;
    title: string;
    author: string;
  };
  updated?: Highlight[]; // Web API返回的划线列表
  chapters?: Chapter[]; // 章节API返回的划线
  bookId?: string; // 书籍ID
}

// API 配置
export interface WeReadConfig {
  cookie: string;
  onCookieUpdate?: (newCookie: string) => void;
}
