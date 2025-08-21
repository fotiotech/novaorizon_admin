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
import { v4 as uuidv4 } from "uuid";
import Spinner from "@/components/Spinner";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import CategoryAttribute from "@/components/category/CategoryAttribute";
import { findAllAttributeGroups } from "@/app/actions/attributegroup";

const Categories = () => {
  const dispatch = useAppDispatch();
  const category = useAppSelector((state) => state.category);
  const id = category.allIds.length ? category.allIds[0] : uuidv4();
  const { files, loading, addFiles, removeFile } = useFileUploader();

  const [categoryData, setCategoryData] = useState<Cat>({
    _id: "",
    categoryName: "",
    parent_id: "",
    description: "",
    imageUrl: [],
  });
  const [categories, setCategories] = useState<Cat[]>([]);
  const [categoryEdit, setCategoryEdit] = useState<Cat>({
    _id: "",
    categoryName: "",
    parent_id: "",
    description: "",
    imageUrl: [],
    attributes: [],
  });
  const [subCategory, setSubcategory] = useState<Cat[] | null>([]);
  const [catId, setCatId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<any | null>(null);
  const [toggleCreateAttribute, setToggleCreateAttribute] =
    useState<boolean>(false);

  console.log({ categories });

  const action = async (formData: Cat) => {
    const result = await createCategory(formData, editId);
    if (result) {
      const updatedCategories = await getCategory();
      setCategories(updatedCategories);
      setEditId(null);
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
          parent_id: editRes?.parent_id,
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
      ? { ...categoryEdit, imageUrl: images as any[], attributes }
      : { ...categoryData, imageUrl: images as any[], attributes };
    await action(formData);
  };

  return (
    <div className=" lg:p-8 space-y-3">
      <h2 className="text-2xl font-bold my-2 text-gray-800 dark:text-gray-100">
        {editId ? "Edit Category" : "Create Category"}
      </h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white dark:bg-gray-800 shadow rounded-xl p-4"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="categoryId" className="block mb-1 font-medium">
              Parent Category
            </label>
            <select
              title="parentCategory"
              name="parent_id"
              value={editId ? categoryEdit.parent_id : categoryData.parent_id}
              onChange={handleCategoryData}
              className="w-full p-2 rounded-lg border bg-gray-100 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select Parent Category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="category" className="block mb-1 font-medium">
              New Category
            </label>
            <input
              id="category"
              type="text"
              name="categoryName"
              value={
                editId ? categoryEdit.categoryName : categoryData.categoryName
              }
              onChange={handleCategoryData}
              className="w-full p-2 rounded-lg border bg-gray-100 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div>
          <FilesUploader
            files={files}
            loading={loading}
            addFiles={addFiles}
            removeFile={removeFile}
          />
        </div>

        <div>
          <label htmlFor="description" className="block mb-1 font-medium">
            Description
          </label>
          <input
            id="description"
            type="text"
            name="description"
            value={editId ? categoryEdit.description : categoryData.description}
            onChange={handleCategoryData}
            className="w-full p-2 rounded-lg border bg-gray-100 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="w-full space-y-4">
          <button
            type="button"
            onClick={() => setToggleCreateAttribute((prev) => !prev)}
            className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
          >
            Map Attributes for this Category?
          </button>

          <CategoryAttribute
            toggleCreateAttribute={toggleCreateAttribute}
            handleSubmit={handleSubmit}
            attributes={attributes}
            setAttributes={setAttributes}
            categoryId={
              categoryData._id ||
              categoryEdit._id ||
              categoryData.parent_id ||
              ""
            }
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {editId ? "Update Category" : "Add Category"}
          </button>
        </div>
      </form>

      <div>
        <h2 className="font-bold text-xl my-2 text-gray-800 dark:text-gray-100">
          Categories
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ul className="flex flex-col gap-2 max-h-96 overflow-y-auto scrollbar-thin">
            {categories.map((cat) => (
              <li
                key={cat._id}
                className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <span
                  onClick={() => setCatId(cat._id as string)}
                  className="flex-1 cursor-pointer font-medium hover:text-blue-600"
                >
                  {cat.categoryName}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditId(cat._id as string)}
                    className="px-2 py-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(cat._id as string)}
                    className="px-2 py-1 border rounded text-red-600 hover:bg-red-50 dark:hover:bg-gray-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <ul className="flex flex-col gap-2 max-h-96 overflow-y-auto scrollbar-thin">
            {subCategory?.map((sub) => (
              <li
                key={sub._id}
                className="p-2 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition"
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
