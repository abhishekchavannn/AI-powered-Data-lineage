package org.example.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.dto.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
public class GeminiService {

    private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    /** Stay comfortably under the free-tier 15 RPM limit: ~4.5s between calls. */
    private static final long MIN_INTERVAL_MS = 4500;

    /** Cache results for 10 minutes per node — same node won't re-call the API. */
    private static final long CACHE_TTL_MS = 10 * 60 * 1000;

    /** Max dependencies/criticals sent in prompt to keep tokens low. */
    private static final int MAX_DEPS_IN_PROMPT = 12;
    private static final int MAX_CRITICALS_IN_PROMPT = 5;

    @Value("${gemini.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** node cacheKey -> {summary, expiresAt} */
    private final ConcurrentHashMap<String, CacheEntry> cache = new ConcurrentHashMap<>();

    /** Epoch ms of the last successful Gemini call (used for rate limiting). */
    private final AtomicLong lastCallTime = new AtomicLong(0);

    private record CacheEntry(String summary, long expiresAt) {}

    public String generateChangeSummary(NodeInfo selectedNode,
                                        List<DownstreamDependency> dependencies,
                                        BlastRadius blastRadius,
                                        List<CriticalItem> criticalItems) {
        if (apiKey == null || apiKey.isBlank()) {
            return buildFallbackSummary(selectedNode, dependencies, blastRadius, criticalItems);
        }

        String cacheKey = selectedNode.getFullId();

        CacheEntry cached = cache.get(cacheKey);
        if (cached != null && System.currentTimeMillis() < cached.expiresAt()) {
            return cached.summary();
        }

        enforceRateLimit();

        String prompt = buildPrompt(selectedNode, dependencies, blastRadius, criticalItems);

        try {
            String url = GEMINI_URL + "?key=" + apiKey;

            Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                    Map.of("parts", List.of(
                        Map.of("text", prompt)
                    ))
                ),
                "generationConfig", Map.of(
                    "temperature", 0.3,
                    "maxOutputTokens", 512
                )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            lastCallTime.set(System.currentTimeMillis());
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                String summary = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
                cache.put(cacheKey, new CacheEntry(summary, System.currentTimeMillis() + CACHE_TTL_MS));
                return summary;
            }

            return buildFallbackSummary(selectedNode, dependencies, blastRadius, criticalItems);

        } catch (HttpClientErrorException.TooManyRequests e) {
            String fallback = buildFallbackSummary(selectedNode, dependencies, blastRadius, criticalItems);
            fallback += "\n\n---\n*AI quota exceeded (429). Showing rule-based analysis. Retry in a moment.*";
            cache.put(cacheKey, new CacheEntry(fallback, System.currentTimeMillis() + 60_000));
            return fallback;

        } catch (Exception e) {
            return buildFallbackSummary(selectedNode, dependencies, blastRadius, criticalItems)
                    + "\n\n---\n*Note: AI enrichment failed (" + e.getMessage() + "). Showing rule-based analysis.*";
        }
    }

    /**
     * Blocks the calling thread just long enough to stay under 15 RPM.
     * Maximum wait is MIN_INTERVAL_MS; in practice usually 0ms if requests are spaced out.
     */
    private void enforceRateLimit() {
        long last = lastCallTime.get();
        if (last == 0) return;
        long elapsed = System.currentTimeMillis() - last;
        if (elapsed < MIN_INTERVAL_MS) {
            try {
                Thread.sleep(MIN_INTERVAL_MS - elapsed);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private String buildPrompt(NodeInfo selectedNode,
                               List<DownstreamDependency> dependencies,
                               BlastRadius blastRadius,
                               List<CriticalItem> criticalItems) {
        List<DownstreamDependency> cappedDeps = dependencies.stream()
                .limit(MAX_DEPS_IN_PROMPT)
                .collect(Collectors.toList());
        List<CriticalItem> cappedCriticals = criticalItems.stream()
                .limit(MAX_CRITICALS_IN_PROMPT)
                .collect(Collectors.toList());

        StringBuilder sb = new StringBuilder();
        sb.append("You are a senior data engineer. Analyze this data lineage impact and respond in clean markdown.\n\n");
        sb.append("**Node:** ").append(selectedNode.getFullId()).append("\n");
        sb.append("**Blast radius:** ")
          .append(blastRadius.getTotalAffectedNodes()).append(" nodes, ")
          .append(blastRadius.getAffectedSystems().size()).append(" systems (")
          .append(String.join(", ", blastRadius.getAffectedSystems())).append("), ")
          .append("max depth ").append(blastRadius.getMaxDepth()).append(", ")
          .append(blastRadius.getDirectDependencies()).append(" direct / ")
          .append(blastRadius.getTransitiveDependencies()).append(" transitive\n\n");

        sb.append("**Downstream dependencies (top ").append(cappedDeps.size()).append("):**\n");
        for (DownstreamDependency dep : cappedDeps) {
            sb.append("- [D").append(dep.getDepth()).append("] ")
              .append(dep.getNode().getFullId())
              .append(" via ").append(dep.getTransformationType()).append("\n");
        }
        if (dependencies.size() > MAX_DEPS_IN_PROMPT) {
            sb.append("- ...and ").append(dependencies.size() - MAX_DEPS_IN_PROMPT).append(" more\n");
        }
        sb.append("\n");

        if (!cappedCriticals.isEmpty()) {
            sb.append("**Critical items:**\n");
            for (CriticalItem item : cappedCriticals) {
                sb.append("- [").append(item.getCriticality()).append("] ")
                  .append(item.getNode().getFullId()).append(": ").append(item.getReason()).append("\n");
            }
            sb.append("\n");
        }

        sb.append("Provide exactly these 4 sections (be concise, 2-3 sentences each):\n");
        sb.append("## Change Impact Summary\n## Risk Assessment\n## Recommended Actions\n## Affected Stakeholders");

        return sb.toString();
    }

    private String buildFallbackSummary(NodeInfo selectedNode,
                                        List<DownstreamDependency> dependencies,
                                        BlastRadius blastRadius,
                                        List<CriticalItem> criticalItems) {
        StringBuilder sb = new StringBuilder();

        sb.append("## Change Impact Summary\n\n");
        sb.append("Modifying **").append(selectedNode.getFullId()).append("** will affect **")
          .append(blastRadius.getTotalAffectedNodes()).append(" downstream node(s)** across **")
          .append(blastRadius.getAffectedSystems().size()).append(" system(s)**.\n\n");

        if (blastRadius.getDirectDependencies() > 0) {
            sb.append("**Direct dependencies (").append(blastRadius.getDirectDependencies()).append("):** ");
            String directNodes = dependencies.stream()
                    .filter(d -> d.getDepth() == 1)
                    .map(d -> d.getNode().getFullId())
                    .collect(Collectors.joining(", "));
            sb.append(directNodes).append("\n\n");
        }

        if (blastRadius.getTransitiveDependencies() > 0) {
            sb.append("**Transitive dependencies (").append(blastRadius.getTransitiveDependencies())
              .append(")** propagate up to **").append(blastRadius.getMaxDepth())
              .append(" levels** deep.\n\n");
        }

        sb.append("## Risk Assessment\n\n");
        String risk;
        if (criticalItems.stream().anyMatch(c -> "HIGH".equals(c.getCriticality()))) {
            risk = "HIGH";
        } else if (blastRadius.getTotalAffectedNodes() > 5 || blastRadius.getAffectedSystems().size() > 2) {
            risk = "HIGH";
        } else if (blastRadius.getTotalAffectedNodes() > 2) {
            risk = "MEDIUM";
        } else {
            risk = "LOW";
        }
        sb.append("**").append(risk).append("** — ");
        if ("HIGH".equals(risk)) {
            sb.append("This change has a wide blast radius affecting multiple systems and critical endpoints.\n\n");
        } else if ("MEDIUM".equals(risk)) {
            sb.append("This change affects several downstream nodes; careful coordination recommended.\n\n");
        } else {
            sb.append("Limited downstream impact. Standard change procedures should suffice.\n\n");
        }

        sb.append("## Recommended Actions\n\n");
        sb.append("1. Review all downstream transformations before making changes\n");
        sb.append("2. Notify owners of affected systems: ")
          .append(String.join(", ", blastRadius.getAffectedSystems())).append("\n");
        sb.append("3. Run integration tests on affected pipelines\n");
        if (!criticalItems.isEmpty()) {
            sb.append("4. Pay special attention to critical items flagged above\n");
        }

        return sb.toString();
    }
}
