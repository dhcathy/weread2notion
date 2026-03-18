/**
 * 微信读书客户端封装
 */

import {
  refreshSession,
  getNotebookBooks,
  getBookshelfBooks,
  getBookInfo,
  getBookHighlights,
  getBookThoughts,
} from "./services";
import { ThoughtsResponse, HighlightsResponse } from "../../config/types";
import { getBrowserCookie } from "../../utils/cookie";
import {
  FormattedChapter,
  FormattedHighlight,
  FormattedThought,
  RawHighlightsData,
  BookInfo,
} from "./models";
import { getSyncState } from "../../utils/file";

/**
 * 微信读书客户端类
 */
export class WeReadClient {
  private cookie: string;

  /**
   * 构造函数
   */
  constructor(cookie?: string) {
    // 优先使用传入的cookie，否则获取浏览器cookie
    this.cookie = cookie || getBrowserCookie();
  }

  /**
   * 刷新Cookie
   */
  async refreshCookie(): Promise<string> {
    this.cookie = await refreshSession(this.cookie);
    return this.cookie;
  }

  /**
   * 获取当前Cookie
   */
  getCookie(): string {
    return this.cookie;
  }

  /**
   * 获取笔记本中的书籍列表
   */
  async getUserNotebooks(): Promise<any[]> {
    try {
      const books = await getNotebookBooks(this.cookie);

      // 处理登录超时等情况，这些应该已经在getNotebookBooks中处理过了
      return books;
    } catch (error: any) {
      console.error("获取笔记本书籍列表失败:", error.message);
      return [];
    }
  }

  /**
   * 获取书架中的书籍列表
   */
  async getBookshelf(): Promise<any[]> {
    try {
      const books = await getBookshelfBooks(this.cookie);

      // 处理登录超时等情况，这些应该已经在getBookshelfBooks中处理过了
      return books;
    } catch (error: any) {
      console.error("获取书架书籍列表失败:", error.message);
      return [];
    }
  }

  /**
   * 获取书籍详情
   */
  async getBookInfo(bookId: string): Promise<BookInfo | null> {
    try {
      return await getBookInfo(this.cookie, bookId);
    } catch (error: any) {
      console.error(`获取书籍信息失败:`, error.message);
      return null;
    }
  }

  /**
   * 获取划线数据并格式化
   * 使用增量同步模式
   */
  async getHighlights(
    bookId: string,
    useIncremental: boolean = true
  ): Promise<HighlightsResponse> {
    try {
      // 获取同步状态
      const syncState = useIncremental
        ? getSyncState(bookId)
        : { highlightsSynckey: "0" };

      console.log(
        `使用${useIncremental ? "增量" : "全量"}同步模式，highlightsSynckey: ${
          syncState.highlightsSynckey
        }`
      );

      // 获取原始划线数据
      let bookData = await getBookHighlights(
        this.cookie,
        bookId,
        syncState.highlightsSynckey
      );

      // 如果没有获取到数据，重新刷新cookie并尝试
      if (!bookData && syncState.highlightsSynckey !== "0") {
        console.log("未能获取到划线数据，尝试使用全量同步");
        await this.refreshCookie();
        bookData = await getBookHighlights(this.cookie, bookId, "0");
      }

      const formattedHighlights: FormattedChapter[] = [];
      let bookInfo = null;
      let newSynckey = syncState.highlightsSynckey;
      let hasUpdate = false;

      if (bookData) {
        // 更新synckey
        if (bookData.synckey) {
          hasUpdate = bookData.synckey !== syncState.highlightsSynckey;
          newSynckey = bookData.synckey;
        }

        // 保存书籍信息
        bookInfo = bookData.book || null;

        // 格式化划线数据
        const formatted = this.formatHighlightsData(bookData);
        formattedHighlights.push(...formatted);
      }

      return {
        highlights: formattedHighlights,
        bookInfo,
        synckey: newSynckey,
        hasUpdate,
      };
    } catch (error: any) {
      console.error(`获取划线数据失败:`, error.message);
      return {
        highlights: [],
        bookInfo: null,
        synckey: "0",
        hasUpdate: false,
      };
    }
  }

