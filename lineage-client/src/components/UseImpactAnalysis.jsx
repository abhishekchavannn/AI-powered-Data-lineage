import { useState, useCallback, useRef } from "react";
import axios from "axios";

const CACHE_TTL_MS = 10 * 60 * 1000;

/** Module-level cache so it persists across re-renders but resets on page reload. */
const resultCache = new Map();

const UseImpactAnalysis = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const inflightKey = useRef(null);

  const analyzeNode = useCallback(async (system, dataset, attribute) => {
    const cacheKey = `${system}|||${dataset}|||${attribute}`;

    const cached = resultCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      setResult(cached.data);
      setError(null);
      return;
    }

    if (inflightKey.current === cacheKey) return;
    inflightKey.current = cacheKey;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post(
        "http://localhost:8083/api/lineage/impact-analysis",
        { system, dataset, attribute }
      );
      resultCache.set(cacheKey, {
        data: response.data,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      setResult(response.data);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to run impact analysis";
      const isQuotaError = /quota exceeded|rate limit|429/i.test(msg);
      if (!isQuotaError) {
        setError(msg);
      }
    } finally {
      setLoading(false);
      inflightKey.current = null;
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    inflightKey.current = null;
  }, []);

  return { analyzeNode, result, loading, error, clearResult };
};

export default UseImpactAnalysis;
