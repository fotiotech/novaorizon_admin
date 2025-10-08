// components/SitemapManagement.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  getSitemapSettings,
  updateSitemapSettings,
  generateSitemap,
  submitToSearchEngines,
  getSitemapLogs,
} from "@/app/actions/sitemap";
import {
  SitemapSettings,
  SitemapLog,
  SitemapGenerationResult,
  SearchEngineSubmissionResult,
  SettingsUpdateResult,
} from "@/constant/types/sitemap";

const SitemapManagement: React.FC = () => {
  const [settings, setSettings] = useState<SitemapSettings | null>(null);
  const [logs, setLogs] = useState<SitemapLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "";
    text: string;
  }>({ type: "", text: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    setLoading(true);
    try {
      const [settingsData, logsData] = await Promise.all([
        getSitemapSettings(),
        getSitemapLogs(5),
      ]);
      setSettings(settingsData);
      setLogs(logsData || []);
    } catch (error) {
      showMessage("error", "Failed to load data");
    }
    setLoading(false);
  };

  const showMessage = (type: "success" | "error", text: string): void => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const handleSettingsUpdate = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result: SettingsUpdateResult = await updateSitemapSettings(formData);

    if (result.success && result.settings) {
      setSettings(result.settings);
      showMessage("success", "Settings updated successfully");
    } else {
      showMessage("error", result.error || "Failed to update settings");
    }
    setLoading(false);
  };

  const handleGenerateSitemap = async (): Promise<void> => {
    setLoading(true);
    const result: SitemapGenerationResult = await generateSitemap();

    if (result.success) {
      await loadData(); // Reload to get updated settings
      showMessage(
        "success",
        `Sitemap generated with ${result.urlsCount} URLs in ${result.duration}ms`
      );
    } else {
      showMessage("error", result.error || "Failed to generate sitemap");
    }
    setLoading(false);
  };

  const handleSubmitToEngines = async (): Promise<void> => {
    setLoading(true);
    const result: SearchEngineSubmissionResult = await submitToSearchEngines();

    if (result.success) {
      showMessage("success", "Sitemap submitted to search engines");
      await loadData(); // Reload logs
    } else {
      showMessage(
        "error",
        result.error || "Failed to submit to search engines"
      );
    }
    setLoading(false);
  };

  const addExcludedUrl = (): void => {
    const newUrl = prompt(
      "Enter URL to exclude (e.g., /old-product or regex pattern):"
    );
    if (newUrl && settings) {
      const newExcludedUrls = [
        ...settings.excludedUrls,
        {
          url: newUrl,
          pattern: newUrl.includes("*") ? newUrl : "",
          reason: "Manual exclusion",
          excludedAt: new Date(),
        },
      ];
      setSettings({
        ...settings,
        excludedUrls: newExcludedUrls,
      });
    }
  };

  const removeExcludedUrl = (index: number): void => {
    if (settings) {
      const newExcludedUrls = settings.excludedUrls.filter(
        (_, i) => i !== index
      );
      setSettings({
        ...settings,
        excludedUrls: newExcludedUrls,
      });
    }
  };

  if (loading && !settings) {
    return <div className="p-6">Loading sitemap settings...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Sitemap Management</h1>

      {message.text && (
        <div
          className={`p-4 mb-4 rounded ${
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Sitemap Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold">{settings?.urlsCount || 0}</div>
            <div className="text-sm text-gray-600">Total URLs</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-lg font-semibold">
              {settings?.lastGenerated
                ? new Date(settings.lastGenerated).toLocaleDateString()
                : "Never"}
            </div>
            <div className="text-sm text-gray-600">Last Generated</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-lg font-semibold">
              {settings?.autoRegenerate ? "Enabled" : "Disabled"}
            </div>
            <div className="text-sm text-gray-600">Auto Regenerate</div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleGenerateSitemap}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Sitemap"}
          </button>
          <button
            onClick={handleSubmitToEngines}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Submit to Search Engines
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Sitemap Settings</h2>

          {settings && (
            <form onSubmit={handleSettingsUpdate}>
              <div className="space-y-4">
                {/* Auto Regenerate */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="autoRegenerate"
                      defaultChecked={settings.autoRegenerate}
                      className="mr-2"
                    />
                    Auto-regenerate sitemap when content changes
                  </label>
                </div>

                {/* Change Frequency */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Default Change Frequency
                  </label>
                  <select
                    title="Select Change Frequency"
                    name="changeFrequency"
                    defaultValue={settings.changeFrequency}
                    className="w-full p-2 border rounded"
                  >
                    <option value="always">Always</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="never">Never</option>
                  </select>
                </div>

                {/* Priority Settings */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    URL Priorities
                  </label>
                  <div className="space-y-2">
                    {Object.entries(settings.prioritySettings).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <span className="capitalize">{key}:</span>
                          <input
                            title={`Set priority for ${key} (0.0 to 1.0)`}
                            type="number"
                            name={`prioritySettings.${key}`}
                            defaultValue={value}
                            min="0"
                            max="1"
                            step="0.1"
                            className="w-20 p-1 border rounded"
                          />
                        </div>
                      )
                    )}
                  </div>
                  <input
                    type="hidden"
                    name="prioritySettings"
                    value={JSON.stringify(settings.prioritySettings)}
                  />
                </div>

                {/* Search Engine Ping */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Search Engine Submission
                  </label>
                  <div className="space-y-2">
                    {Object.entries(settings.searchEnginePing).map(
                      ([engine, enabled]) => (
                        <label key={engine} className="flex items-center">
                          <input
                            type="checkbox"
                            name={`searchEnginePing.${engine}`}
                            defaultChecked={enabled}
                            className="mr-2"
                          />
                          <span className="capitalize">{engine}</span>
                        </label>
                      )
                    )}
                  </div>
                  <input
                    type="hidden"
                    name="searchEnginePing"
                    value={JSON.stringify(settings.searchEnginePing)}
                  />
                </div>

                {/* Excluded URLs */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">
                      Excluded URLs
                    </label>
                    <button
                      type="button"
                      onClick={addExcludedUrl}
                      className="text-sm bg-gray-200 px-2 py-1 rounded"
                    >
                      Add URL
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {settings.excludedUrls.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm">
                          {item.url || item.pattern}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeExcludedUrl(index)}
                          className="text-red-600 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    type="hidden"
                    name="excludedUrls"
                    value={JSON.stringify(settings.excludedUrls)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Update Settings"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log._id}
                className="border-l-4 border-blue-500 pl-4 py-1"
              >
                <div className="flex justify-between">
                  <span className="font-medium capitalize">{log.action}</span>
                  <span className="text-sm text-gray-500">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleDateString()
                      : "Unknown date"}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{log.details}</p>
                {log.urlsCount && (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {log.urlsCount} URLs
                  </span>
                )}
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-gray-500 text-center py-4">No activity yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SitemapManagement;
