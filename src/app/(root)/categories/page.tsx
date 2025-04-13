"use client";

import React, { ChangeEvent, useEffect, useState } from "react";
import FilesUploader from "@/components/FilesUploader";
import {
  deleteCategory,
  getCategory,
  createCategory,
} from "@/app/actions/category";
import { Category as Cat } from "@/constant/types";
import { useFileUploader } from "@/hooks/useFileUploader";
import Spinner from "@/components/Spinner";

const Categories = () => {
  const { files, loading, addFiles, removeFile } = useFileUploader();

  const [categoryData, setCategoryData] = useState<Cat>({
    _id: "",
    categoryName: "",
    description: "",
    imageUrl: [],
  });
  const [categories, setCategories] = useState<Cat[]>([]);
  const [categoryEdit, setCategoryEdit] = useState<Cat>({
    _id: "",
    categoryName: "",
    description: "",
    imageUrl: [],
  });
  const [subCategory, setSubcategory] = useState<Cat[] | null>([]);
  const [catId, setCatId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Define an action function that either posts a new category or updates an existing one
  const action = async (formData: Cat) => {
    const result = await createCategory(formData, editId);
    if (result) {
      const updatedCategories = await getCategory();
      setCategories(updatedCategories);
      setEditId(null); // Reset the form after submit
    } else {
      console.log("Error while processing!");
    }
  };

  const handleCategoryData = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (editId) {
      setCategoryEdit((prev) => ({ ...prev, [name]: value }));
    } else {
      setCategoryData((prev) => ({ ...prev, [name]: value }));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      let urls = [];
      if (catId) {
        const subCatRes = await getCategory(null, catId, null);
        setSubcategory(subCatRes || []);
      }

      if (editId) {
        const editRes = await getCategory(editId, null, null);
        setCategoryEdit({
          _id: editRes?._id,
          categoryName: editRes?.categoryName,
          description: editRes?.description,
          imageUrl: editRes?.imageUrl,
        });
        urls.push(editRes?.imageUrl);
        addFiles(urls);
      } else {
        const res = await getCategory();
        setCategories(res);
      }
    };
    fetchData();
  }, [editId, catId]);

  const handleDelete = async (id: string) => {
    const result = await deleteCategory(id);
    if (result.success) {
      setCategories(categories.filter((cat) => cat._id !== id));
    } else {
      console.error(result.error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const images = files?.length! > 1 ? files : files?.[0];
    const formData = editId
      ? { ...categoryEdit, imageUrl: images as string[] }
      : { ...categoryData, imageUrl: images as string[] };
    await action(formData);
  };

  return (
    <div className="p-2 pb-10">
      <h2 className="text-2xl font-bold my-2">
        {editId ? "Edit Category" : "Create Category"}
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="lg:flex gap-3 mb-2">
          <div className="lg:flex gap-3 mb-5">
            <div>
              <label htmlFor="categoryId">Parent Category:</label>
              <select
                title="parentCategory"
                name="_id"
                value={editId ? categoryEdit._id : categoryData._id}
                onChange={handleCategoryData}
                className="w-full bg-[#eee] dark:bg-sec-dark"
              >
                <option value="">Select Parent Category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.categoryName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="category">New Category:</label>
            <input
              id="category"
              type="text"
              name="categoryName"
              value={
                editId ? categoryEdit.categoryName : categoryData.categoryName
              }
              onChange={handleCategoryData}
              className="w-full bg-[#eee] dark:bg-sec-dark"
            />
          </div>
        </div>
        <div>
          <FilesUploader files={files} addFiles={addFiles} />
        </div>

        <div>
          <label htmlFor="description">Description:</label>
          <input
            id="description"
            type="text"
            name="description"
            value={editId ? categoryEdit.description : categoryData.description}
            onChange={handleCategoryData}
            className="w-full p-2 max-h-20 bg-[#eee] dark:bg-sec-dark"
          />
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn block my-2">
            {editId ? "Update Category" : "Add Category"}
          </button>
        </div>
      </form>

      <div>
        <h2 className="font-bold text-xl my-2">Categories</h2>

        <div className="grid grid-cols-2 gap-3 w-full whitespace-nowrap overflow-x-auto">
          <ul className="flex flex-col gap-1 max-h-96 overflow-y-auto scrollbar-none">
            {categories &&
              categories.map((cat) => (
                <li
                  key={cat._id}
                  className="flex justify-between cursor-pointer font-bold text-gray-300 "
                >
                  <span
                    onClick={() => setCatId(cat._id as string)}
                    className="flex-1 hover:text-sec hover:bg-opacity-5 p-1"
                  >
                    {cat.categoryName}
                  </span>
                  <div className="flex gap-2">
                    <span
                      onClick={() => setEditId(cat._id as string)}
                      className="border px-1 hover:text-sec hover:bg-opacity-5 p-1"
                    >
                      Edit
                    </span>
                    <span
                      onClick={() => handleDelete(cat._id as string)}
                      className="border px-1 hover:text-sec hover:bg-opacity-5 p-1"
                    >
                      Delete
                    </span>
                  </div>
                </li>
              ))}
          </ul>

          <ul className="flex flex-col gap-1 max-h-96 overflow-hidden overflow-y-auto scrollbar-none">
            {subCategory &&
              subCategory.map((sub) => (
                <li
                  key={sub._id}
                  className="flex justify-between cursor-pointer font-bold text-gray-300 hover:text-pri hover:bg-gray-100 hover:bg-opacity-5 p-1"
                >
                  {sub.categoryName}
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Categories;
