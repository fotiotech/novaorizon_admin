"use client";

import i18next from "i18next";
import { useState } from "react";

const LanguageSwitcher = () => {
  const [language, setLanguage] = useState("en");
  const changeLanguage = () => {
    i18next.changeLanguage(language);
  };

  changeLanguage();

  return (
    <div>
      <select
        title="select language"
        name="language"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      >
        <option value={"en"}>English</option>
        <option value={"fr"}>Français</option>
        <option value={"de"}>Deutsch</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
