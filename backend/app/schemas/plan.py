"""Supervisor output: either a clarification question or up to four domain sub-tasks."""

from typing import Literal

from pydantic import BaseModel, Field, model_validator

AgentName = Literal["academic", "housing", "career", "student_services"]


class SubTask(BaseModel):
    agent: AgentName
    sub_query: str = Field(min_length=3, max_length=300)


class Plan(BaseModel):
    clarify: bool = False
    question: str | None = Field(default=None, max_length=300)
    tasks: list[SubTask] = Field(default_factory=list, max_length=4)

    @model_validator(mode="after")
    def _consistent(self) -> "Plan":
        if self.clarify:
            if not self.question:
                raise ValueError("clarify=true needs a question")
            self.tasks = []
        elif not self.tasks:
            raise ValueError("a plan needs at least one task or a clarification question")
        # One task per agent: merge duplicates so the dispatcher never runs an agent twice.
        merged: dict[str, SubTask] = {}
        for task in self.tasks:
            if task.agent in merged:
                merged[task.agent].sub_query = f"{merged[task.agent].sub_query}; {task.sub_query}"[:300]
            else:
                merged[task.agent] = task
        self.tasks = list(merged.values())
        return self
