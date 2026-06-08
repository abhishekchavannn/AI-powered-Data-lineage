package org.example.controller;

import org.example.dto.CopilotChatRequest;
import org.example.dto.CopilotChatResponse;
import org.example.service.CopilotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/lineage/copilot")
@CrossOrigin(
        origins = "http://localhost:5173",
        allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS}
)
public class CopilotController {

    @Autowired
    private CopilotService copilotService;

    @PostMapping("/chat")
    public ResponseEntity<CopilotChatResponse> chat(@RequestBody CopilotChatRequest request) {
        if (request.getMessage() == null || request.getMessage().isBlank()) {
            return ResponseEntity.badRequest().body(
                    new CopilotChatResponse("Please enter a message.", request.getSessionId()));
        }
        return ResponseEntity.ok(copilotService.chat(request));
    }
}
