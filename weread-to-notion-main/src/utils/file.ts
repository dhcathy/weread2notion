/**
 * 文件操作工具
 */

import * as fs from "fs";
import * as path from "path";
import { SyncState } from "../config/types";
import { SYNC_STATE_DIR } from "../config/constants";

/**
 * 获取同步状态文件路径
 */
export function getSyncStateFilePath(bookId: string): string {
  return path.join(SYNC_STATE_DIR, `${bookId}.json`);
}

/**
 * 获取书籍的同步状态
 */
export function getSyncState(bookId: string): SyncState {
  try {
    // 确保目录存在
    if (!fs.existsSync(SYNC_STATE_DIR)) {
      fs.mkdirSync(SYNC_STATE_DIR, { recursive: true });
    }

    const filePath = getSyncStateFilePath(bookId);

    if (fs.existsSync(filePath)) {
      const state = JSON.parse(fs.readFileSync(filePath, "utf8"));

      // 添加验证，确保同步时间不是未来时间
      const now = Date.now();
      if (state.lastSyncTime > now) {
        console.warn(
          `检测到未来的同步时间 ${new Date(
            state.lastSyncTime
          ).toLocaleString()}，重置为当前时间`
        );
        state.lastSyncTime = 0; // 重置为0以强制全量同步
        state.highlightsSynckey = "0";
        state.thoughtsSynckey = "0";
      }

      console.log(
        `已加载书籍 ${bookId} 的同步状态: 上次同步时间 ${new Date(
          state.lastSyncTime
        ).toLocaleString()}`
      );
      return state;
    }
  } catch (error) {
    console.error(`获取同步状态失败:`, error);
  }

  // 返回默认状态
  return {
    bookId,
    lastSyncTime: 0,
    highlightsSynckey: "0",
    thoughtsSynckey: "0",
  };
}

/**
 * 保存书籍的同步状态
 */
export function saveSyncState(state: SyncState): void {
  try {
    // 确保目录存在
    if (!fs.existsSync(SYNC_STATE_DIR)) {
      fs.mkdirSync(SYNC_STATE_DIR, { recursive: true });
    }

    const filePath = getSyncStateFilePath(state.bookId);
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
    console.log(
      `已保存书籍 ${state.bookId} 的同步状态: 同步时间 ${new Date(
        state.lastSyncTime
      ).toLocaleString()}`
    );
  } catch (error) {
    console.error(`保存同步状态失败:`, error);
  }
}
