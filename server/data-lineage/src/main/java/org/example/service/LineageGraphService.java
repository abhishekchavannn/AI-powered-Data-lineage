package org.example.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.dto.*;
import org.example.model.LineageRecord;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class LineageGraphService {

    private static final int MAX_PATHS = 20;
    private static final int MAX_PATH_DEPTH = 15;
    private static final int MAX_TOOL_RESULTS = 50;

    @Autowired
    private LineageService lineageService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String buildKey(String system, String dataset, String attribute) {
        return system + "|||" + dataset + "|||" + attribute;
    }

    public String[] parseKey(String key) {
        return key.split("\\|\\|\\|");
    }

    public String toReadableId(String key) {
        String[] parts = parseKey(key);
        return parts[0] + "." + parts[1] + "." + parts[2];
    }

    public Map<String, Object> getGraphStats() {
        Map<String, Object> graph = lineageService.getLineageGraph();
        List<?> nodes = (List<?>) graph.getOrDefault("nodes", List.of());
        List<?> links = (List<?>) graph.getOrDefault("links", List.of());
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("nodeCount", nodes.size());
        stats.put("linkCount", links.size());
        return stats;
    }

    public Optional<String> resolveNodeKey(String system, String dataset, String attribute) {
        Set<String> allKeys = getAllNodeKeys();
        if (allKeys.isEmpty()) return Optional.empty();

        String exact = buildKey(
                nullToEmpty(system), nullToEmpty(dataset), nullToEmpty(attribute));
        if (allKeys.contains(exact)) return Optional.of(exact);

        String query = String.join(" ",
                nullToEmpty(system), nullToEmpty(dataset), nullToEmpty(attribute)).trim().toLowerCase();
        if (query.isEmpty()) return Optional.empty();

        List<String> matches = allKeys.stream()
                .filter(key -> {
                    String readable = toReadableId(key).toLowerCase();
                    String[] parts = parseKey(key);
                    return readable.contains(query)
                            || parts[0].toLowerCase().contains(query)
                            || parts[1].toLowerCase().contains(query)
                            || parts[2].toLowerCase().contains(query);
                })
                .sorted()
                .collect(Collectors.toList());

        if (matches.isEmpty()) return Optional.empty();
        return Optional.of(matches.get(0));
    }

    public String findDownstreamJson(String system, String dataset, String attribute) {
        Optional<String> keyOpt = resolveNodeKey(system, dataset, attribute);
        if (keyOpt.isEmpty()) {
            return errorJson("Node not found: " + system + "." + dataset + "." + attribute);
        }

        List<LineageRecord> records = lineageService.getAllLineageRecords();
        Map<String, List<Edge>> adjacency = buildAdjacencyList(records);
        BfsResult bfs = bfsDownstream(keyOpt.get(), adjacency);

        List<Map<String, Object>> nodes = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : bfs.depthMap.entrySet()) {
            if (entry.getKey().equals(keyOpt.get())) continue;
            if (nodes.size() >= MAX_TOOL_RESULTS) break;

            Edge incoming = bfs.incomingEdge.get(entry.getKey());
            Map<String, Object> node = new LinkedHashMap<>();
            node.put("node", toReadableId(entry.getKey()));
            node.put("depth", entry.getValue());
            node.put("transformationType", incoming != null ? incoming.transformationType : "UNKNOWN");
            nodes.add(node);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("source", toReadableId(keyOpt.get()));
        result.put("direction", "downstream");
        result.put("count", nodes.size());
        result.put("nodes", nodes);
        return toJson(result);
    }

    public String findUpstreamJson(String system, String dataset, String attribute) {
        Optional<String> keyOpt = resolveNodeKey(system, dataset, attribute);
        if (keyOpt.isEmpty()) {
            return errorJson("Node not found: " + system + "." + dataset + "." + attribute);
        }

        List<LineageRecord> records = lineageService.getAllLineageRecords();
        Map<String, List<Edge>> reverseAdj = buildReverseAdjacencyList(records);
        BfsResult bfs = bfsUpstream(keyOpt.get(), reverseAdj);

        List<Map<String, Object>> nodes = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : bfs.depthMap.entrySet()) {
            if (entry.getKey().equals(keyOpt.get())) continue;
            if (nodes.size() >= MAX_TOOL_RESULTS) break;

            Edge incoming = bfs.incomingEdge.get(entry.getKey());
            Map<String, Object> node = new LinkedHashMap<>();
            node.put("node", toReadableId(entry.getKey()));
            node.put("depth", entry.getValue());
            node.put("transformationType", incoming != null ? incoming.transformationType : "UNKNOWN");
            nodes.add(node);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("target", toReadableId(keyOpt.get()));
        result.put("direction", "upstream");
        result.put("count", nodes.size());
        result.put("nodes", nodes);
        return toJson(result);
    }

    public String findAllPathsJson(String fromSystem, String fromDataset, String fromAttribute,
                                   String toSystem, String toDataset, String toAttribute) {
        Optional<String> fromKey = resolveNodeKey(fromSystem, fromDataset, fromAttribute);
        Optional<String> toKey = resolveNodeKey(toSystem, toDataset, toAttribute);

        if (fromKey.isEmpty()) {
            return errorJson("Source node not found: " + fromSystem + "." + fromDataset + "." + fromAttribute);
        }
        if (toKey.isEmpty()) {
            return errorJson("Target node not found: " + toSystem + "." + toDataset + "." + toAttribute);
        }

        List<LineageRecord> records = lineageService.getAllLineageRecords();
        Map<String, List<Edge>> adjacency = buildAdjacencyList(records);
        List<List<String>> paths = findAllPaths(fromKey.get(), toKey.get(), adjacency);

        List<List<String>> readablePaths = paths.stream()
                .map(path -> path.stream().map(this::toReadableId).collect(Collectors.toList()))
                .collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("from", toReadableId(fromKey.get()));
        result.put("to", toReadableId(toKey.get()));
        result.put("pathCount", readablePaths.size());
        result.put("paths", readablePaths);
        if (readablePaths.size() >= MAX_PATHS) {
            result.put("truncated", true);
        }
        return toJson(result);
    }

    public String getTransformationJson(String sourceSystem, String sourceDataset, String sourceAttribute,
                                        String targetSystem, String targetDataset, String targetAttribute) {
        Optional<String> sourceKey = resolveNodeKey(sourceSystem, sourceDataset, sourceAttribute);
        Optional<String> targetKey = resolveNodeKey(targetSystem, targetDataset, targetAttribute);

        if (sourceKey.isEmpty() || targetKey.isEmpty()) {
            return errorJson("Could not resolve source or target node");
        }

        List<LineageRecord> records = lineageService.getAllLineageRecords();
        List<Map<String, Object>> transforms = records.stream()
                .filter(r -> buildKey(r.getSourceSystem(), r.getSourceDataset(), r.getSourceAttribute()).equals(sourceKey.get())
                        && buildKey(r.getTargetSystem(), r.getTargetDataset(), r.getTargetAttribute()).equals(targetKey.get()))
                .map(r -> {
                    Map<String, Object> t = new LinkedHashMap<>();
                    t.put("source", toReadableId(sourceKey.get()));
                    t.put("target", toReadableId(targetKey.get()));
                    t.put("transformationType", r.getTransformationType());
                    t.put("transformationLogic", r.getTransformationLogic());
                    return t;
                })
                .collect(Collectors.toList());

        if (transforms.isEmpty()) {
            return errorJson("No direct transformation edge between " + toReadableId(sourceKey.get())
                    + " and " + toReadableId(targetKey.get()));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("transformations", transforms);
        return toJson(result);
    }

    public String getNodeMetadataJson(String system, String dataset, String attribute) {
        Optional<String> keyOpt = resolveNodeKey(system, dataset, attribute);
        if (keyOpt.isEmpty()) {
            return errorJson("Node not found: " + system + "." + dataset + "." + attribute);
        }

        String metadata = findMetadataForKey(keyOpt.get(), lineageService.getAllLineageRecords());
        String[] parts = parseKey(keyOpt.get());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("node", toReadableId(keyOpt.get()));
        result.put("system", parts[0]);
        result.put("dataset", parts[1]);
        result.put("attribute", parts[2]);
        result.put("metadata", metadata != null ? metadata : "");
        result.put("criticality", extractCriticality(metadata));
        return toJson(result);
    }

    public String calculateImpactScoreJson(String system, String dataset, String attribute) {
        Optional<String> keyOpt = resolveNodeKey(system, dataset, attribute);
        if (keyOpt.isEmpty()) {
            return errorJson("Node not found: " + system + "." + dataset + "." + attribute);
        }

        List<LineageRecord> records = lineageService.getAllLineageRecords();
        Map<String, List<Edge>> adjacency = buildAdjacencyList(records);
        BfsResult bfs = bfsDownstream(keyOpt.get(), adjacency);
        BlastRadius blastRadius = computeBlastRadius(bfs, keyOpt.get());
        List<CriticalItem> criticalItems = detectCriticalItems(bfs, adjacency, records);

        int highCount = (int) criticalItems.stream().filter(c -> "HIGH".equals(c.getCriticality())).count();
        int score = Math.min(100,
                blastRadius.getTotalAffectedNodes() * 5
                        + blastRadius.getAffectedSystems().size() * 10
                        + blastRadius.getMaxDepth() * 3
                        + highCount * 15);

        String riskLevel;
        if (score >= 70 || highCount > 0) riskLevel = "HIGH";
        else if (score >= 35) riskLevel = "MEDIUM";
        else riskLevel = "LOW";

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("node", toReadableId(keyOpt.get()));
        result.put("impactScore", score);
        result.put("riskLevel", riskLevel);
        result.put("blastRadius", blastRadius);
        result.put("criticalItemCount", criticalItems.size());
        result.put("topCriticalItems", criticalItems.stream().limit(5).collect(Collectors.toList()));
        return toJson(result);
    }

    public ImpactAnalysisData analyzeDownstream(String system, String dataset, String attribute) {
        List<LineageRecord> records = lineageService.getAllLineageRecords();
        String startNodeKey = buildKey(system, dataset, attribute);
        Map<String, List<Edge>> adjacency = buildAdjacencyList(records);
        BfsResult bfs = bfsDownstream(startNodeKey, adjacency);

        ImpactAnalysisData data = new ImpactAnalysisData();
        data.dependencies = buildDependencies(bfs, startNodeKey);
        data.blastRadius = computeBlastRadius(bfs, startNodeKey);
        data.criticalItems = detectCriticalItems(bfs, adjacency, records);
        return data;
    }

    public List<Map<String, Object>> getTopImpactScores(int limit) {
        Set<String> allKeys = getAllNodeKeys();
        List<Map<String, Object>> scores = new ArrayList<>();

        for (String key : allKeys) {
            String[] parts = parseKey(key);
            String json = calculateImpactScoreJson(parts[0], parts[1], parts[2]);
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> parsed = objectMapper.readValue(json, Map.class);
                if (!parsed.containsKey("error")) {
                    scores.add(parsed);
                }
            } catch (JsonProcessingException ignored) {
            }
        }

        scores.sort((a, b) -> Integer.compare(
                ((Number) b.getOrDefault("impactScore", 0)).intValue(),
                ((Number) a.getOrDefault("impactScore", 0)).intValue()));
        return scores.stream().limit(limit).collect(Collectors.toList());
    }

    // --- Graph internals (shared with impact analysis) ---

    public Map<String, List<Edge>> buildAdjacencyList(List<LineageRecord> records) {
        Map<String, List<Edge>> adj = new HashMap<>();
        for (LineageRecord r : records) {
            String sourceKey = buildKey(r.getSourceSystem(), r.getSourceDataset(), r.getSourceAttribute());
            String targetKey = buildKey(r.getTargetSystem(), r.getTargetDataset(), r.getTargetAttribute());
            adj.computeIfAbsent(sourceKey, k -> new ArrayList<>())
                    .add(new Edge(targetKey, r.getTransformationType(), r.getTransformationLogic()));
        }
        return adj;
    }

    public Map<String, List<Edge>> buildReverseAdjacencyList(List<LineageRecord> records) {
        Map<String, List<Edge>> adj = new HashMap<>();
        for (LineageRecord r : records) {
            String sourceKey = buildKey(r.getSourceSystem(), r.getSourceDataset(), r.getSourceAttribute());
            String targetKey = buildKey(r.getTargetSystem(), r.getTargetDataset(), r.getTargetAttribute());
            adj.computeIfAbsent(targetKey, k -> new ArrayList<>())
                    .add(new Edge(sourceKey, r.getTransformationType(), r.getTransformationLogic()));
        }
        return adj;
    }

    public BfsResult bfsDownstream(String startKey, Map<String, List<Edge>> adjacency) {
        return bfs(startKey, adjacency);
    }

    public BfsResult bfsUpstream(String startKey, Map<String, List<Edge>> reverseAdjacency) {
        return bfs(startKey, reverseAdjacency);
    }

    private BfsResult bfs(String startKey, Map<String, List<Edge>> adjacency) {
        Map<String, Integer> depthMap = new LinkedHashMap<>();
        Map<String, List<String>> pathMap = new HashMap<>();
        Map<String, Edge> incomingEdge = new HashMap<>();

        Queue<String> queue = new LinkedList<>();
        depthMap.put(startKey, 0);
        pathMap.put(startKey, List.of(startKey));
        queue.add(startKey);

        while (!queue.isEmpty()) {
            String current = queue.poll();
            int currentDepth = depthMap.get(current);
            List<Edge> neighbors = adjacency.getOrDefault(current, Collections.emptyList());

            for (Edge edge : neighbors) {
                if (!depthMap.containsKey(edge.target)) {
                    depthMap.put(edge.target, currentDepth + 1);
                    List<String> path = new ArrayList<>(pathMap.get(current));
                    path.add(edge.target);
                    pathMap.put(edge.target, path);
                    incomingEdge.put(edge.target, edge);
                    queue.add(edge.target);
                }
            }
        }

        BfsResult result = new BfsResult();
        result.depthMap = depthMap;
        result.pathMap = pathMap;
        result.incomingEdge = incomingEdge;
        return result;
    }

    private List<List<String>> findAllPaths(String fromKey, String toKey, Map<String, List<Edge>> adjacency) {
        List<List<String>> paths = new ArrayList<>();
        List<String> current = new ArrayList<>();
        current.add(fromKey);
        dfsPaths(fromKey, toKey, adjacency, current, new HashSet<>(Set.of(fromKey)), paths);
        return paths;
    }

    private void dfsPaths(String current, String target, Map<String, List<Edge>> adjacency,
                          List<String> path, Set<String> visited, List<List<String>> paths) {
        if (paths.size() >= MAX_PATHS) return;
        if (path.size() > MAX_PATH_DEPTH) return;

        if (current.equals(target)) {
            paths.add(new ArrayList<>(path));
            return;
        }

        for (Edge edge : adjacency.getOrDefault(current, Collections.emptyList())) {
            if (!visited.contains(edge.target)) {
                visited.add(edge.target);
                path.add(edge.target);
                dfsPaths(edge.target, target, adjacency, path, visited, paths);
                path.remove(path.size() - 1);
                visited.remove(edge.target);
            }
        }
    }

    public List<DownstreamDependency> buildDependencies(BfsResult bfs, String startKey) {
        List<DownstreamDependency> deps = new ArrayList<>();

        for (Map.Entry<String, Integer> entry : bfs.depthMap.entrySet()) {
            if (entry.getKey().equals(startKey)) continue;

            String[] parts = parseKey(entry.getKey());
            NodeInfo nodeInfo = NodeInfo.of(parts[0], parts[1], parts[2]);
            Edge incoming = bfs.incomingEdge.get(entry.getKey());

            List<String> rawPath = bfs.pathMap.get(entry.getKey());
            List<String> readablePath = rawPath.stream()
                    .map(this::toReadableId)
                    .collect(Collectors.toList());

            DownstreamDependency dep = new DownstreamDependency();
            dep.setNode(nodeInfo);
            dep.setDepth(entry.getValue());
            dep.setTransformationType(incoming != null ? incoming.transformationType : "UNKNOWN");
            dep.setTransformationLogic(incoming != null ? incoming.transformationLogic : "");
            dep.setPathFromSource(readablePath);
            deps.add(dep);
        }

        deps.sort(Comparator.comparingInt(DownstreamDependency::getDepth));
        return deps;
    }

    public BlastRadius computeBlastRadius(BfsResult bfs, String startKey) {
        Set<String> systems = new HashSet<>();
        Set<String> datasets = new HashSet<>();
        int maxDepth = 0;
        int direct = 0;
        int transitive = 0;

        for (Map.Entry<String, Integer> entry : bfs.depthMap.entrySet()) {
            if (entry.getKey().equals(startKey)) continue;

            String[] parts = parseKey(entry.getKey());
            systems.add(parts[0]);
            datasets.add(parts[0] + "." + parts[1]);
            maxDepth = Math.max(maxDepth, entry.getValue());

            if (entry.getValue() == 1) direct++;
            else transitive++;
        }

        BlastRadius br = new BlastRadius();
        br.setTotalAffectedNodes(bfs.depthMap.size() - 1);
        br.setAffectedSystems(new ArrayList<>(systems));
        br.setAffectedDatasets(new ArrayList<>(datasets));
        br.setMaxDepth(maxDepth);
        br.setDirectDependencies(direct);
        br.setTransitiveDependencies(transitive);
        return br;
    }

    public List<CriticalItem> detectCriticalItems(BfsResult bfs, Map<String, List<Edge>> adjacency,
                                                   List<LineageRecord> records) {
        List<CriticalItem> items = new ArrayList<>();
        Map<String, String> metadataMap = buildMetadataMap(records);

        for (Map.Entry<String, Integer> entry : bfs.depthMap.entrySet()) {
            String key = entry.getKey();
            String[] parts = parseKey(key);
            NodeInfo nodeInfo = NodeInfo.of(parts[0], parts[1], parts[2]);

            String metadata = metadataMap.getOrDefault(key, "");
            String csvCriticality = extractCriticality(metadata);
            if (csvCriticality != null) {
                items.add(new CriticalItem(nodeInfo, csvCriticality,
                        "Criticality defined in metadata: " + metadata));
                continue;
            }

            int fanOut = adjacency.getOrDefault(key, Collections.emptyList()).size();
            if (fanOut > 3) {
                items.add(new CriticalItem(nodeInfo, "HIGH",
                        "High fan-out node with " + fanOut + " downstream dependencies"));
                continue;
            }

            String systemLower = parts[0].toLowerCase();
            if (systemLower.contains("dashboard") || systemLower.contains("report")
                    || systemLower.contains("analytics") || systemLower.contains("bi")) {
                boolean isTerminal = adjacency.getOrDefault(key, Collections.emptyList()).isEmpty();
                if (isTerminal) {
                    items.add(new CriticalItem(nodeInfo, "HIGH",
                            "Terminal reporting/dashboard endpoint"));
                    continue;
                }
                items.add(new CriticalItem(nodeInfo, "MEDIUM", "Part of analytics/reporting pipeline"));
                continue;
            }

            Edge incoming = bfs.incomingEdge.get(key);
            String transformType = incoming != null ? incoming.transformationType : "";
            if ("AGGREGATION".equalsIgnoreCase(transformType) || "SUM".equalsIgnoreCase(transformType)
                    || "COUNT".equalsIgnoreCase(transformType) || "AGGREGATE".equalsIgnoreCase(transformType)) {
                items.add(new CriticalItem(nodeInfo, "MEDIUM",
                        "Aggregation endpoint — sensitive to upstream changes"));
            }
        }

        items.sort(Comparator.comparingInt(a -> criticalityPriority(a.getCriticality())));
        return items;
    }

    static String extractCriticality(String metadata) {
        if (metadata == null || metadata.isEmpty()) return null;
        String lower = metadata.toLowerCase();
        int idx = lower.indexOf("criticality:");
        if (idx < 0) return null;
        String rest = metadata.substring(idx + "criticality:".length()).trim();
        String token = rest.split("[,;\\s]")[0].toUpperCase();
        if (token.equals("HIGH") || token.equals("MEDIUM") || token.equals("LOW")) {
            return token;
        }
        return null;
    }

    private Set<String> getAllNodeKeys() {
        Set<String> keys = new HashSet<>();
        for (LineageRecord r : lineageService.getAllLineageRecords()) {
            keys.add(buildKey(r.getSourceSystem(), r.getSourceDataset(), r.getSourceAttribute()));
            keys.add(buildKey(r.getTargetSystem(), r.getTargetDataset(), r.getTargetAttribute()));
        }
        return keys;
    }

    private String findMetadataForKey(String key, List<LineageRecord> records) {
        Map<String, String> metadataMap = buildMetadataMap(records);
        return metadataMap.getOrDefault(key, "");
    }

    private Map<String, String> buildMetadataMap(List<LineageRecord> records) {
        Map<String, String> metadataMap = new HashMap<>();
        for (LineageRecord r : records) {
            if (r.getMetadata() != null && !r.getMetadata().isEmpty()) {
                String targetKey = buildKey(r.getTargetSystem(), r.getTargetDataset(), r.getTargetAttribute());
                metadataMap.put(targetKey, r.getMetadata());
                String sourceKey = buildKey(r.getSourceSystem(), r.getSourceDataset(), r.getSourceAttribute());
                metadataMap.putIfAbsent(sourceKey, r.getMetadata());
            }
        }
        return metadataMap;
    }

    private int criticalityPriority(String level) {
        return switch (level.toUpperCase()) {
            case "HIGH" -> 0;
            case "MEDIUM" -> 1;
            case "LOW" -> 2;
            default -> 3;
        };
    }

    private String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return errorJson("JSON serialization failed: " + e.getMessage());
        }
    }

    private String errorJson(String message) {
        return toJson(Map.of("error", message));
    }

    public static class Edge {
        public final String target;
        public final String transformationType;
        public final String transformationLogic;

        public Edge(String target, String transformationType, String transformationLogic) {
            this.target = target;
            this.transformationType = transformationType;
            this.transformationLogic = transformationLogic;
        }
    }

    public static class BfsResult {
        public Map<String, Integer> depthMap;
        public Map<String, List<String>> pathMap;
        public Map<String, Edge> incomingEdge;
    }

    public static class ImpactAnalysisData {
        public List<DownstreamDependency> dependencies;
        public BlastRadius blastRadius;
        public List<CriticalItem> criticalItems;
    }
}
