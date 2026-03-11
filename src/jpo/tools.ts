import * as z from "zod/v4";

import { JpoClient } from "./client.js";
import type { JpoApiResponse } from "./types.js";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const applicationNumberSchema = z.string().regex(/^[0-9]{10}$/, "10桁の出願番号を指定してください。");
const applicantCodeSchema = z.string().regex(/^[0-9]{9}$/, "9桁の申請人コードを指定してください。");
const domainSchema = z.enum(["patent", "design", "trademark"]);

const patentDocumentKindSchema = z.enum([
  "opinion_amendment",
  "refusal_reason",
  "refusal_reason_decision"
]);

const trademarkDocumentKindSchema = z.enum([
  "opinion_amendment",
  "refusal_reason",
  "refusal_reason_decision"
]);

const caseNumberReferenceTypeSchema = z.enum([
  "application",
  "publication",
  "registration"
]);

type PatentDocumentKind = z.infer<typeof patentDocumentKindSchema>;
type TrademarkDocumentKind = z.infer<typeof trademarkDocumentKindSchema>;

const patentDocumentPathMap: Record<PatentDocumentKind, string> = {
  opinion_amendment: "/patent/v1/app_doc_cont_opinion_amendment/{applicationNumber}",
  refusal_reason: "/patent/v1/app_doc_cont_refusal_reason/{applicationNumber}",
  refusal_reason_decision: "/patent/v1/app_doc_cont_refusal_reason_decision/{applicationNumber}"
};

const trademarkDocumentPathMap: Record<TrademarkDocumentKind, string> = {
  opinion_amendment: "/trademark/v1/app_doc_cont_opinion_amendment/{applicationNumber}",
  refusal_reason: "/trademark/v1/app_doc_cont_refusal_reason/{applicationNumber}",
  refusal_reason_decision: "/trademark/v1/app_doc_cont_refusal_reason_decision/{applicationNumber}"
};

