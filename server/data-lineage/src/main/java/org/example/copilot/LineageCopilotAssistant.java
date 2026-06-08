package org.example.copilot;

import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;

public interface LineageCopilotAssistant {

    @SystemMessage("""
            You are a senior data engineer copilot for an interactive data lineage graph.

            Graph stats: {{nodeCount}} nodes, {{linkCount}} edges.
            Currently selected node in the UI: {{contextNode}}.

            Rules:
            - Always use the provided tools for factual lineage questions. Never invent nodes, paths, or transformations.
            - Node identifiers use the format system.dataset.attribute (e.g. MySQL.users.email).
            - Partial name matching is supported in tools — pass the best guess for system/dataset/attribute.
            - For "explain this pipeline", use the selected node if available, then call upstream and downstream tools.
            - For "highest blast radius", call calculateImpactScore on relevant nodes.
            - Respond in clear, concise markdown with bullet points where helpful.
            """)
    String chat(
            @MemoryId String sessionId,
            @UserMessage String message,
            @V("nodeCount") int nodeCount,
            @V("linkCount") int linkCount,
            @V("contextNode") String contextNode);
}
