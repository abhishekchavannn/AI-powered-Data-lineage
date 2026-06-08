package org.example.copilot;

import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import dev.langchain4j.service.AiServices;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CopilotConfig {

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${copilot.model.name:gemini-2.5-flash}")
    private String modelName;

    @Value("${copilot.model.temperature:0.2}")
    private double temperature;

    @Bean
    public ChatModel copilotChatModel() {
        return GoogleAiGeminiChatModel.builder()
                .apiKey(apiKey)
                .modelName(modelName)
                .temperature(temperature)
                .build();
    }

    @Bean
    public LineageCopilotAssistant lineageCopilotAssistant(
            ChatModel copilotChatModel,
            LineageCopilotTools lineageCopilotTools) {
        return AiServices.builder(LineageCopilotAssistant.class)
                .chatModel(copilotChatModel)
                .tools(lineageCopilotTools)
                .chatMemoryProvider(memoryId -> MessageWindowChatMemory.withMaxMessages(20))
                .build();
    }
}
