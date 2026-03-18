#!/usr/bin/env node

const https = require("https");

// 配置信息 - 替换为您的信息
const GITHUB_TOKEN = ""; // 替换为您的GitHub个人访问令牌
const OWNER = ""; // 替换为您的GitHub用户名
const REPO = ""; // 仓库名
const WORKFLOW_ID = "sync.yml"; // 工作流文件名

// 从参数获取分支名，默认为main
const REF = process.argv[2] || "main";

// 准备请求数据
const data = JSON.stringify({
  ref: REF,
});

// 请求选项
const options = {
  hostname: "api.github.com",
  port: 443,
  path: `/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`,
  method: "POST",
  headers: {
    "User-Agent": "Raycast-GitHubActions",
    "Content-Type": "application/json",
    Accept: "application/vnd.github.v3+json",
    Authorization: `token ${GITHUB_TOKEN}`,
    "Content-Length": data.length,
  },
};

// 发送请求
const req = https.request(options, (res) => {
  if (res.statusCode === 204) {
    console.log(`✅ 成功触发同步工作流！在分支: ${REF}`);
  } else {
    console.log(`❌ 触发失败，状态码: ${res.statusCode}`);
    let responseData = "";
    res.on("data", (chunk) => {
      responseData += chunk;
    });
    res.on("end", () => {
      console.log(`错误详情: ${responseData}`);
    });
  }
});

req.on("error", (error) => {
  console.error(`❌ 请求出错: ${error.message}`);
});

// 写入数据并发送请求
req.write(data);
req.end();