  /**
   * 获取想法数据并格式化
   */
  async getThoughts(
    bookId: string,
    useIncremental: boolean = true
  ): Promise<ThoughtsResponse> {
    try {
      // 获取同步状态
      const syncState = useIncremental
        ? getSyncState(bookId)
        : { thoughtsSynckey: "0" };

      console.log(
        `使用${useIncremental ? "增量" : "全量"}同步模式，thoughtsSynckey: ${
          syncState.thoughtsSynckey
        }`
      );

      // 获取原始想法数据
      let rawThoughtsData = await getBookThoughts(
        this.cookie,
        bookId,
        syncState.thoughtsSynckey
      );

      // 如果没有获取到数据，重新刷新cookie并尝试
      if (!rawThoughtsData && syncState.thoughtsSynckey !== "0") {
        console.log("未能获取到想法数据，尝试使用全量同步");
        await this.refreshCookie();
        rawThoughtsData = await getBookThoughts(this.cookie, bookId, "0");
      }

      const formattedThoughts: FormattedThought[] = [];
      let newSynckey = syncState.thoughtsSynckey;
      let hasUpdate = false;

      if (rawThoughtsData) {
        // 更新synckey
        if (rawThoughtsData.synckey) {
          hasUpdate = rawThoughtsData.synckey !== syncState.thoughtsSynckey;
          newSynckey = rawThoughtsData.synckey;
        }

        // 格式化想法数据
        const formatted = this.formatThoughtsData(rawThoughtsData);
        formattedThoughts.push(...formatted);

        // 如果返回了想法数据，标记为有更新
        if (formattedThoughts.length > 0) {
          hasUpdate = true;
        }
      }

      return {
        thoughts: formattedThoughts,
        synckey: newSynckey,
        hasUpdate,
      };
    } catch (error: any) {
      console.error(`获取想法数据失败:`, error.message);
      return {
        thoughts: [],
        synckey: "0",
        hasUpdate: false,
      };
    }
  }

  /**
   * 格式化划线原始数据
   */
  private formatHighlightsData(
    bookData: RawHighlightsData
  ): FormattedChapter[] {
    const formattedHighlights: FormattedChapter[] = [];

    try {
      if (bookData.updated && bookData.updated.length > 0) {
        console.log(`处理 ${bookData.updated.length} 条划线记录`);

        // 创建章节映射表，用于快速查找章节标题
        const chapterTitleMap = new Map<number, string>();
        if (bookData.chapters && bookData.chapters.length > 0) {
          bookData.chapters.forEach((chapter: any) => {
            chapterTitleMap.set(chapter.chapterUid, chapter.title);
          });
          console.log(`创建章节映射表，包含 ${chapterTitleMap.size} 个章节`);
        }

        // 按章节整理划线
        const chapterMap = new Map<number, FormattedHighlight[]>();

        bookData.updated.forEach((highlight: any, index: number) => {
          // 获取章节ID
          const chapterUid = highlight.chapterUid;

          // 如果这个章节还没有划线，先创建一个数组
          if (!chapterMap.has(chapterUid)) {
            chapterMap.set(chapterUid, []);
          }

          // 处理时间格式
          let timeStr = this.formatTimestamp(highlight.created);

          // 从章节映射表获取正确的章节标题
          const chapterTitle =
            chapterTitleMap.get(chapterUid) || `章节 ${chapterUid}`;

          // 添加划线到对应章节
          chapterMap.get(chapterUid)?.push({
            text: highlight.markText,
            chapterUid: highlight.chapterUid,
            chapterTitle: chapterTitle,
            created: highlight.created,
            createdTime: timeStr,
            style: highlight.style,
            colorStyle: highlight.colorStyle,
            range: highlight.range,
          });
        });

        // 将整理好的划线按章节添加到结果中
        chapterMap.forEach((highlights, chapterUid) => {
          // 使用第一个划线的章节标题（现在已经是正确的了）
          const chapterTitle = highlights[0].chapterTitle;
          formattedHighlights.push({
            chapterUid,
            chapterTitle,
            highlights,
          });
        });
      }
      // 处理章节API返回的划线
      else if (bookData.chapters && bookData.chapters.length > 0) {
        console.log(`处理 ${bookData.chapters.length} 个章节API返回的数据`);

        bookData.chapters.forEach((chapter: any) => {
          if (chapter.marks && chapter.marks.length > 0) {
            const chapterHighlights = chapter.marks.map((mark: any) => {
              return {
                text: mark.markText,
                chapterUid: chapter.chapterUid,
                chapterTitle: chapter.title,
                created: mark.createTime * 1000, // 转为毫秒
                createdTime: new Date(mark.createTime * 1000).toLocaleString(),
                range: mark.range,
              };
            });

            formattedHighlights.push({
              chapterUid: chapter.chapterUid,
              chapterTitle: chapter.title,
              highlights: chapterHighlights,
            });
          }
        });
      }
    } catch (error: any) {
      console.error(`格式化划线数据失败:`, error.message);
    }

    return formattedHighlights;
  }

