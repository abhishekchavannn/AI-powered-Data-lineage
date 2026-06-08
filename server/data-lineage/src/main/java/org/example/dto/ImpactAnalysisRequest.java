package org.example.dto;

import lombok.Data;

@Data
public class ImpactAnalysisRequest {
    private String system;
    private String dataset;
    private String attribute;
}
