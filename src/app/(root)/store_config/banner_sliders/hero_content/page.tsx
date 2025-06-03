"use client";

import { findHeroContent } from "@/app/actions/content_management";
import { HeroSection } from "@/constant/types";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const HeroContent = () => {
  const [heroContent, setHeroContent] = useState<HeroSection[] | null>([]);

  useEffect(() => {
    async function getHeroContent() {
      const content = await findHeroContent();
      if (content) {
        setHeroContent(content);
      }
    }
    getHeroContent();
  }, []);
  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className=" font-bold text-lg">Hero Content</h2>
        <Link
          href={"/store_config/banner_sliders/add_hero_content"}
        >
          <button type="button" className="p-2 rounded-lg bg-thiR">
            Add Hero Content
          </button>
        </Link>
      </div>
      <ul className="flex flex-col gap-3 mt-4">
        {heroContent &&
          heroContent.map((hero, index) => (
            <li key={index} className="flex gap-3 justify-between rounded-lg">
              <div className="flex gap-3">
                <img
                  title="hero"
                  src={hero.imageUrl as unknown as string}
                  width={50}
                  height={50}
                  alt="hero"
                />
                <span>{hero.title}</span>
              </div>
              <Link
                href={`/store_config/banner_sliders/edit_hero_content?id=${hero._id}`}
              >
                <button
                  title="edit"
                  type="button"
                  className="border p-2 px-3 bg-blue-700"
                >
                  Edit
                </button>
              </Link>
            </li>
          ))}
      </ul>
    </>
  );
};

export default HeroContent;
