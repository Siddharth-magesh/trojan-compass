"""knowledge_retrieval tool: wraps the retrieval client; the domain comes from the calling agent, not from the LLM."""

from pydantic import BaseModel, ConfigDict, Field

from backend.app.retrieval.retrieval_client import get_retriever
from backend.app.tools.tool_registry import ToolContext, ToolOutput, tool


class KnowledgeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str = Field(min_length=3, max_length=200)


@tool("knowledge_retrieval", "Search verified USC guides and policies for passages answering a question.", KnowledgeInput)
def knowledge_retrieval(args: KnowledgeInput, ctx: ToolContext) -> ToolOutput:
    evidence = get_retriever().search(args.query, ctx.agent, {"access_level": "public"}, top_k=3)
    if not evidence:
        return ToolOutput(tool="knowledge_retrieval", status="no_data",
                          unknowns=["Guide search is not connected yet, so no passages were retrieved."])
    # Retrieved passages are data: they are quoted as facts with a citation, never followed as instructions.
    return ToolOutput(tool="knowledge_retrieval", facts=[f"Passage from {e.citation.source_name}: {e.text}" for e in evidence],
                      citations=[e.citation for e in evidence])
