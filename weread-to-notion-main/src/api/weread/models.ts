/**
 * 微信读书API数据模型定义
 */

/**
 * 书架中的书籍模型
 */
export interface ShelfBook {
  bookId: string;
  title: string;
  author: string;
  cover: string;
  category: string;
  finishReading?: boolean;
  publishTime?: string;
  readUpdateTime?: number;
  [key: string]: any; // 其他可能的字段
}

/**
 * 笔记本中的书籍模型
 */
export interface NotebookBook {
  bookId: string;
  book: {
    title: string;
    author: string;
    cover: string;
    category: string;
    [key: string]: any; // 其他可能的字段
  };
  marksCount?: number;
  metaData?: any;
}

/**
 * 书籍详细信息模型
 */
export interface BookInfo {
  bookId: string;
  title: string;
  author: string;
  cover: string;
  category: string;
  publisher?: string;
  publishTime?: string;
  isbn?: string;
  intro?: string;
  finishReading?: boolean;
  [key: string]: any; // 其他可能的字段
}

/**
 * 划线原始数据模型
 */
export interface RawHighlightsData {
  book?: BookInfo;
  updated?: Array<{
    chapterUid: number;
    chapterTitle?: string;
    markText: string;
    created: number | string;
    style: number;
    colorStyle: number;
    range: string;
    [key: string]: any; // 其他可能的字段
  }>;
  chapters?: Array<{
    chapterUid: number;
    title: string;
    marks?: Array<{
      markText: string;
      range: string;
      createTime: number;
      [key: string]: any; // 其他可能的字段
    }>;
    [key: string]: any; // 其他可能的字段
  }>;
  synckey?: string;
  errCode?: number;
  errMsg?: string;
}

/**
 * 想法原始数据模型
 */
export interface RawThoughtsData {
  reviews?: Array<{
    review:
      | string
      | {
          content?: string;
          abstract?: string;
          range?: string;
          chapterUid?: number;
          chapterName?: string;
          createTime?: number;
          [key: string]: any; // 其他可能的字段
        };
    reviewId?: string;
    chapterUid?: number;
    chapterTitle?: string;
    content?: string;
    abstract?: string;
    createTime?: number;
    [key: string]: any; // 其他可能的字段
  }>;
  synckey?: string;
  errCode?: number;
  errMsg?: string;
}

/**
 * 格式化后的划线章节数据
 */
export interface FormattedChapter {
  chapterUid: number;
  chapterTitle: string;
  highlights: Array<FormattedHighlight>;
}

/**
 * 格式化后的单条划线数据
 */
export interface FormattedHighlight {
  text: string;
  chapterUid: number;
  chapterTitle: string;
  created: number | string;
  createdTime: string;
  style?: number;
  colorStyle?: number;
  range?: string;
  [key: string]: any; // 其他可能的字段
}

/**
 * 格式化后的单条想法数据
 */
export interface FormattedThought {
  content: string;
  abstract?: string;  // 添加原文摘要字段
  range?: string;
  chapterUid: number;
  chapterTitle: string;
  createTime: number;
  createdTime: string;
  reviewId?: string;
}

/**
 * 书籍阅读进度数据模型
 */
export interface BookProgressInfo {
  bookId: string;
  book: {
    progress: number;         // 阅读进度百分比 0-100
    isStartReading: number;  // 是否开始阅读 0/1
    readingTime: number;     // 阅读总时长(秒)
    startReadingTime?: number; // 首次阅读时间戳
    finishTime?: number;     // 完成阅读时间戳
    chapterUid?: number;     // 当前章节ID
    chapterIdx?: number;     // 当前章节索引
    chapterOffset?: number;  // 章节内偏移量
    summary?: string;        // 当前阅读位置摘要
    updateTime?: number;     // 最后更新时间
    [key: string]: any;      // 其他可能的字段
  };
  [key: string]: any;        // 其他可能的字段
}
