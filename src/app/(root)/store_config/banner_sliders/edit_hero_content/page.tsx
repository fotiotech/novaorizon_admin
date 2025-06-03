"use client";

import {
  findHeroContentById,
  updateHeroContent,
} from "@/app/actions/content_management";
import FilesUploader from "@/components/FilesUploader";
import Spinner from "@/components/Spinner";
import { HeroSection } from "@/constant/types";
import { useFileUploader } from "@/hooks/useFileUploader";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

const EditHeroContent = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id")?.toLowerCase();
  const { files, loading, addFiles, removeFile } = useFileUploader();

  const imageFile = files?.length! > 1 ? files : files?.[0];

  const toUpdateHeroContent = updateHeroContent.bind(
    null,
    id as string,
    imageFile as string[]
  );

  const [hero, setHero] = useState<HeroSection>({
    title: "",
    description: "",
    cta_text: "",
    cta_link: "",
  });

  useEffect(() => {
    async function getHeroContent() {
      if (id) {
        const content = await findHeroContentById(id);
        if (content) {
          setHero({
            ...hero,
            title: content.title,
            description: content.description,
            cta_text: content.cta_text,
            cta_link: content.cta_link,
          });
          addFiles(hero.imageUrl as unknown as File[]);
        }
      }
    }
    getHeroContent();
  }, [id]);

  return (
    <>
      <div>
        <h2>Add Hero Content</h2>
      </div>
      <div>
        <FilesUploader files={files} addFiles={addFiles} />
      </div>
      <form action={toUpdateHeroContent}>
        <div>
          <label htmlFor="title">Title:</label>
          <input
            id="title"
            type="text"
            name="title"
            defaultValue={hero.title}
            className="bg-transparent"
          />
        </div>
        <div>
          <label htmlFor="description">Description:</label>
          <input
            id="description"
            type="text"
            name="description"
            defaultValue={hero.description}
            className="bg-transparent"
          />
        </div>

        <div>
          <label htmlFor="cta_text">CTA Text:</label>
          <input
            id="cta_text"
            type="text"
            name="cta_text"
            defaultValue={hero.cta_text}
            className="bg-transparent"
          />
        </div>
        <div>
          <label htmlFor="cta_link">CTA Link:</label>
          <input
            id="cta_link"
            type="text"
            name="cta_link"
            defaultValue={hero.cta_link}
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

export default EditHeroContent;
