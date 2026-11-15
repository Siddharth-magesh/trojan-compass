"""Single entry point for LLM calls: mock/cache/live modes, Groq primary with Gemini fallback, model tiering by task,
a circuit breaker per provider, timeouts, one retry and Pydantic-validated JSON."""

import json
import time
from typing import Any, TypeVar

from openai import OpenAI, RateLimitError
from pydantic import BaseModel, ValidationError

from backend.app.config.settings import settings
from backend.app.llm_gateway import llm_cache, mock_llm
from backend.app.llm_gateway.budget import RequestBudget
from backend.app.observability import metrics
from backend.app.resilience.circuit_breaker import breaker

T = TypeVar("T", bound=BaseModel)
MAX_RATE_LIMIT_WAIT_S = 10.0


class LLMUnavailable(RuntimeError):
    """No provider could answer (no keys, timeouts or errors on every attempt)."""


class LLMFormatError(RuntimeError):
    """The model answered but the output did not match the expected schema."""


class ToolCall(BaseModel):
    id: str
    name: str
    arguments: str  # raw JSON string; the tool registry validates it against the tool's input model


class LLMResult(BaseModel):
    content: str | None = None
    tool_calls: list[ToolCall] = []
    model: str
    cached: bool = False


def tier_model(task: str) -> str:
    """Model tiering: planning and tool selection may use a smaller model; writing the answer always uses the primary."""
    if task == "supervisor" and settings.planner_model:
        return settings.planner_model
    if task.startswith("agent_") and settings.agent_model:
        return settings.agent_model
    return settings.primary_model


def _providers(task: str) -> list[tuple[str, str, str]]:
    """(name, model, base_url) for each provider that has a key, primary first."""
    out = []
    if settings.groq_api_key:
        out.append(("groq", tier_model(task), settings.groq_base_url))
    if settings.gemini_api_key:
        out.append(("gemini", settings.fallback_model, settings.gemini_base_url))
    return out


def _retry_after(exc: RateLimitError) -> float:
    """Seconds the provider asked us to wait (Retry-After header), capped so a request never stalls for long."""
    try:
        return min(float(exc.response.headers.get("retry-after", "2")), MAX_RATE_LIMIT_WAIT_S)
    except (TypeError, ValueError, AttributeError):
        return 2.0


def _client(provider: str, base_url: str) -> OpenAI:
    key = settings.groq_api_key if provider == "groq" else settings.gemini_api_key
    return OpenAI(api_key=key.get_secret_value(), base_url=base_url, timeout=settings.llm_timeout_s, max_retries=0)


def _call_live(messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None, options: dict[str, Any],
               task: str, budget: RequestBudget) -> LLMResult:
    errors = []
    for provider, model, base_url in _providers(task):
        guard = breaker(f"llm:{provider}", settings.llm_breaker_failures, settings.llm_breaker_open_s)
        if not guard.allow():  # provider failing repeatedly: go straight to the next one instead of waiting on timeouts
            errors.append(f"{provider}: circuit open")
            metrics.count("llm_breaker_skips")
            continue
        for _attempt in range(2):  # first try + one retry per provider
            budget.charge()
            start = time.perf_counter()
            try:
                kwargs: dict[str, Any] = {"model": model, "messages": messages, "max_tokens": options["max_tokens"],
                                          "temperature": options["temperature"]}
                if tools:
                    kwargs.update(tools=tools, tool_choice="auto")
                if options.get("json"):
                    kwargs["response_format"] = {"type": "json_object"}
                resp = _client(provider, base_url).chat.completions.create(**kwargs)
            except Exception as exc:  # network, timeout, provider error: retry then fall back
                errors.append(f"{provider}: {type(exc).__name__}")
                budget.record({"task": task, "model": model, "ok": False, "error": type(exc).__name__,
                               "latency_ms": round((time.perf_counter() - start) * 1000)})
                if isinstance(exc, RateLimitError) and _attempt == 0:
                    time.sleep(_retry_after(exc))  # an immediate retry would hit the same per-minute limit
                if _attempt == 1:
                    guard.record(False)
                continue
            guard.record(True)
            msg = resp.choices[0].message
            usage = resp.usage
            budget.record({"task": task, "model": model, "ok": True, "cached": False,
                           "prompt_tokens": getattr(usage, "prompt_tokens", 0),
                           "completion_tokens": getattr(usage, "completion_tokens", 0),
                           "latency_ms": round((time.perf_counter() - start) * 1000)})
            calls = [ToolCall(id=c.id, name=c.function.name, arguments=c.function.arguments or "{}")
                     for c in (msg.tool_calls or [])]
            return LLMResult(content=msg.content, tool_calls=calls, model=model)
    raise LLMUnavailable("; ".join(errors) or "no LLM provider keys configured")


def complete(task: str, messages: list[dict[str, Any]], budget: RequestBudget, *,
             tools: list[dict[str, Any]] | None = None, json_mode: bool = False, temperature: float = 0.0,
             max_tokens: int | None = None) -> LLMResult:
    """One logical LLM call. task names the node (used for mocks and logs)."""
    if settings.llm_mode == "mock":
        budget.charge()
        out = mock_llm.respond(task, messages, tools)
        budget.record({"task": task, "model": "mock", "ok": True, "cached": False})
        calls = [ToolCall(id=c.get("id", f"mock_{i}"), name=c["name"], arguments=json.dumps(c["arguments"]))
                 for i, c in enumerate(out.get("tool_calls", []))]
        return LLMResult(content=out.get("content"), tool_calls=calls, model="mock")

    options = {"temperature": temperature, "json": json_mode, "max_tokens": max_tokens or settings.llm_max_tokens}
    key = llm_cache.cache_key(tier_model(task), messages, tools, options, budget.student_id)
    if settings.llm_mode == "cache" and (hit := llm_cache.get(key)):
        budget.record({"task": task, "model": hit.get("model", ""), "ok": True, "cached": True})
        return LLMResult.model_validate({**hit, "cached": True})
    result = _call_live(messages, tools, options, task, budget)
    llm_cache.put(key, result.model_dump())
    return result


def call_json(task: str, messages: list[dict[str, Any]], model_cls: type[T], budget: RequestBudget,
              temperature: float = 0.0, max_tokens: int | None = None) -> T:
    """LLM call whose content must be JSON matching model_cls; raises LLMFormatError otherwise."""
    result = complete(task, messages, budget, json_mode=True, temperature=temperature, max_tokens=max_tokens)
    try:
        return model_cls.model_validate_json(_strip_fences(result.content or ""))
    except ValidationError as exc:
        raise LLMFormatError(f"{task}: {exc.error_count()} validation errors") from exc


def _strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
    return text
