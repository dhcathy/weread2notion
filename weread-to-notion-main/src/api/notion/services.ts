/**
 * Notion API 服务模块
 */

import axios, { AxiosError } from "axios";
import { NOTION_API_BASE_URL, NOTION_VERSION } from "../../config/constants";
import { NotionBlockType } from "../../config/types";
import { getNotionHeaders } from "../../utils/http";
import {
  BookProperties,
  NotionBlock,
  NotionPage,
  BookExistsResult,
  BookWriteResult,
} from "./models";

/**
 * 检查Notion数据库是否包含所有必要的属性字段
 * @param apiKey Notion API密钥
 * @param databaseId 数据库ID
 * @param requiredProperties 必要属性字段列表
 * @returns 缺少的属性字段列表
 */
export async function checkDatabaseProperties(
  apiKey: string,
  databaseId: string,
  requiredProperties: string[]
): Promise<string[]> {
  console.log(`检查数据库属性: ${databaseId}`);

  try {
    // 设置请求头
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    };

    // 获取数据库信息
    const response = await axios.get(
      `${NOTION_API_BASE_URL}/databases/${databaseId}`,
      { headers }
    );

    // 数据库中存在的属性
    const existingProperties = Object.keys(response.data.properties || {});
    console.log(`数据库包含以下属性: ${existingProperties.join(", ")}`);

    // 检查缺少的属性
    const missingProperties = requiredProperties.filter(
      (prop) => !existingProperties.includes(prop)
    );

    return missingProperties;
  } catch (error: any) {
    console.error(`检查数据库属性失败: ${error.message}`);
    if (error.response) {
      console.error(`状态码: ${error.response.status}`);
      console.error(`响应: ${JSON.stringify(error.response.data)}`);
    }

    // 如果无法检查，返回空数组以避免阻止同步
    return [];
  }
}

/**
 * 格式化阅读时间，将秒数转换为可读格式
 * @param seconds 阅读时间秒数
 * @returns 格式化后的时间字符串
 */
