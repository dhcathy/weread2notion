/**
 * 命令行参数解析模块
 */

/**
 * 命令行参数
 */
export interface CliArgs {
  bookId?: string;
  syncAll: boolean;
  fullSync: boolean;
}

/**
 * 解析命令行参数
 */
export function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const bookId = args.find((arg) => arg.startsWith("--bookId="))?.split("=")[1];
  const syncAll = args.includes("--all") || args.includes("-a");
  const fullSync = args.includes("--full-sync") || args.includes("-f");

  return { bookId, syncAll, fullSync };
}
