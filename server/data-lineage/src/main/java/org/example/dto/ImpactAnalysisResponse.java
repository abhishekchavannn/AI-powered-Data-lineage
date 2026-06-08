package org.example.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ImpactAnalysisResponse {
    private NodeInfo selectedNode;
    private List<DownstreamDependency> downstreamDependencies;
    private BlastRadius blastRadius;
    private List<CriticalItem> criticalItems;
    private String aiChangeSummary;
}
