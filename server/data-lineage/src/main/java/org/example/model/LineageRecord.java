package org.example.model;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import lombok.Data;

/**
 * Represents a data lineage record mapping source to target datasets with transformations.
 */
@Entity
@Data
public class LineageRecord {
    /** Constants for schema names used in the lineage records. */
    public static final String SCHEMA_CORE_TRANSACTIONS = "CoreTransactions";
    public static final String SCHEMA_ANALYTICS_HUB = "AnalyticsHub";
    public static final String SCHEMA_ML_FEATURES = "MLFeatures";

    @Id
    @GeneratedValue
    private Long id;

    private String sourceSystem;

    /**
     * The schema of the source dataset.
     * Expected values: CoreTransactions, AnalyticsHub, MLFeatures.
     */
    private String sourceSchema;

    private String sourceDataset;
    private String sourceAttribute;
    private String transformationType;
    private String transformationLogic;

    private String targetSystem;

    /**
     * The schema of the target dataset.
     * Expected values: CoreTransactions, AnalyticsHub, MLFeatures.
     */
    private String targetSchema;

    private String targetDataset;
    private String targetAttribute;
    private String metadata;
}