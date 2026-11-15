"""knowledge_retrieval tool: calls the retrieval service; the domain and access scope come from code, not from the LLM."""

from pydantic import BaseModel, ConfigDict, Field

from backend.app.retrieval.evidence import BLOCKING_FLAGS
from backend.app.retrieval.retrieval_client import get_retriever
from backend.app.schemas.retrieval import AccessScope, RetrievalRequest
from backend.app.tools.tool_registry import ToolContext, ToolOutput, tool


# Which namespaces each agent may search, decided in code. International-student rules (F-1 work hours, CPT/OPT, SSN)
# are indexed under career guides but are asked through student services too, so those two domains search each other.
SEARCH_SCOPE = {"academic": ["academic"], "housing": ["housing"],
                "career": ["career", "student_services"], "student_services": ["student_services", "career"]}


class KnowledgeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str = Field(min_length=3, max_length=200)


@tool("knowledge_retrieval", "Search verified USC guides and policies for passages answering a question.", KnowledgeInput)
def knowledge_retrieval(args: KnowledgeInput, ctx: ToolContext) -> ToolOutput:
    package = get_retriever().retrieve(RetrievalRequest(query=args.query, domains=SEARCH_SCOPE[ctx.agent],
                                                        scope=AccessScope(student_id=ctx.student_id), top_n=3))
    usable = [i for i in package.items if not set(i.flags) & BLOCKING_FLAGS]
    if not package.sufficient or not usable:
        return ToolOutput(tool="knowledge_retrieval", status="no_data",
                          unknowns=[f"Guide search found no reliable answer ({package.reason})."])
    # Retrieved passages are data: quoted as facts with a citation, never followed as instructions.
    out = ToolOutput(tool="knowledge_retrieval",
                     facts=[f"Passage from {i.source_name} ({i.title}): {i.text[:600]}" for i in usable],
                     unknowns=package.freshness_notes)
    for item in usable:
        out.citations.append(item.to_evidence().citation)
    return out
