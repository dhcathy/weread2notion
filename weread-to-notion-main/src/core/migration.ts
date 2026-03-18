/**
 * 数据库迁移工具
 * 用于检测数据库版本并执行必要的迁移操作
 */

import fs from 'fs';
import path from 'path';
import { CURRENT_DB_VERSION, REQUIRED_DB_PROPERTIES } from '../config/db-versions';
import { SYNC_STATE_DIR } from '../config/constants';
import { checkDatabaseProperties } from '../api/notion/services';

/**
 * 从文件中获取当前数据库版本
 */
function getCurrentDbVersionFromFile(): number {
  const versionFilePath = path.join(SYNC_STATE_DIR, 'db-version.json');
  
  if (!fs.existsSync(versionFilePath)) {
    return 0; // 如果文件不存在，返回0表示未初始化
  }
  
  try {
    const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
    return versionData.version || 0;
  } catch (error) {
    console.error('读取数据库版本文件失败:', error);
    return 0;
  }
}

/**
 * 保存数据库版本到文件
 */
function saveDbVersionToFile(version: number): void {
  const versionFilePath = path.join(SYNC_STATE_DIR, 'db-version.json');
  
  // 确保目录存在
  if (!fs.existsSync(SYNC_STATE_DIR)) {
    fs.mkdirSync(SYNC_STATE_DIR, { recursive: true });
  }
  
  try {
    fs.writeFileSync(versionFilePath, JSON.stringify({ version, updatedAt: new Date().toISOString() }));
    console.log(`已保存数据库版本: ${version}`);
  } catch (error) {
    console.error('保存数据库版本文件失败:', error);
  }
}

/**
 * 清除所有同步状态
 */
function clearSyncState(): void {
  if (!fs.existsSync(SYNC_STATE_DIR)) {
    return;
  }
  
  try {
    const files = fs.readdirSync(SYNC_STATE_DIR);
    
    for (const file of files) {
      // 保留版本文件，删除其他同步状态文件
      if (file !== 'db-version.json') {
        fs.unlinkSync(path.join(SYNC_STATE_DIR, file));
      }
    }
    
    console.log('已清除所有同步状态');
  } catch (error) {
    console.error('清除同步状态失败:', error);
  }
}

/**
 * 检查是否需要迁移，并执行必要的迁移操作
 * @returns true表示需要执行全量同步，false表示不需要
 */
export async function checkAndMigrateIfNeeded(
  apiKey: string, 
  databaseId: string
): Promise<boolean> {
  console.log('正在检查数据库版本...');
  
  // 获取当前保存的版本
  const currentVersion = getCurrentDbVersionFromFile();
  
  // 检查数据库是否包含所有必要字段
  const missingProperties = await checkDatabaseProperties(apiKey, databaseId, REQUIRED_DB_PROPERTIES);
  
  // 如果版本过旧或缺少必要字段，执行迁移
  if (currentVersion < CURRENT_DB_VERSION || missingProperties.length > 0) {
    console.log('\n===== 检测到数据库需要升级 =====');
    
    if (currentVersion < CURRENT_DB_VERSION) {
      console.log(`当前版本: ${currentVersion} → 目标版本: ${CURRENT_DB_VERSION}`);
    }
    
    if (missingProperties.length > 0) {
      console.log(`缺少必要字段: ${missingProperties.join(', ')}`);
      console.log('请确保您的Notion数据库包含所有必要字段，可参考最新的模板');
    }
    
    console.log('\n正在准备迁移...');
    
    // 清除所有同步状态，以便进行全量同步
    clearSyncState();
    
    // 更新版本号
    saveDbVersionToFile(CURRENT_DB_VERSION);
    
    console.log('\n迁移准备完成，将执行全量同步以更新所有数据\n');
    return true;
  }
  
  console.log(`数据库版本检查通过，当前版本: ${currentVersion}`);
  return false;
}