  /**
   * 格式化想法原始数据
   */
  private formatThoughtsData(rawThoughtsData: any): FormattedThought[] {
    const formattedThoughts: FormattedThought[] = [];

    try {
      // 尝试从不同字段获取想法数据
      const rawThoughts = rawThoughtsData?.reviews || rawThoughtsData?.review || [];

      if (rawThoughts && rawThoughts.length > 0) {
        console.log(`处理 ${rawThoughts.length} 条想法数据...`);

        // 处理每条想法
        rawThoughts.forEach((thought: any, index: number) => {
          console.log(`处理第 ${index + 1} 条想法:`, JSON.stringify(thought, null, 2));

          // 尝试多种数据结构
          let content = "";
          let abstract = "";
          let range = "";
          let chapterUid = 0;
          let chapterTitle = "未知章节";
          let createTime = 0;
          let reviewId = "";

          // 情况1: 直接从thought对象获取
          if (thought.content || thought.abstract) {
            content = thought.content || "";
            abstract = thought.abstract || "";
            range = thought.range || "";
            chapterUid = thought.chapterUid || thought.chapterId || 0;
            chapterTitle = thought.chapterName || thought.chapterTitle || "未知章节";
            createTime = thought.createTime || thought.created || 0;
            reviewId = thought.reviewId || thought.id || "";
          }
          // 情况2: 从嵌套的review对象获取
          else if (thought.review) {
            const review = typeof thought.review === "string" ? JSON.parse(thought.review) : thought.review;
            if (review) {
              content = review.content || "";
              abstract = review.abstract || "";
              range = review.range || "";
              chapterUid = review.chapterUid || review.chapterId || thought.chapterUid || 0;
              chapterTitle = review.chapterName || review.chapterTitle || thought.chapterName || "未知章节";
              createTime = review.createTime || review.created || thought.createTime || 0;
              reviewId = thought.reviewId || thought.id || "";
            }
          }

          // 处理时间戳
          let timeStr = this.formatTimestamp(createTime);

          // 创建格式化的想法对象
          const formattedThought = {
            content,
            abstract, // 原文
            range,
            chapterUid,
            chapterTitle,
            createTime,
            createdTime: timeStr,
            reviewId,
          };

          // 只有当有内容或原文时才添加到结果中
          if (formattedThought.content || formattedThought.abstract) {
            console.log(`添加想法: ${formattedThought.content.substring(0, 50)}...`);
            formattedThoughts.push(formattedThought);
          } else {
            console.log(`跳过空想法`);
          }
        });
      } else {
        console.log(`没有找到想法数据:`, JSON.stringify(rawThoughtsData, null, 2));
      }
    } catch (error: any) {
      console.error(`格式化想法数据失败:`, error.message);
      console.error(`错误堆栈:`, error.stack);
    }

    console.log(`最终处理了 ${formattedThoughts.length} 条想法`);
    return formattedThoughts;
  }

  /**
   * 格式化时间戳为本地时间字符串
   */
  private formatTimestamp(timestamp: number | string): string {
    if (!timestamp) return "未知时间";

    try {
      // 确保timestamp是数字类型
      const ts =
        typeof timestamp === "number" ? timestamp : parseInt(timestamp);

      if (isNaN(ts)) return "未知时间";

      // 判断是毫秒还是秒级时间戳
      const date = ts > 9999999999 ? new Date(ts) : new Date(ts * 1000);

      return date.toLocaleString();
    } catch (error) {
      console.log(`时间格式错误: ${timestamp}`);
      return "未知时间";
    }
  }
}