function formatReadingTime(seconds: number): string {
  if (seconds <= 0) return "未阅读";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}小时${minutes > 0 ? ` ${minutes}分钟` : ""}`;
  } else {
    return `${minutes}分钟`;
  }
}

/**
 * 格式化微信读书评分
 * @param rating 评分数值 (1-5)
 * @returns 格式化后的评分字符串
 */
function formatWeReadRating(rating: number): string {
  if (rating >= 4) return "推荐";
  if (rating >= 3) return "一般";
  return "不行";
}

/**
 * 检查书籍是否已存在于Notion数据库中
 */
export async function checkBookExistsInNotion(
  apiKey: string,
  databaseId: string,
  bookTitle: string,
  bookAuthor: string
): Promise<BookExistsResult> {
  try {
    console.log(`检查书籍《${bookTitle}》是否已存在于Notion数据库...`);

    // 设置请求头
    const headers = getNotionHeaders(apiKey, NOTION_VERSION);

    // 构建查询 - 通过书名来匹配（因为作者现在是多选）
    const queryData = {
      filter: {
        property: "书名",
        title: {
          contains: bookTitle,
        },
      },
    };

    // 发送查询请求
    const response = await axios.post(
      `${NOTION_API_BASE_URL}/databases/${databaseId}/query`,
      queryData,
      { headers }
    );

    const results = response.data.results;
    if (results && results.length > 0) {
      console.log(`书籍已存在于Notion，页面ID: ${results[0].id}`);
      return { exists: true, pageId: results[0].id };
    }

    console.log("书籍尚未添加到Notion");
    return { exists: false };
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.error("检查书籍存在性失败:", axiosError.message);
    return { exists: false };
  }
}

/**
 * 将书籍数据写入Notion数据库
 */
export async function writeBookToNotion(
  apiKey: string,
  databaseId: string,
  bookData: any
): Promise<BookWriteResult> {
  try {
    console.log(`\n写入书籍《${bookData.title}》到Notion...`);

    // 首先检查是否已存在
    const existCheck = await checkBookExistsInNotion(
      apiKey,
      databaseId,
      bookData.title,
      bookData.author || "未知作者"
    );
    
    // 从bookData中提取译者信息 (通常不在基本元数据中，可能需要单独处理)
    const translator = bookData.translator || "";

    // 处理作者字段 - 支持多选
    const authors = bookData.author ? bookData.author.split(" ").filter((a: string) => a.trim()) : ["未知作者"];
    const authorOptions = authors.map((author: string) => ({
      name: author.trim()
    }));

    // 处理类型字段 - 支持多选
    const categories = bookData.category ? bookData.category.split(",").map((c: string) => c.trim()).filter((c: string) => c) : ["未知类型"];
    const categoryOptions = categories.map((category: string) => ({
      name: category
    }));

    // 构建要写入的数据
    const properties = {
      // 书名是title类型
      书名: {
        title: [
          {
            type: "text",
            text: {
              content: bookData.title,
            },
          },
        ],
      },
      // 作者是multi_select类型
      作者: {
        multi_select: authorOptions
      },
      // 译者是rich_text类型
      译者: {
        rich_text: [
          {
            type: "text",
            text: {
              content: translator,
            },
          },
        ],
      },
      // 类型是multi_select类型
      类型: {
        multi_select: categoryOptions
      },
      // 封面是文件类型，但支持URL
      封面: {
        files: [
          {
            type: "external",
            name: `${bookData.title}-封面`,
            external: {
              url: bookData.cover || "",
            },
          },
        ],
      },
      // 阅读状态是select类型
      阅读状态: {
        select: {
          name:
            bookData.finishReadingStatus ||
            (bookData.finishReading
              ? "✅已读"
              : bookData.progress && bookData.progress > 0
              ? "📖在读"
              : "📕未读"),
        },
      },
      // 开始阅读日期 - 如果有startReadingTime则转换为可读日期
      开始阅读: {
        date: bookData.progressData?.startReadingTime
          ? {
              start: new Date(bookData.progressData.startReadingTime * 1000)
                .toISOString()
                .split("T")[0],
            }
          : null,
      },
      // 完成阅读日期 - 如果有finishTime则转换为可读日期
      完成阅读: {
        date: bookData.progressData?.finishTime
          ? {
              start: new Date(bookData.progressData.finishTime * 1000)
                .toISOString()
                .split("T")[0],
            }
          : null,
      },
      // 阅读总时长 - 转换为小时和分钟格式
      阅读总时长: {
        rich_text: [
          {
            type: "text",
            text: {
              content: bookData.progressData?.readingTime
                ? formatReadingTime(bookData.progressData.readingTime)
                : "未记录",
            },
          },
        ],
      },
      // 阅读进度 - 数字类型，直接使用API返回的progress值
      阅读进度: {
        number: bookData.progressData?.progress || bookData.progress || 0,
      },
      // 我的评分 - 从微信读书获取
      我的评分: {
        select: bookData.rating ? {
          name: formatWeReadRating(bookData.rating)
        } : null,
      },
    };
    
    if (existCheck.exists && existCheck.pageId) {
      console.log(`书籍已存在，将更新现有页面: ${existCheck.pageId}`);
      // 更新现有页面
      const headers = getNotionHeaders(apiKey, NOTION_VERSION);
      await axios.patch(`${NOTION_API_BASE_URL}/pages/${existCheck.pageId}`, {
        properties
      }, {
        headers
      });
      console.log(`成功更新页面 ${existCheck.pageId}`);
      return { success: true, pageId: existCheck.pageId };
    }

    // 设置请求头
    const headers = getNotionHeaders(apiKey, NOTION_VERSION);

    // 构建要写入的数据
    const data = {
      parent: {
        database_id: databaseId,
      },
      properties: properties
    };
    // 发送请求创建页面
    const response = await axios.post(`${NOTION_API_BASE_URL}/pages`, data, {
      headers,
    });

    console.log(`请求成功，响应状态码: ${response.status}`);
    console.log(`新创建页面ID: ${response.data.id}`);

    return { success: true, pageId: response.data.id };
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.error("写入数据失败:", axiosError.message);
    if (axiosError.response) {
      console.error("响应状态:", axiosError.response.status);
      console.error(
        "响应数据:",
        JSON.stringify(axiosError.response.data, null, 2)
      );
    }
    return { success: false };
  }
}

/**
 * 将划线数据写入到Notion页面
 */
export async function writeHighlightsToNotionPage(
  apiKey: string,
  pageId: string,
  bookInfo: any,
  highlights: any[],
  organizeByChapter: boolean = false
): Promise<boolean> {
  try {
    console.log(`\n写入划线数据到Notion页面 ${pageId}...`);
    console.log(`划线数据数组长度: ${highlights.length}`);
    console.log(`按章节组织: ${organizeByChapter ? "是" : "否"}`);

    // 先删除页面中已有的划线区块
    const deleteResult = await deleteNotionBlocks(apiKey, pageId, "highlights");
    if (!deleteResult) {
      console.warn("删除旧划线区块失败，可能会导致内容重复");
    }

    // 设置请求头
    const headers = getNotionHeaders(apiKey, NOTION_VERSION);

    // 创建页面内容的blocks - 只添加划线区域标题
    const blocks: any[] = [
      // 添加"划线"标题
      {
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: [
            {
              type: "text",
              text: {
                content: "📌 划线",
              },
            },
          ],
        },
      },
      // 添加分隔符
      {
        object: "block",
        type: "divider",
        divider: {},
      },
    ];

    // 如果没有划线，添加提示
    if (highlights.length === 0) {
      console.log(`无划线数据，添加提示信息`);
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: {
                content: "该书暂无划线内容",
              },
              annotations: {
                italic: true,
              },
            },
          ],
        },
      });
    } else {
      console.log(`开始处理 ${highlights.length} 个章节的划线`);

      // 将章节按照 chapterUid 正序排列
      const sortedHighlights = [...highlights].sort(
        (a, b) => a.chapterUid - b.chapterUid
      );

      console.log(`已将章节按顺序排列，从小到大`);

      // 按章节添加划线
      for (const chapter of sortedHighlights) {
        console.log(
          `处理章节 "${chapter.chapterTitle}"，包含 ${chapter.highlights.length} 条划线`
        );

        // 如果按章节组织，添加章节标题
        if (organizeByChapter) {
          blocks.push({
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content:
                      chapter.chapterTitle || `章节 ${chapter.chapterUid}`,
                  },
                },
              ],
            },
          });
        }

        // 添加每条划线
        for (const highlight of chapter.highlights) {
          // 添加划线内容
          blocks.push({
            object: "block",
            type: "quote",
            quote: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: highlight.text,
                  },
                },
              ],
            },
          });

          // 如果不按章节组织，添加分隔符
          if (!organizeByChapter) {
            blocks.push({
              object: "block",
              type: "divider",
              divider: {},
            });
          }
        }

        // 如果按章节组织，在章节结束后添加分隔符
        if (organizeByChapter) {
          blocks.push({
            object: "block",
            type: "divider",
            divider: {},
          });
        }
      }
    }

    return await addBlocksToNotion(apiKey, pageId, blocks);
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.error("写入划线数据失败:", axiosError.message);
    return false;
  }
}

/**
 * 将想法数据写入到Notion页面
 */
export async function writeThoughtsToNotionPage(
  apiKey: string,
  pageId: string,
  bookInfo: any,
  thoughts: any[],
  incrementalUpdate: boolean = false,
  organizeByChapter: boolean = false
): Promise<boolean> {
  try {
    console.log(`\n写入想法数据到Notion页面 ${pageId}...`);
    console.log(`想法数据数组长度: ${thoughts.length}`);
    console.log(`按章节组织: ${organizeByChapter ? "是" : "否"}`);

    // 只有在非增量更新或有新想法时才删除旧内容
    const shouldDeleteOldThoughts = !incrementalUpdate || thoughts.length > 0;

    if (shouldDeleteOldThoughts) {
      // 先删除页面中已有的想法区块
      const deleteResult = await deleteNotionBlocks(apiKey, pageId, "thoughts");
      if (!deleteResult) {
        console.warn("删除旧想法区块失败，可能会导致内容重复");
      }
    } else {
      console.log("增量更新模式且没有新想法，保留现有想法区块");
    }

    // 如果在增量模式下没有新想法，则跳过写入步骤
    if (incrementalUpdate && thoughts.length === 0) {
      console.log("增量更新模式下没有新想法，跳过写入步骤");
      return true;
    }

    // 设置请求头
    const headers = getNotionHeaders(apiKey, NOTION_VERSION);

    // 创建页面内容的blocks - 只添加想法区域标题
    const blocks: any[] = [
      // 添加"想法"标题
      {
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: [
            {
              type: "text",
              text: {
                content: "💭 想法",
              },
            },
          ],
        },
      },
      // 添加分隔符
      {
        object: "block",
        type: "divider",
        divider: {},
      },
    ];

    // 按章节对想法进行分组
    const thoughtsByChapter = thoughts.reduce((acc: any, thought: any) => {
      const chapterUid = thought.chapterUid || 0;
      if (!acc[chapterUid]) {
        acc[chapterUid] = {
          chapterTitle: thought.chapterTitle || `章节 ${chapterUid}`,
          thoughts: [],
        };
      }
      acc[chapterUid].thoughts.push(thought);
      return acc;
    }, {});

    // 将章节按UID排序
    const sortedChapterUids = Object.keys(thoughtsByChapter).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );

    console.log(`想法已按 ${sortedChapterUids.length} 个章节分组`);

    // 遍历每个章节
    for (const chapterUid of sortedChapterUids) {
      const chapterData = thoughtsByChapter[chapterUid];
      const chapterThoughts = chapterData.thoughts;
      console.log(
        `处理章节 ${chapterUid} 中的 ${chapterThoughts.length} 条想法`
      );

      // 如果按章节组织，添加章节标题
      if (organizeByChapter) {
        blocks.push({
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: chapterData.chapterTitle,
                },
              },
            ],
          },
        });
      }

      // 添加每条想法
      for (const thought of chapterThoughts) {
        // 添加原文（使用引用块）
        if (thought.abstract) {
          blocks.push({
            object: "block",
            type: "quote",
            quote: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: thought.abstract,
                  },
                },
              ],
            },
          });
        }

        // 添加想法内容（使用段落块，加粗显示）
        if (thought.content) {
          blocks.push({
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: `💭 ${thought.content}`,
                  },
                  annotations: {
                    bold: true,
                    color: "blue",
                  },
                },
              ],
            },
          });
        }

        // 如果不按章节组织，添加分隔符
        if (!organizeByChapter) {
          blocks.push({
            object: "block",
            type: "divider",
            divider: {},
          });
        }
      }

      // 如果按章节组织，在章节结束后添加分隔符
      if (organizeByChapter) {
        blocks.push({
          object: "block",
          type: "divider",
          divider: {},
        });
      }
    }

    return await addBlocksToNotion(apiKey, pageId, blocks);
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.error("写入想法数据失败:", axiosError.message);
    return false;
  }
}

/**
 * 批量添加Blocks到Notion
 */
async function addBlocksToNotion(
  apiKey: string,
  pageId: string,
  blocks: any[]
): Promise<boolean> {
  try {
    console.log(`共准备了 ${blocks.length} 个 blocks 用于添加到 Notion 页面`);

    // 设置请求头
    const headers = getNotionHeaders(apiKey, NOTION_VERSION);

    // 一次请求最多只能添加100个block，所以可能需要分批添加
    const MAX_BLOCKS_PER_REQUEST = 100;

    for (let i = 0; i < blocks.length; i += MAX_BLOCKS_PER_REQUEST) {
      const batchBlocks = blocks.slice(i, i + MAX_BLOCKS_PER_REQUEST);

      console.log(`添加第 ${i + 1} 到 ${i + batchBlocks.length} 个block...`);

      try {
        // 调用Notion API添加blocks
        const response = await axios.patch(
          `${NOTION_API_BASE_URL}/blocks/${pageId}/children`,
          {
            children: batchBlocks,
          },
          { headers }
        );

        console.log(`API响应状态: ${response.status}`);
      } catch (error: any) {
        console.error(`添加blocks批次失败:`, error.message);
        if (error.response) {
          console.error(`响应状态: ${error.response.status}`);
          console.error(
            `响应数据: ${JSON.stringify(error.response.data).substring(
              0,
              300
            )}...`
          );
        }
        throw error; // 重新抛出错误以便外层捕获
      }

      // 如果还有更多blocks要添加，等待一下避免请求过快
      if (i + MAX_BLOCKS_PER_REQUEST < blocks.length) {
        console.log(`等待500毫秒后继续添加下一批次...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(`数据已成功写入到Notion页面`);
    return true;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.error("写入数据失败:", axiosError.message);
    return false;
  }
}

