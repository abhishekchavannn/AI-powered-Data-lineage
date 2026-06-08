package org.example.dto;

import lombok.Data;

@Data
public class CopilotChatRequest {
    private String message;
    private String sessionId;
    private NodeInfo contextNode;
}
