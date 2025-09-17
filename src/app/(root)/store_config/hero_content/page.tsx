"use client";

import { findHeroContent } from "@/app/actions/content_management";
import { HeroSection } from "@/constant/types";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Edit, Add, Image as ImageIcon } from "@mui/icons-material";

const HeroContent = () => {
  const [heroContent, setHeroContent] = useState<HeroSection[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getHeroContent() {
      try {
        setLoading(true);
        const content = await findHeroContent();
        if (content) {
          setHeroContent(content);
        }
      } catch (err) {
        console.error("Failed to fetch hero content:", err);
        setError("Failed to load hero content. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    getHeroContent();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Hero Content</h2>
          <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex justify-between items-center p-4 border rounded-lg animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="h-9 w-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Hero Content</h2>
          <Link href={"/store_config/banner_sliders/add_hero_content"}>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
            >
              <Add /> Add Hero Content
            </button>
          </Link>
        </div>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Hero Content</h2>
        <Link href={"/store_config/hero_content/add_hero_content"}>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
          >
            <Add /> Add Hero Content
          </button>
        </Link>
      </div>

      {heroContent && heroContent.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {heroContent.map((hero) => (
            <div
              key={hero._id}
              className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-48 bg-gray-100 relative">
                {hero?.imageUrl ? (
                  <img
                    src={hero?.imageUrl as unknown as string}
                    alt={hero.title || "Hero banner"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="text-4xl" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1 truncate">
                  {hero.title || "Untitled"}
                </h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {hero.description || "No description"}
                </p>
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    {hero.cta_text && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        CTA: {hero.cta_text}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/store_config/hero_content/edit_hero_content?id=${hero._id}`}
                  >
                    <button
                      title="Edit hero content"
                      type="button"
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-1"
                    >
                      <Edit fontSize="small" /> Edit
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <ImageIcon className="mx-auto text-4xl text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-700">
            No hero content yet
          </h3>
          <p className="text-gray-500 mb-4">
            Get started by adding your first hero banner
          </p>
          <Link href={"/store_config/banner_sliders/add_hero_content"}>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Add Hero Content
            </button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default HeroContent;
