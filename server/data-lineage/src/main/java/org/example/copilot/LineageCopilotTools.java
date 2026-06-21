package org.example.copilot;

import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import org.example.service.LineageGraphService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class LineageCopilotTools {

    @Autowired
    private LineageGraphService lineageGraphService;

    @Tool("Find all downstream nodes affected by the given attribute. Use when asked what breaks, blast radius, or downstream dependencies.")
    public String findDownstream(
            @P("Source system name (partial match ok)") String system,
            @P("Dataset name (partial match ok)") String dataset,
            @P("Attribute name (partial match ok)") String attribute) {
        return lineageGraphService.findDownstreamJson(system, dataset, attribute);
    }

    @Tool("Find all upstream nodes that feed into the given attribute. Use when asked about source systems or upstream dependencies.")
    public String findUpstream(
            @P("Target system name (partial match ok)") String system,
            @P("Dataset name (partial match ok)") String dataset,
            @P("Attribute name (partial match ok)") String attribute) {
        return lineageGraphService.findUpstreamJson(system, dataset, attribute);
    }

    @Tool("Find all lineage paths between a source node and a target node. Use for path queries across systems.")
    public String findAllPaths(
            @P("Source system name (partial match ok)") String fromSystem,
            @P("Source dataset name (partial match ok)") String fromDataset,
            @P("Source attribute name (partial match ok)") String fromAttribute,
            @P("Target system name (partial match ok)") String toSystem,
            @P("Target dataset name (partial match ok)") String toDataset,
            @P("Target attribute name (partial match ok)") String toAttribute) {
        return lineageGraphService.findAllPathsJson(
                fromSystem, fromDataset, fromAttribute,
                toSystem, toDataset, toAttribute);
    }

    @Tool("Get the transformation type and logic for a direct edge between two nodes.")
    public String getTransformation(
            @P("Source system name") String sourceSystem,
            @P("Source dataset name") String sourceDataset,
            @P("Source attribute name") String sourceAttribute,
            @P("Target system name") String targetSystem,
            @P("Target dataset name") String targetDataset,
            @P("Target attribute name") String targetAttribute) {
        return lineageGraphService.getTransformationJson(
                sourceSystem, sourceDataset, sourceAttribute,
                targetSystem, targetDataset, targetAttribute);
    }

    @Tool("Calculate impact score and blast radius if the given node is removed or changed.")
    public String calculateImpactScore(
            @P("System name (partial match ok)") String system,
            @P("Dataset name (partial match ok)") String dataset,
            @P("Attribute name (partial match ok)") String attribute) {
        return lineageGraphService.calculateImpactScoreJson(system, dataset, attribute);
    }

    @Tool("Get metadata and criticality for a lineage node.")
    public String getNodeMetadata(
            @P("System name (partial match ok)") String system,
            @P("Dataset name (partial match ok)") String dataset,
            @P("Attribute name (partial match ok)") String attribute) {
        return lineageGraphService.getNodeMetadataJson(system, dataset, attribute);
    }
}