/**
 * 删除Notion页面中特定类型的内容块
 */
export async function deleteNotionBlocks(
  apiKey: string,
  pageId: string,
  blockType: NotionBlockType
): Promise<boolean> {
  try {
    console.log(`\n准备删除页面 ${pageId} 中的 ${blockType} 类型内容块...`);

    // 设置请求头
    const headers = getNotionHeaders(apiKey, NOTION_VERSION);

    // 获取页面的所有子块
    const response = await axios.get(
      `${NOTION_API_BASE_URL}/blocks/${pageId}/children`,
      { headers }
    );

    const blocks = response.data.results;
    console.log(`页面中共有 ${blocks.length} 个内容块`);

    // 根据blockType删除对应的内容块
    let deletedCount = 0;
    for (const block of blocks) {
      const shouldDelete =
        (blockType === "highlights" &&
          block.type === "heading_1" &&
          block.heading_1?.rich_text?.[0]?.text?.content?.includes("划线")) ||
        (blockType === "thoughts" &&
          block.type === "heading_1" &&
          block.heading_1?.rich_text?.[0]?.text?.content?.includes("想法"));

      if (shouldDelete) {
        try {
          await axios.delete(
            `${NOTION_API_BASE_URL}/blocks/${block.id}`,
            { headers }
          );
          deletedCount++;
          console.log(`已删除内容块: ${block.id}`);
        } catch (error: any) {
          console.error(`删除内容块 ${block.id} 失败:`, error.message);
        }
      }
    }

    console.log(`共删除了 ${deletedCount} 个 ${blockType} 类型的内容块`);
    return true;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.error("删除内容块失败:", axiosError.message);
    return false;
  }
}
