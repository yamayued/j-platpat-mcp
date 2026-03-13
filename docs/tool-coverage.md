# Tool Coverage

This document shows which official JPO retrieval endpoints are already wrapped by this MCP server.

## Current Retrieval Coverage

| MCP tool | Official API path pattern | Purpose |
| --- | --- | --- |
| `lookup_number_relation` | `/{domain}/v1/case_number_reference/{relationType}/{caseNumber}` | Resolve application, publication, and registration number relationships |
| `get_patent_progress` | `/patent/v1/app_progress/{applicationNumber}` | Patent prosecution progress |
| `get_patent_progress_simple` | `/patent/v1/app_progress_simple/{applicationNumber}` | Patent compact prosecution progress |
| `get_patent_citations` | `/patent/v1/cite_doc_info/{applicationNumber}` | Patent cited-document information |
| `get_patent_documents` | `/patent/v1/app_doc_cont_*` | Patent document bundles |
| `get_patent_registration` | `/patent/v1/registration_info/{applicationNumber}` | Patent registration information |
| `get_patent_priority_right_app_info` | `/patent/v1/priority_right_app_info/{applicationNumber}` | Patent priority-right application information |
| `get_patent_divisional_app_info` | `/patent/v1/divisional_app_info/{applicationNumber}` | Patent divisional application information |
| `get_patent_family` | `/patent/v1/family/{relation}/{caseNumber}` | Patent family information |
| `get_patent_family_list` | `/patent/v1/family_list/{relation}/{caseNumber}` | Patent family list |
| `get_patent_global_cite_class` | `/patent/v1/global_cite_class/{applicationNumber}` | Patent global citation class |
| `get_patent_global_doc_list` | `/patent/v1/global_doc_list/{applicationNumber}` | Patent global document list |
| `get_patent_global_document` | `/patent/v1/global_doc_cont/{applicationNumber}/{documentId}` | Patent global document |
| `get_patent_jp_document` | `/patent/v1/jp_doc_cont/{applicationNumber}/{documentId}` | Patent Japanese document |
| `get_patent_pct_national_phase_application_number` | `/patent/v1/pct_national_phase_application_number/{relation}/{caseNumber}` | PCT national phase number resolution |
| `get_design_progress` | `/design/v1/app_progress/{applicationNumber}` | Design prosecution progress |
| `get_design_progress_simple` | `/design/v1/app_progress_simple/{applicationNumber}` | Design compact prosecution progress |
| `get_design_documents` | `/design/v1/app_doc_cont_*` | Design document bundles |
| `get_design_registration` | `/design/v1/registration_info/{applicationNumber}` | Design registration information |
| `get_design_priority_right_app_info` | `/design/v1/priority_right_app_info/{applicationNumber}` | Design priority-right application information |
| `get_trademark_progress` | `/trademark/v1/app_progress/{applicationNumber}` | Trademark prosecution progress |
| `get_trademark_progress_simple` | `/trademark/v1/app_progress_simple/{applicationNumber}` | Trademark compact prosecution progress |
| `get_trademark_documents` | `/trademark/v1/app_doc_cont_*` | Trademark document bundles |
| `get_trademark_registration` | `/trademark/v1/registration_info/{applicationNumber}` | Trademark registration information |
| `get_trademark_priority_right_app_info` | `/trademark/v1/priority_right_app_info/{applicationNumber}` | Trademark priority-right application information |
| `resolve_applicant_code` | `/{domain}/v1/applicant_attorney*` | Resolve applicant code from name, or name from code |
| `get_jplatpat_permalink` | `/{domain}/v1/jpp_fixed_address/{applicationNumber}` | Get the official fixed J-PlatPat URL |

## Document Kinds

The document bundle tools currently normalize these official split endpoints behind a single `documentKind` input:

- `opinion_amendment`
- `refusal_reason`
- `refusal_reason_decision`

## What This Means In Practice

This MCP server is strong when you already know at least one of these:

- an application number
- a publication number
- a registration number
- an applicant name
- an applicant code

That makes it useful for:

- prosecution tracking
- document retrieval
- registration checks
- linking case records into internal workflows

## What Is Still Out Of Scope

- full-text text search
- broad prior-art discovery
- similar trademark search
- bulk-data ingestion
- ranking, deduplication, or search-oriented indexing

If you want a patent-attorney-grade discovery workflow, this MCP server should be treated as the retrieval layer, with a separate search/index layer added on top later.
