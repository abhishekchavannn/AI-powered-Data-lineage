package org.example.service;

import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import com.opencsv.exceptions.CsvValidationException;
import org.example.model.LineageRecord;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.annotation.PostConstruct;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class LineageService {

    // In-memory storage instead of repository
    private List<LineageRecord> lineageRecords;

    @PostConstruct
    public void init() {
        lineageRecords = new ArrayList<>();
    }

    public List<LineageRecord> getAllLineageRecords() {
        return new ArrayList<>(lineageRecords); // Return a copy to prevent external modification
    }

    public void importCsvFile(MultipartFile file) throws Exception {
        List<LineageRecord> records = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
             CSVReader csvReader = new CSVReaderBuilder(reader).withSkipLines(1).build()) {

            String[] line;
            while ((line = csvReader.readNext()) != null) {
                if (line.length < 8) continue; // Skip invalid rows

                LineageRecord record = new LineageRecord();
                record.setSourceSystem(line[0]);
                record.setSourceDataset(line[1]);
                record.setSourceAttribute(line[2]);
                record.setTransformationType(line[3]);
                record.setTransformationLogic(line[4]);
                record.setTargetSystem(line[5]);
                record.setTargetDataset(line[6]);
                record.setTargetAttribute(line[7]);
                record.setMetadata(line.length > 8 ? line[8] : "");

                records.add(record);
            }
        } catch (IOException | CsvValidationException e) {
            throw new Exception("Error parsing CSV file: " + e.getMessage(), e);
        }

        // Add to in-memory list instead of saving to DB
        lineageRecords.addAll(records);
    }

    public List<LineageRecord> getLineageBySystem(String system) {
        List<LineageRecord> sourceRecords = lineageRecords.stream()
                .filter(record -> record.getSourceSystem().equals(system))
                .collect(Collectors.toList());

        List<LineageRecord> targetRecords = lineageRecords.stream()
                .filter(record -> record.getTargetSystem().equals(system))
                .collect(Collectors.toList());

        // Combine and remove duplicates
        return sourceRecords.stream()
                .filter(record -> !targetRecords.contains(record))
                .collect(Collectors.collectingAndThen(
                        Collectors.toList(),
                        list -> {
                            list.addAll(targetRecords);
                            return list;
                        }
                ));
    }

    public Map<String, Object> getLineageGraph() {
        // Create nodes map for faster lookup and to avoid duplicates
        Map<String, Map<String, Object>> nodesMap = new HashMap<>();
        List<Map<String, Object>> links = new ArrayList<>();
        int nodeCounter = 0;

        for (LineageRecord record : lineageRecords) {
            // Create source node ID and object
            String sourceNodeId = createNodeId(record.getSourceSystem(), record.getSourceDataset(), record.getSourceAttribute());
            if (!nodesMap.containsKey(sourceNodeId)) {
                Map<String, Object> sourceNode = createNodeObject(
                        nodeCounter++,
                        record.getSourceSystem(),
                        record.getSourceDataset(),
                        record.getSourceAttribute()
                );
                nodesMap.put(sourceNodeId, sourceNode);
            }

            // Create target node ID and object
            String targetNodeId = createNodeId(record.getTargetSystem(), record.getTargetDataset(), record.getTargetAttribute());
            if (!nodesMap.containsKey(targetNodeId)) {
                Map<String, Object> targetNode = createNodeObject(
                        nodeCounter++,
                        record.getTargetSystem(),
                        record.getTargetDataset(),
                        record.getTargetAttribute()
                );
                nodesMap.put(targetNodeId, targetNode);
            }

            // Create link between nodes
            Map<String, Object> link = new HashMap<>();
            link.put("source", nodesMap.get(sourceNodeId).get("id"));
            link.put("target", nodesMap.get(targetNodeId).get("id"));
            link.put("transformationType", record.getTransformationType());
            link.put("transformationLogic", record.getTransformationLogic());
            link.put("sourceNodeId", sourceNodeId);
            link.put("targetNodeId", targetNodeId);
            links.add(link);
        }

        // Create the final graph object
        Map<String, Object> graph = new HashMap<>();
        graph.put("nodes", new ArrayList<>(nodesMap.values()));
        graph.put("links", links);

        return graph;
    }

    private String createNodeId(String system, String dataset, String attribute) {
        return String.format("%s|||%s|||%s", system, dataset, attribute);
    }

    private Map<String, Object> createNodeObject(int id, String system, String dataset, String attribute) {
        Map<String, Object> node = new HashMap<>();
        node.put("id", id);
        node.put("system", system);
        node.put("dataset", dataset);
        node.put("attribute", attribute);
        node.put("label", attribute);
        node.put("fullId", String.format("%s.%s.%s", system, dataset, attribute));
        return node;
    }

    // Additional methods for in-memory implementation
    public void addLineageRecord(LineageRecord record) {
        lineageRecords.add(record);
    }

    public void clearAllRecords() {
        lineageRecords.clear();
    }
}