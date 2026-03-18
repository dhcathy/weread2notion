/**
 * 微信读书API工具函数
 */

import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

/**
 * 创建带有超时和重试能力的API请求
 * @param url 请求URL
 * @param options 请求选项
 * @param maxRetries 最大重试次数
 * @returns 响应数据
 */
export async function makeRequest<T>(
  url: string, 
  options: AxiosRequestConfig, 
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 为GET请求添加时间戳避免缓存
      if (options.method?.toLowerCase() === 'get') {
        options.params = {
          ...options.params,
          _: new Date().getTime()
        };
      }
      
      const response = await axios(url, {
        timeout: 30000,  // 30秒超时
        ...options
      });
      
      // 检查返回的错误码
      if (response.data.errcode !== undefined && response.data.errcode !== 0) {
        throw new Error(`API错误: ${response.data.errmsg || '未知错误'} (code: ${response.data.errcode})`);
      }
      
      return response.data;
    } catch (error: any) {
      lastError = error;
      console.error(`请求失败 (尝试 ${attempt + 1}/${maxRetries}):`, error.message);
      
      // 最后一次尝试失败则抛出异常
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // 等待一定时间后重试 (增加随机时间避免同时请求)
      const delay = 1000 * (attempt + 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('所有请求尝试都失败');
}

/**
 * 格式化时间戳为可读日期
 * @param timestamp 时间戳(秒)
 * @returns 格式化的日期字符串 YYYY-MM-DD HH:mm:ss
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}
