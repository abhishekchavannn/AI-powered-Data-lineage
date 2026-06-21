import { useState, useEffect } from "react";
import axios from "axios";

const UseLineageData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImpactAnalysis, setShowImpactAnalysis] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          "http://localhost:8083/api/lineage/graph"
        );
        setData(response.data);
      } catch (err) {
        setError("Error fetching data: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!showImpactAnalysis) {
      setSelectedNode(null);
    }
  }, [showImpactAnalysis]);

  return {
    data,
    loading,
    error,
    showImpactAnalysis,
    setShowImpactAnalysis,
    selectedNode,
    setSelectedNode,
  };
};

export default UseLineageData;
