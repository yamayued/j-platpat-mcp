import * as z from "zod/v4";

import { JpoClient } from "./client.js";
import type { JpoApiResponse } from "./types.js";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const applicationNumberSchema = z.string().regex(
  /^[0-9]{10}$/,
  "Application number must be 10 digits."
);
const numberStringSchema = z.string().min(1).describe("Case number string.");
const applicantCodeSchema = z.string().regex(/^[0-9]{9}$/, "Applicant code must be 9 digits.");
const domainSchema = z.enum(["patent", "design", "trademark"]);
const relationSchema = z.enum(["application", "publication", "registration"]);
const documentIdSchema = z.string().min(1).describe("Document id.");
const caseNumberReferenceTypeSchema = z.enum([
  "application",
  "publication",
  "registration"
]);

const patentDocumentKindSchema = z.enum([
  "opinion_amendment",
  "refusal_reason",
  "refusal_reason_decision"
]);

const designDocumentKindSchema = z.enum([
  "opinion_amendment",
  "refusal_reason",
  "refusal_reason_decision"
]);

const trademarkDocumentKindSchema = z.enum([
  "opinion_amendment",
  "refusal_reason",
  "refusal_reason_decision"
]);

type PatentDocumentKind = z.infer<typeof patentDocumentKindSchema>;
type DesignDocumentKind = z.infer<typeof designDocumentKindSchema>;
type TrademarkDocumentKind = z.infer<typeof trademarkDocumentKindSchema>;

const patentDocumentPathMap: Record<PatentDocumentKind, string> = {
  opinion_amendment: "/patent/v1/app_doc_cont_opinion_amendment/{applicationNumber}",
  refusal_reason: "/patent/v1/app_doc_cont_refusal_reason/{applicationNumber}",
  refusal_reason_decision: "/patent/v1/app_doc_cont_refusal_reason_decision/{applicationNumber}"
};

