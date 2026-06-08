package org.example.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class NodeInfo {
    private String system;
    private String dataset;
    private String attribute;
    private String fullId;

    public static NodeInfo of(String system, String dataset, String attribute) {
        NodeInfo info = new NodeInfo();
        info.system = system;
        info.dataset = dataset;
        info.attribute = attribute;
        info.fullId = String.format("%s.%s.%s", system, dataset, attribute);
        return info;
    }
}
