package org.example.service;

import org.example.dto.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ImpactAnalysisService {

    @Autowired
    private LineageGraphService lineageGraphService;

    @Autowired
    private GeminiService geminiService;

    public ImpactAnalysisResponse analyze(ImpactAnalysisRequest request) {
        NodeInfo selectedNode = NodeInfo.of(
                request.getSystem(), request.getDataset(), request.getAttribute());

        LineageGraphService.ImpactAnalysisData data = lineageGraphService.analyzeDownstream(
                request.getSystem(), request.getDataset(), request.getAttribute());

        String aiSummary;
        try {
            aiSummary = geminiService.generateChangeSummary(
                    selectedNode, data.dependencies, data.blastRadius, data.criticalItems);
        } catch (Exception e) {
            aiSummary = "AI analysis unavailable: " + e.getMessage();
        }

        ImpactAnalysisResponse response = new ImpactAnalysisResponse();
        response.setSelectedNode(selectedNode);
        response.setDownstreamDependencies(data.dependencies);
        response.setBlastRadius(data.blastRadius);
        response.setCriticalItems(data.criticalItems);
        response.setAiChangeSummary(aiSummary);
        return response;
    }
}
