// app/categories/page.tsx (Main Component)
"use client";

import React, { ChangeEvent, useEffect, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";


import CategoryAttribute from "@/components/category/CategoryAttribute";
import { useFileUploader } from "@/hooks/useFileUploader";
import {
  deleteCategory,
  getCategory,
  createCategory,
  updateCategoryAttributes,
} from "@/app/actions/category";
import { Category as Cat } from "@/constant/types";
import CategoryForm from "./_component/CategoryForm";
import CategoryList from "./_component/CategoryList";

const Categories: React.FC = () => {
  const { files, loading, addFiles, removeFile } = useFileUploader();
  const [categories, setCategories] = useState<Cat[]>([]);
  const [subCategories, setSubCategories] = useState<Cat[]>([]);
  const [categoryData, setCategoryData] = useState<Cat>({
    _id: "",
    name: "",
    parent_id: "",
    description: "",
    imageUrl: [],
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<string[]>([]);
  const [showAttributes, setShowAttributes] = useState(false);

  const fetchCategories = useCallback(async () => {
    const res = await getCategory();
    if (res) setCategories(res);
  }, []);

  const fetchSubCategories = useCallback(async (id: string) => {
    const res = await getCategory(null, id, null);
    if (res) setSubCategories(res);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchSubCategories(selectedCategoryId);
    } else {
      setSubCategories([]);
    }
  }, [selectedCategoryId, fetchSubCategories]);

  useEffect(() => {
    const fetchEditData = async () => {
      if (!editId) return;
      
      const editRes = await getCategory(editId, null, null);
      if (editRes) {
        setCategoryData({
          _id: editRes._id,
          name: editRes.name,
          parent_id: editRes.parent_id || "",
          description: editRes.description || "",
          imageUrl: editRes.imageUrl || [],
        });
        
        if (editRes.imageUrl) {
          addFiles(editRes.imageUrl);
        }
      }
    };

    fetchEditData();
  }, [editId, addFiles]);

  const handleCategoryData = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCategoryData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const images = files.length > 1 ? files : files[0];
    const formData = { 
      ...categoryData, 
      imageUrl: images as any[], 
      attributes 
    };
    
    const result = await createCategory(formData, editId);
    if (result) {
      await fetchCategories();
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteCategory(id);
    if (result.success) {
      setCategories(categories.filter((cat) => cat._id !== id));
      if (selectedCategoryId === id) {
        setSelectedCategoryId(null);
      }
    }
  };

  const handleEdit = (category: Cat) => {
    setEditId(category._id as string);
    setCategoryData({
      _id: category._id || "",
      name: category.name || "",
      parent_id: category.parent_id || "",
      description: category.description || "",
      imageUrl: category.imageUrl || [],
    });
  };

  const resetForm = () => {
    setCategoryData({
      _id: "",
      name: "",
      parent_id: "",
      description: "",
      imageUrl: [],
    });
    setEditId(null);
    setAttributes([]);
  };

  return (
    <div className="lg:p-8 space-y-6">
      <h2 className="text-2xl font-bold my-2 text-gray-800 dark:text-gray-100">
        {editId ? "Edit Category" : "Create Category"}
      </h2>

      <CategoryForm
        categoryData={categoryData}
        categories={categories}
        editId={editId}
        loading={loading}
        files={files}
        onDataChange={handleCategoryData}
        onAddFiles={addFiles}
        onRemoveFile={removeFile  as any}
        onSubmit={handleSubmit}
      />

      <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
        <button
          type="button"
          onClick={() => setShowAttributes(prev => !prev)}
          className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline mb-4"
        >
          {showAttributes ? "Hide" : "Show"} Attribute Mapping
        </button>

        {showAttributes && (
          <CategoryAttribute
            categoryId={categoryData._id || categoryData.parent_id}
            onAttributesChange={setAttributes}
            selectedAttributes={attributes}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CategoryList
          categories={categories}
          title="Categories"
          onCategoryClick={setSelectedCategoryId}
          onEditCategory={handleEdit}
          onDeleteCategory={handleDelete}
          selectedCategoryId={selectedCategoryId}
        />

        <CategoryList
          categories={subCategories}
          title="Subcategories"
          emptyMessage="No subcategories found"
        />
      </div>
    </div>
  );
};

export default Categories;