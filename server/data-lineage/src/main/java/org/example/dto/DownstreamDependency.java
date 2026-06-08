package org.example.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DownstreamDependency {
    private NodeInfo node;
    private int depth;
    private String transformationType;
    private String transformationLogic;
    private List<String> pathFromSource;
}