const designDocumentPathMap: Record<DesignDocumentKind, string> = {
  opinion_amendment: "/design/v1/app_doc_cont_opinion_amendment/{applicationNumber}",
  refusal_reason: "/design/v1/app_doc_cont_refusal_reason/{applicationNumber}",
  refusal_reason_decision: "/design/v1/app_doc_cont_refusal_reason_decision/{applicationNumber}"
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
        domain: domainSchema.describe("patent / design / trademark"),
        relationType: caseNumberReferenceTypeSchema.describe("application / publication / registration"),
        caseNumber: numberStringSchema.describe("Case number")
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
        applicationNumber: applicationNumberSchema.describe("Japan patent application number (10 digits)")
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
    "get_patent_progress_simple",
    {
      title: "Get Patent Progress (Simple)",
      description: "Fetch compact patent prosecution progress from the official JPO API.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("Japan patent application number (10 digits)")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber }) =>
      buildToolResult(
        "get_patent_progress_simple",
        `/patent/v1/app_progress_simple/${applicationNumber}`,
        client
      )
  );

  server.registerTool(
    "get_patent_citations",
    {
      title: "Get Patent Citations",
      description: "Fetch cited document information for a patent application from the official JPO API.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("Japan patent application number (10 digits)")
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
        applicationNumber: applicationNumberSchema.describe("Japan patent application number (10 digits)"),
        documentKind: patentDocumentKindSchema.describe("one of: opinion_amendment, refusal_reason, refusal_reason_decision")
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
        applicationNumber: applicationNumberSchema.describe("Japan patent application number (10 digits)")
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
    "get_patent_priority_right_app_info",
    {
      title: "Get Patent Priority Right Information",
      description: "Fetch patent priority-right information.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("Japan patent application number (10 digits)")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber }) =>
      buildToolResult(
        "get_patent_priority_right_app_info",
        `/patent/v1/priority_right_app_info/${applicationNumber}`,
        client
      )
  );

  server.registerTool(
    "get_patent_divisional_app_info",
    {
      title: "Get Patent Divisional Application Information",
      description: "Fetch patent divisional-application information.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("Japan patent application number (10 digits)")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber }) =>
      buildToolResult(
        "get_patent_divisional_app_info",
        `/patent/v1/divisional_app_info/${applicationNumber}`,
        client
      )
  );

  server.registerTool(
    "get_patent_family",
    {
      title: "Get Patent Family",
      description: "Fetch patent family record by case number.",
      inputSchema: {
        relation: relationSchema.describe("application / publication / registration"),
        caseNumber: numberStringSchema.describe("Case number")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ relation, caseNumber }) =>
      buildToolResult(
        "get_patent_family",
        `/patent/v1/family/${relation}/${encodeSegment(caseNumber)}`,
        client
      )
  );

  server.registerTool(
    "get_patent_family_list",
    {
      title: "Get Patent Family List",
      description: "Fetch patent family list by case number.",
      inputSchema: {
        relation: relationSchema.describe("application / publication / registration"),
        caseNumber: numberStringSchema.describe("Case number")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ relation, caseNumber }) =>
      buildToolResult(
        "get_patent_family_list",
        `/patent/v1/family_list/${relation}/${encodeSegment(caseNumber)}`,
        client
      )
  );

  server.registerTool(
    "get_patent_global_cite_class",
    {
      title: "Get Patent Global Citation Class",
      description: "Fetch patent global citation class information.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("Japan patent application number (10 digits)")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber }) =>
      buildToolResult(
        "get_patent_global_cite_class",
        `/patent/v1/global_cite_class/${applicationNumber}`,
        client
      )
  );

  server.registerTool(
    "get_patent_global_doc_list",
    {
      title: "Get Patent Global Document List",
      description: "Fetch patent global document list.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("Japan patent application number (10 digits)")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber }) =>
      buildToolResult(
        "get_patent_global_doc_list",
        `/patent/v1/global_doc_list/${applicationNumber}`,
        client
      )
  );

  server.registerTool(
    "get_patent_global_document",
    {
      title: "Get Patent Global Document",
      description: "Fetch one patent global document by document ID.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("Japan patent application number (10 digits)"),
        documentId: documentIdSchema
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber, documentId }) =>
      buildToolResult(
        "get_patent_global_document",
        `/patent/v1/global_doc_cont/${encodeSegment(applicationNumber)}/${encodeSegment(documentId)}`,
        client
      )
  );

  server.registerTool(
    "get_patent_jp_document",
    {
      title: "Get Patent Japan Document",
      description: "Fetch one patent Japan document by document ID.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("Japan patent application number (10 digits)"),
        documentId: documentIdSchema
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber, documentId }) =>
      buildToolResult(
        "get_patent_jp_document",
        `/patent/v1/jp_doc_cont/${encodeSegment(applicationNumber)}/${encodeSegment(documentId)}`,
        client
      )
  );

  server.registerTool(
    "get_patent_pct_national_phase_application_number",
    {
      title: "Get Patent PCT National Phase Number",
      description: "Resolve PCT national phase application number.",
      inputSchema: {
        relation: relationSchema.describe("application / publication / registration"),
        caseNumber: numberStringSchema.describe("Case number")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ relation, caseNumber }) =>
      buildToolResult(
        "get_patent_pct_national_phase_application_number",
        `/patent/v1/pct_national_phase_application_number/${relation}/${encodeSegment(caseNumber)}`,
        client
      )
  );

  server.registerTool(
    "get_design_progress",
    {
      title: "Get Design Progress",
      description: "Fetch design prosecution progress from the official JPO API.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("Japan design application number (10 digits)")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber }) =>
      buildToolResult(
        "get_design_progress",
        `/design/v1/app_progress/${applicationNumber}`,
        client
      )
  );

  server.registerTool(
    "get_design_progress_simple",
    {
      title: "Get Design Progress (Simple)",
      description: "Fetch compact design prosecution progress from the official JPO API.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("Japan design application number (10 digits)")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber }) =>
      buildToolResult(
        "get_design_progress_simple",
        `/design/v1/app_progress_simple/${applicationNumber}`,
        client
      )
  );

  server.registerTool(
    "get_design_registration",
    {
      title: "Get Design Registration",
      description: "Fetch design registration information from the official JPO API.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("Japan design application number (10 digits)")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber }) =>
      buildToolResult(
        "get_design_registration",
        `/design/v1/registration_info/${applicationNumber}`,
        client
      )
  );

  server.registerTool(
    "get_design_documents",
    {
      title: "Get Design Documents",
      description: "Fetch design application document bundles such as amendment, refusal reason, and decision packages.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("Japan design application number (10 digits)"),
        documentKind: designDocumentKindSchema.describe("one of: opinion_amendment, refusal_reason, refusal_reason_decision")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber, documentKind }) =>
      buildToolResult(
        "get_design_documents",
        designDocumentPathMap[documentKind].replace("{applicationNumber}", applicationNumber),
        client
      )
  );

  server.registerTool(
    "get_design_priority_right_app_info",
    {
      title: "Get Design Priority Right Information",
      description: "Fetch design priority-right information.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("Japan design application number (10 digits)")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber }) =>
      buildToolResult(
        "get_design_priority_right_app_info",
        `/design/v1/priority_right_app_info/${applicationNumber}`,
        client
      )
  );

  server.registerTool(
    "get_trademark_progress",
    {
      title: "Get Trademark Progress",
      description: "Fetch trademark prosecution progress from the official JPO API.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("Japan trademark application number (10 digits)")
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
    "get_trademark_progress_simple",
    {
      title: "Get Trademark Progress (Simple)",
      description: "Fetch compact trademark prosecution progress from the official JPO API.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("Japan trademark application number (10 digits)")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber }) =>
      buildToolResult(
        "get_trademark_progress_simple",
        `/trademark/v1/app_progress_simple/${applicationNumber}`,
        client
      )
  );

  server.registerTool(
    "get_trademark_registration",
    {
      title: "Get Trademark Registration",
      description: "Fetch trademark registration information from the official JPO API.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("Japan trademark application number (10 digits)")
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
        applicationNumber: applicationNumberSchema.describe("Japan trademark application number (10 digits)"),
        documentKind: trademarkDocumentKindSchema.describe("one of: opinion_amendment, refusal_reason, refusal_reason_decision")
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
    "get_trademark_priority_right_app_info",
    {
      title: "Get Trademark Priority Right Information",
      description: "Fetch trademark priority-right information.",
      inputSchema: {
        applicationNumber: applicationNumberSchema.describe("Japan trademark application number (10 digits)")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ applicationNumber }) =>
      buildToolResult(
        "get_trademark_priority_right_app_info",
        `/trademark/v1/priority_right_app_info/${applicationNumber}`,
        client
      )
  );

  server.registerTool(
    "resolve_applicant_code",
    {
      title: "Resolve Applicant Code",
      description: "Resolve applicant code to name or name to applicant code using the official JPO applicant endpoints.",
      inputSchema: {
        domain: domainSchema.describe("patent / design / trademark"),
        lookupBy: z.enum(["name", "code"]).describe("name: applicant string, code: applicant code"),
        value: z.string().min(1).describe("Applicant name or 9-digit applicant code")
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
        domain: domainSchema.describe("patent / design / trademark"),
        applicationNumber: applicationNumberSchema.describe("Japan application number (10 digits)")
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
