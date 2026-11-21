// tools/index.ts —— 第 07 章示例工具集（零外部依赖，直接能跑）
import { z } from "zod";
import { defineTool } from "../lib/ai";

// 工具1：当前时间（解决「模型不知道现在几点」）
export const getTimeTool = defineTool({
  name: "getCurrentTime",
  description: "获取当前日期时间。当用户问题涉及「现在/今天/几点」等时间信息时使用。无需参数。",
  parameters: z.object({}),
  execute: async () => ({ iso: new Date().toISOString(), timezone: "Asia/Shanghai" }),
});

// 工具2：精确计算（解决「模型算不准数」）
export const calcTool = defineTool({
  name: "calculate",
  description:
    "精确计算四则运算表达式。凡涉及金额、折扣、数量乘加的运算必须用本工具，禁止心算。表达式用 JS 语法，如 '(120*0.85+15)'。",
  parameters: z.object({
    expression: z.string().max(200).describe("JS 语法的数学表达式，仅允许数字和 + - * / ( ) ."),
  }),
  execute: async ({ expression }) => {
    // 白名单校验：只允许数字与运算符，绝不能把任意输入交给 Function/eval（第 18 章）
    if (!/^[\d+\-*/().\s]+$/.test(expression)) throw new Error("表达式含非法字符，只允许数字和 + - * / ( ) .");
    const result = Function(`"use strict"; return (${expression})`)() as unknown;
    if (typeof result !== "number" || !Number.isFinite(result)) throw new Error("表达式结果不是有限数字");
    return { expression, result };
  },
});

// 工具3：订单查询（mock 一个内存「数据库」，模拟接入业务系统）
export const ORDERS: Record<string, { status: string; eta: string; items: string[] }> = {
  A001: { status: "运输中", eta: "明天 18:00 前", items: ["机械键盘"] },
  A002: { status: "已签收", eta: "-", items: ["显示器支架"] },
};

export const queryOrderTool = defineTool({
  name: "queryOrder",
  description:
    "按订单号查询订单状态与预计送达时间。用户询问订单进度/物流/到货时间时使用。找不到订单时返回 notFound。",
  parameters: z.object({ orderId: z.string().describe("订单号，如 A001") }),
  execute: async ({ orderId }) => ORDERS[orderId.toUpperCase()] ?? { notFound: true, orderId },
});

export const defaultTools = [getTimeTool, calcTool, queryOrderTool];
