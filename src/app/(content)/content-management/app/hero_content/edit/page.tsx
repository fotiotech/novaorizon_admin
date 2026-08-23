"use client";

import { useSearchParams } from "next/navigation";
import { findHeroContentById } from "@/app/actions/content_management";
import HeroForm from "../_component/HeroForm";
import Spinner from "@/components/Spinner";
import { useEffect, useState } from "react";

const EditHeroPage = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id")?.toLowerCase();

  const [heroData, setHeroData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHeroData = async () => {
      if (!id) {
        setError("No ID provided in URL");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await findHeroContentById(id);
        if (data) {
          setHeroData(data);
        } else {
          setError("Hero content not found");
        }
      } catch (err) {
        console.error("Error fetching hero content:", err);
        setError("Failed to load hero content");
      } finally {
        setLoading(false);
      }
    };

    fetchHeroData();
  }, [id]);

  const handleSuccess = () => {
    // You can redirect or show a success message
    alert("Hero content updated successfully!");
    // Optionally redirect to another page
    // window.location.href = "/admin/hero-content";
  };

  const handleCancel = () => {
    // Navigate back or to a different page
    window.history.back();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
        <span className="ml-2">Loading hero content...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h2 className="font-bold text-lg mb-2">Error</h2>
          <p>{error}</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!heroData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <h2 className="font-bold text-lg mb-2">Not Found</h2>
          <p>No hero content found with the provided ID.</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <HeroForm
        mode="update"
        initialData={heroData}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default EditHeroPage;
