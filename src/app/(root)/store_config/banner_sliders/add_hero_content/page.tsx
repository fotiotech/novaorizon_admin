"use client";

import { createHeroContent } from "@/app/actions/content_management";
import FilesUploader from "@/components/FilesUploader";
import Spinner from "@/components/Spinner";
import { useFileUploader } from "@/hooks/useFileUploader";
import React, { useState } from "react";

const AddHeroContent = () => {
  const { files, loading, addFiles, removeFile } = useFileUploader();

  const file = files?.length! > 1 ? files : files?.[0];

  const toCreateHeroContent = createHeroContent.bind(null, file as any[]);

  return (
    <>
      <div>
        <h2>Add Hero Content</h2>
      </div>
      <div>
        <FilesUploader
          files={files}
          loading={loading}
          addFiles={addFiles}
          removeFile={removeFile}
        />
      </div>
      <form action={toCreateHeroContent}>
        <div>
          <label htmlFor="title">Title:</label>
          <input
            id="title"
            type="text"
            name="title"
            className="bg-transparent"
          />
        </div>
        <div>
          <label htmlFor="description">Description:</label>
          <input
            id="description"
            type="text"
            name="description"
            className="bg-transparent"
          />
        </div>

        <div>
          <label htmlFor="cta_text">CTA Text:</label>
          <input
            id="cta_text"
            type="text"
            name="cta_text"
            className="bg-transparent"
          />
        </div>
        <div>
          <label htmlFor="cta_link">CTA Link:</label>
          <input
            id="cta_link"
            type="text"
            name="cta_link"
            className="bg-transparent"
          />
        </div>
        <button
          type="submit"
          className="border px-3 py-1 bg-thiR rounded-lg font-semibold"
        >
          Submit
        </button>
      </form>
    </>
  );
};

export default AddHeroContent;
