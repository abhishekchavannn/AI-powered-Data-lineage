package org.example.dto;

import lombok.Data;

@Data
public class CopilotChatResponse {
    private String answer;
    private String sessionId;

    public CopilotChatResponse(String answer, String sessionId) {
        this.answer = answer;
        this.sessionId = sessionId;
    }
}
