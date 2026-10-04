"use client";

import HeroForm from "../_component/HeroForm";

const AddHeroPage = () => {
  const handleSuccess = () => {
    // Redirect or show success message
    console.log("Hero content created successfully!");
  };

  return (
    <div className="container mx-auto py-8">
      <HeroForm mode="create" onSuccess={handleSuccess} />
    </div>
  );
};

export default AddHeroPage;
