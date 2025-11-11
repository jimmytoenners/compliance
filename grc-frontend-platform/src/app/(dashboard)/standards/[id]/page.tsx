"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  Calendar,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  BookOpen,
} from "lucide-react";

interface Standard {
  id: number;
  code: string;
  name: string;
  version: string;
  organization: string;
  published_date: string;
  description: string;
  website_url: string;
  total_controls: number;
}

interface Control {
  id: number;
  control_id: string;
  title: string;
  description: string;
  implementation_guidance: string;
  category: string;
  maturity_level: string;
  priority: string;
  external_references: string;
}

interface Article {
  id: number;
  control_library_id: number;
  standard_id: number;
  article_number: string;
  section_name: string;
  full_text: string;
  guidance: string;
  external_references: string;
}

export default function StandardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const standardId = params?.id as string;

  const [standard, setStandard] = useState<Standard | null>(null);
  const [controls, setControls] = useState<Control[]>([]);
  const [expandedControls, setExpandedControls] = useState<Set<number>>(new Set());
  const [articles, setArticles] = useState<Map<number, Article>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingArticles, setLoadingArticles] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (standardId) {
      fetchStandardData();
    }
  }, [standardId]);

  const fetchStandardData = async () => {
    try {
      const token = localStorage.getItem("token");

      // Fetch standard metadata
      const standardResponse = await fetch(
        `http://localhost:8080/api/v1/standards/${standardId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!standardResponse.ok) {
        throw new Error("Failed to fetch standard");
      }

      const standardData = await standardResponse.json();
      setStandard(standardData.standard);

      // Fetch controls
      const controlsResponse = await fetch(
        `http://localhost:8080/api/v1/standards/${standardId}/controls`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!controlsResponse.ok) {
        throw new Error("Failed to fetch controls");
      }

      const controlsData = await controlsResponse.json();
      setControls(controlsData.controls || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchArticle = async (controlId: number) => {
    if (articles.has(controlId)) {
      return; // Already fetched
    }

    setLoadingArticles((prev) => new Set(prev).add(controlId));

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8080/api/v1/controls/${controlId}/article`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.article) {
          setArticles((prev) => new Map(prev).set(controlId, data.article));
        }
      }
    } catch (err) {
      console.error("Failed to fetch article:", err);
    } finally {
      setLoadingArticles((prev) => {
        const next = new Set(prev);
        next.delete(controlId);
        return next;
      });
    }
  };

  const toggleControl = async (controlId: number) => {
    const isExpanded = expandedControls.has(controlId);

    if (isExpanded) {
      setExpandedControls((prev) => {
        const next = new Set(prev);
        next.delete(controlId);
        return next;
      });
    } else {
      setExpandedControls((prev) => new Set(prev).add(controlId));
      await fetchArticle(controlId);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const groupControlsByCategory = () => {
    const grouped = controls.reduce((acc, control) => {
      const category = control.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(control);
      return acc;
    }, {} as Record<string, Control[]>);

    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading standard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !standard) {
    return (
      <div className="p-8">
        <button
          onClick={() => router.push("/standards")}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Standards
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-red-800 font-semibold mb-1">Error Loading Standard</h3>
              <p className="text-red-600">{error || "Standard not found"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const groupedControls = groupControlsByCategory();

  return (
    <div className="p-8">
      {/* Header */}
      <button
        onClick={() => router.push("/standards")}
        className="flex items-center text-blue-600 hover:text-blue-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Standards
      </button>

      {/* Standard Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <Shield className="h-6 w-6 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                {standard.code} v{standard.version}
              </h1>
            </div>
            <h2 className="text-lg font-medium text-gray-700 mb-2">{standard.name}</h2>
            <p className="text-sm text-gray-600 mb-4">{standard.organization}</p>
            <p className="text-gray-700">{standard.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-6">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              Published: {formatDate(standard.published_date)}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <FileText className="h-4 w-4 mr-2" />
              {standard.total_controls} Controls
            </div>
          </div>
          {standard.website_url && (
            <a
              href={standard.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-sm text-blue-600 hover:text-blue-700"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Official Website
            </a>
          )}
        </div>
      </div>

      {/* Controls List */}
      <div className="space-y-8">
        {groupedControls.map(([category, categoryControls]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
              {category}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({categoryControls.length} controls)
              </span>
            </h3>

            <div className="space-y-3">
              {categoryControls.map((control) => {
                const isExpanded = expandedControls.has(control.id);
                const article = articles.get(control.id);
                const isLoadingArticle = loadingArticles.has(control.id);

                return (
                  <div
                    key={control.id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                  >
                    {/* Control Header */}
                    <button
                      onClick={() => toggleControl(control.id)}
                      className="w-full px-6 py-4 flex items-start justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 text-left">
                        <div className="flex items-center mb-2">
                          <span className="font-mono text-sm font-semibold text-blue-600 mr-3">
                            {control.control_id}
                          </span>
                          {control.priority && (
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                control.priority === "High" || control.priority === "IG1"
                                  ? "bg-red-100 text-red-700"
                                  : control.priority === "Medium" || control.priority === "IG2"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {control.priority}
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-medium text-gray-900 mb-1">
                          {control.title}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {control.description}
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        {/* Control Details */}
                        <div className="mb-4">
                          <h5 className="text-sm font-semibold text-gray-900 mb-2">
                            Description
                          </h5>
                          <p className="text-sm text-gray-700">{control.description}</p>
                        </div>

                        {control.implementation_guidance && (
                          <div className="mb-4">
                            <h5 className="text-sm font-semibold text-gray-900 mb-2">
                              Implementation Guidance
                            </h5>
                            <p className="text-sm text-gray-700">
                              {control.implementation_guidance}
                            </p>
                          </div>
                        )}

                        {/* Article Text */}
                        {isLoadingArticle ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                            <span className="text-sm text-gray-600">Loading article text...</span>
                          </div>
                        ) : article ? (
                          <div className="bg-white border border-blue-200 rounded-lg p-4 mb-4">
                            <h5 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              Article {article.article_number}: {article.section_name}
                            </h5>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">
                              {article.full_text}
                            </div>
                            {article.guidance && (
                              <div className="mt-3 pt-3 border-t border-blue-100">
                                <h6 className="text-xs font-semibold text-gray-700 mb-1">
                                  Guidance
                                </h6>
                                <p className="text-xs text-gray-600">{article.guidance}</p>
                              </div>
                            )}
                          </div>
                        ) : null}

                        {/* Metadata */}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {control.maturity_level && (
                            <span>Maturity: {control.maturity_level}</span>
                          )}
                          {control.category && <span>Category: {control.category}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
