package org.example.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BlastRadius {
    private int totalAffectedNodes;
    private List<String> affectedSystems;
    private List<String> affectedDatasets;
    private int maxDepth;
    private int directDependencies;
    private int transitiveDependencies;
}
