"use client";

import Link from "next/link";
import React from "react";

const ContentMerchandising = () => {
  const menuExamples = [
    "Navigation menus",
    "Header menus", 
    "Footer menus",
    "Category menus",
    "Promotional menus"
  ];

  const collectionExamples = [
    "Seasonal collections",
    "Product category groups",
    "Featured products",
    "Sale items",
    "New arrivals"
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Content & Merchandising</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Menus Card */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Menus</h2>
          <p className="text-gray-600 mb-4">
            Create and manage navigation menus to organize your store's content and guide customers.
          </p>
          
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-2">Examples:</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              {menuExamples.map((example, index) => (
                <li key={index}>{example}</li>
              ))}
            </ul>
          </div>
          
          <Link 
            href="/content_merchandising/menus"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Manage Menus
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Collections Card */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Collections</h2>
          <p className="text-gray-600 mb-4">
            Organize products into collections with custom rules to showcase related items together.
          </p>
          
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-2">Examples:</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              {collectionExamples.map((example, index) => (
                <li key={index}>{example}</li>
              ))}
            </ul>
          </div>
          
          <Link 
            href="/content_merchandising/collection"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Manage Collections
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Additional Features Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Merchandising Features</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Dynamic Product Grouping</h3>
            <p className="text-gray-600 text-sm">
              Automatically group products based on attributes, categories, or custom rules.
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Visual Merchandising</h3>
            <p className="text-gray-600 text-sm">
              Showcase products with custom images, banners, and promotional content.
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Seasonal Campaigns</h3>
            <p className="text-gray-600 text-sm">
              Create time-limited collections and menus for holidays and special events.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentMerchandising;