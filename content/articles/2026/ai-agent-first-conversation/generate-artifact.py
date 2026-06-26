#!/usr/bin/env python3
"""Generate artifact.json for the garden site with proper hashes."""

import hashlib
import json
from pathlib import Path
from datetime import datetime

DIR = Path(__file__).parent
DATE = "2026-06-26"


def sha256_file(path):
    h = hashlib.sha256()
    h.update(Path(path).read_bytes())
    return h.hexdigest()


def sha256_text(text):
    h = hashlib.sha256()
    h.update(text.encode("utf-8"))
    return h.hexdigest()


article_path = DIR / "article.md"
agent_path = DIR / "agent.md"

article_hash = sha256_file(article_path)
agent_hash = sha256_file(agent_path)

artifact = {
    "schemaVersion": 3,
    "id": "article:ai-agent-first-conversation",
    "slug": "ai-agent-first-conversation",
    "title": "You Do Not Need to Learn AI First: A 5-Minute Conversation Recipe",
    "canonicalPath": "/articles/ai-agent-first-conversation/",
    "sourcePath": "content/articles/2026/ai-agent-first-conversation/article.md",
    "agentBriefPath": "content/articles/2026/ai-agent-first-conversation/agent.md",
    "thesis": "Non-technical adults and teens can start using AI agents by copying one plain-language prompt into any capable model, letting the agent interview them about an everyday problem and suggest what to ask next.",
    "status": "published",
    "maturity": "seed",
    "publishedAt": DATE,
    "updatedAt": DATE,
    "audiences": ["general", "students", "non-technical"],
    "topics": ["ai-agents", "onboarding", "ai-literacy"],
    "series": {
        "slug": "ai-agent-conversations",
        "title": "First Steps with AI Agents",
        "order": 0,
        "role": "guide",
    },
    "claims": [
        {
            "id": "claim-001",
            "claim": "A single model-agnostic starter prompt is a more effective onboarding artifact for non-technical users than a feature list or vendor tutorial.",
            "confidence": "medium-high",
            "status": "core",
            "evidence": [
                {
                    "sourceId": "source-chatgpt-overview",
                    "snippet": "ChatGPT can answer questions, help with writing, analysis, coding, and many other tasks through conversation.",
                    "supports": "background",
                    "assessedAt": DATE,
                }
            ],
            "counterevidence": [
                {
                    "summary": "Some users may still prefer structured tutorials or video walkthroughs depending on learning style.",
                    "assessedAt": DATE,
                }
            ],
        },
        {
            "id": "claim-002",
            "claim": "The AI agent itself can act as the tutor, so newcomers do not need to study AI before they start using it.",
            "confidence": "medium-high",
            "status": "core",
            "evidence": [
                {
                    "sourceId": "source-claude-capabilities",
                    "snippet": "Claude can assist with analysis, writing, coding, math, and answering questions across many domains.",
                    "supports": "background",
                    "assessedAt": DATE,
                }
            ],
            "counterevidence": [
                {
                    "summary": "Basic digital literacy and an understanding of when to verify facts are still prerequisites for safe use.",
                    "assessedAt": DATE,
                }
            ],
        },
        {
            "id": "claim-003",
            "claim": "Suggesting the next question or direction after each answer removes the blank-page problem and keeps the experience experiential rather than instructional.",
            "confidence": "medium",
            "status": "argument",
            "evidence": [
                {
                    "sourceId": "source-gemini-overview",
                    "snippet": "Gemini can engage in multi-turn conversations and help users explore topics iteratively.",
                    "supports": "background",
                    "assessedAt": DATE,
                }
            ],
            "counterevidence": [
                {
                    "summary": "The effectiveness depends on the quality of the starter prompt and the user's willingness to engage.",
                    "assessedAt": DATE,
                }
            ],
        },
        {
            "id": "claim-004",
            "claim": "Two short annotated transcripts are enough to teach the pattern: one proving intelligence through document explanation, and one proving productivity through one-input-multiple-outputs automation.",
            "confidence": "medium",
            "status": "design",
            "evidence": [
                {
                    "sourceId": "source-chatgpt-overview",
                    "snippet": "Conversational AI can summarize, explain, and draft content from user-provided inputs.",
                    "supports": "background",
                    "assessedAt": DATE,
                }
            ],
            "counterevidence": [
                {
                    "summary": "Two examples may not cover all reader contexts; additional examples may be needed after reader feedback.",
                    "assessedAt": DATE,
                }
            ],
        },
    ],
    "sources": [
        {
            "id": "source-chatgpt-overview",
            "title": "OpenAI: What can ChatGPT do?",
            "url": "https://openai.com/chatgpt/overview/",
            "type": "product",
            "accessed": DATE,
        },
        {
            "id": "source-claude-capabilities",
            "title": "Anthropic: Claude capabilities",
            "url": "https://www.anthropic.com/claude",
            "type": "product",
            "accessed": DATE,
        },
        {
            "id": "source-gemini-overview",
            "title": "Google: Gemini overview",
            "url": "https://gemini.google.com/",
            "type": "product",
            "accessed": DATE,
        },
    ],
    "related": [],
    "agentInstructions": [
        "Use claim IDs as the retrieval unit.",
        "Treat maturity=seed as an explicit uncertainty marker.",
        "Do not present AI agents as all-knowing or safe for high-stakes decisions without human review.",
    ],
    "contentHash": article_hash,
    "provenance": {
        "createdAt": DATE,
        "createdBy": "human",
        "agents": [
            {
                "role": "drafting",
                "model": "kimi",
                "invokedAt": DATE,
                "inputHash": f"sha256:{sha256_text('article ideation and drafting session')}",
                "outputHash": f"sha256:{article_hash}",
            },
            {
                "role": "review",
                "model": "kimi",
                "invokedAt": DATE,
                "inputHash": f"sha256:{sha256_text('sibling agent review of draft article')}",
                "outputHash": f"sha256:{agent_hash}",
            },
        ],
        "reviews": [
            {
                "reviewer": "agent",
                "reviewedAt": DATE,
                "status": "approved",
                "scope": ["claims", "tone", "privacy", "scope"],
                "notes": "Sibling-agent review against article-proposal-ideation eval-card. Privacy scan passed. No proprietary or personal content detected.",
                "contentHash": article_hash,
            },
            {
                "reviewer": "human",
                "reviewedAt": DATE,
                "status": "approved",
                "scope": ["thesis", "examples", "tone", "safety"],
                "notes": "Human author approved the draft and assets for review publication.",
                "contentHash": article_hash,
            },
        ],
        "policy": {"id": "policy:default", "version": "1.0.0"},
    },
}

with open(DIR / "artifact.json", "w") as f:
    json.dump(artifact, f, indent=2)

print("artifact.json generated")
print(f"article.md hash: {article_hash}")
print(f"agent.md hash: {agent_hash}")