export function registerJpoTools(server: McpServer, client: JpoClient): void {
  server.registerTool(
    "lookup_number_relation",
    {
      title: "Lookup Number Relation",
      description: "Resolve official case number relationships from the JPO case number reference API.",
      inputSchema: {
        domain: domainSchema.describe("対象ドメイン: patent / design / trademark"),
        relationType: caseNumberReferenceTypeSchema.describe("案件番号の種別: application / publication / registration"),
        caseNumber: z.string().min(1).describe("参照したい案件番号")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ domain, relationType, caseNumber }) =>
      buildToolResult(
        "lookup_number_relation",
        `/${domain}/v1/case_number_reference/${relationType}/${encodeSegment(caseNumber)}`,
        client
      )
  );

  server.registerTool(
    "get_patent_progress",
    {
      title: "Get Patent Progress",
      description: "Fetch patent prosecution progress from the official JPO API.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("西暦4桁 + 0埋め6桁の出願番号")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber }) =>
      buildToolResult(
        "get_patent_progress",
        `/patent/v1/app_progress/${applicationNumber}`,
        client
      )
  );

  server.registerTool(
    "get_patent_citations",
    {
      title: "Get Patent Citations",
      description: "Fetch cited document information for a patent application from the official JPO API.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("西暦4桁 + 0埋め6桁の出願番号")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber }) =>
      buildToolResult(
        "get_patent_citations",
        `/patent/v1/cite_doc_info/${applicationNumber}`,
        client
      )
  );

  server.registerTool(
    "get_patent_documents",
    {
      title: "Get Patent Documents",
      description: "Fetch patent application document bundles such as amendment, refusal reason, and decision packages.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("西暦4桁 + 0埋め6桁の出願番号"),
        documentKind: patentDocumentKindSchema.describe("取得したい文書群")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber, documentKind }) =>
      buildToolResult(
        "get_patent_documents",
        patentDocumentPathMap[documentKind].replace("{applicationNumber}", applicationNumber),
        client
      )
  );

  server.registerTool(
    "get_patent_registration",
    {
      title: "Get Patent Registration",
      description: "Fetch patent registration information from the official JPO API.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("西暦4桁 + 0埋め6桁の出願番号")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber }) =>
      buildToolResult(
        "get_patent_registration",
        `/patent/v1/registration_info/${applicationNumber}`,
        client
      )
  );

  server.registerTool(
    "get_trademark_progress",
    {
      title: "Get Trademark Progress",
      description: "Fetch trademark prosecution progress from the official JPO API.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("西暦4桁 + 0埋め6桁の出願番号")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber }) =>
      buildToolResult(
        "get_trademark_progress",
        `/trademark/v1/app_progress/${applicationNumber}`,
        client
      )
  );

  server.registerTool(
    "get_trademark_registration",
    {
      title: "Get Trademark Registration",
      description: "Fetch trademark registration information from the official JPO API.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("西暦4桁 + 0埋め6桁の出願番号")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber }) =>
      buildToolResult(
        "get_trademark_registration",
        `/trademark/v1/registration_info/${applicationNumber}`,
        client
      )
  );

  server.registerTool(
    "get_trademark_documents",
    {
      title: "Get Trademark Documents",
      description: "Fetch trademark application document bundles such as amendment, refusal reason, and decision packages.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("西暦4桁 + 0埋め6桁の出願番号"),
        documentKind: trademarkDocumentKindSchema.describe("取得したい文書群")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber, documentKind }) =>
      buildToolResult(
        "get_trademark_documents",
        trademarkDocumentPathMap[documentKind].replace("{applicationNumber}", applicationNumber),
        client
      )
  );

  server.registerTool(
    "resolve_applicant_code",
    {
      title: "Resolve Applicant Code",
      description: "Resolve applicant code to name or name to applicant code using the official JPO applicant endpoints.",
      inputSchema: {
        domain: domainSchema.describe("対象ドメイン: patent / design / trademark"),
        lookupBy: z.enum(["name", "code"]).describe("name: 名称からコード取得 / code: コードから名称取得"),
        value: z.string().min(1).describe("完全一致の名称、または9桁の申請人コード")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ domain, lookupBy, value }) => {
      const path = lookupBy === "name"
        ? `/${domain}/v1/applicant_attorney/${encodeSegment(value)}`
        : `/${domain}/v1/applicant_attorney_cd/${applicantCodeSchema.parse(value)}`;

      return buildToolResult("resolve_applicant_code", path, client);
    }
  );

  server.registerTool(
    "get_jplatpat_permalink",
    {
      title: "Get J-PlatPat Permalink",
      description: "Resolve the official J-PlatPat fixed address for a patent, design, or trademark application.",
      inputSchema: {
        domain: domainSchema.describe("対象ドメイン: patent / design / trademark"),
        applicationNumber: applicationNumberSchema.describe("西暦4桁 + 0埋め6桁の出願番号")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ domain, applicationNumber }) =>
      buildToolResult(
        "get_jplatpat_permalink",
        `/${domain}/v1/jpp_fixed_address/${applicationNumber}`,
        client
      )
  );
}

async function buildToolResult(
  toolName: string,
  path: string,
  client: JpoClient
) {
  try {
    const response = await client.get(path);
    const result = response.result;
    const summary = [
      `tool: ${toolName}`,
      `status_code: ${result.statusCode}`,
      `remain_access_count: ${result.remainAccessCount || "unknown"}`,
      result.errorMessage ? `error_message: ${result.errorMessage}` : undefined,
      "",
      safeStringify(response)
    ]
      .filter((line): line is string => line !== undefined)
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: summary
        }
      ],
      structuredContent: {
        toolName,
        path,
        response
      },
      isError: result.statusCode !== "100"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      content: [
        {
          type: "text" as const,
          text: `tool: ${toolName}\nerror: ${message}`
        }
      ],
      structuredContent: {
        toolName,
        path,
        error: message
      },
      isError: true
    };
  }
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

function safeStringify(value: JpoApiResponse): string {
  return JSON.stringify(value, null, 2);
}
