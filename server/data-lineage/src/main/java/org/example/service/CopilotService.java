package org.example.service;

import org.example.copilot.LineageCopilotAssistant;
import org.example.dto.CopilotChatRequest;
import org.example.dto.CopilotChatResponse;
import org.example.dto.NodeInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
public class CopilotService {

    @Autowired
    private LineageCopilotAssistant lineageCopilotAssistant;

    @Autowired
    private LineageGraphService lineageGraphService;

    public CopilotChatResponse chat(CopilotChatRequest request) {
        String sessionId = request.getSessionId();
        if (sessionId == null || sessionId.isBlank()) {
            sessionId = UUID.randomUUID().toString();
        }

        Map<String, Object> stats = lineageGraphService.getGraphStats();
        int nodeCount = ((Number) stats.getOrDefault("nodeCount", 0)).intValue();
        int linkCount = ((Number) stats.getOrDefault("linkCount", 0)).intValue();
        String contextNode = formatContextNode(request.getContextNode());

        String answer;
        try {
            answer = lineageCopilotAssistant.chat(
                    sessionId,
                    request.getMessage(),
                    nodeCount,
                    linkCount,
                    contextNode);
        } catch (Exception e) {
            answer = "Copilot is temporarily unavailable: " + e.getMessage()
                    + "\n\nPlease check that your Gemini API key is configured and try again.";
        }

        return new CopilotChatResponse(answer, sessionId);
    }

    private String formatContextNode(NodeInfo node) {
        if (node == null) return "none";
        if (node.getFullId() != null && !node.getFullId().isBlank()) {
            return node.getFullId();
        }
        return NodeInfo.of(node.getSystem(), node.getDataset(), node.getAttribute()).getFullId();
    }
}
