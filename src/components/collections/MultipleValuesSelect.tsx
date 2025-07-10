import React, { useState, KeyboardEvent } from 'react';

interface MultipleValuesSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MultipleValuesSelect: React.FC<MultipleValuesSelectProps> = ({
  values,
  onChange,
  placeholder = 'Enter value...',
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        const newValue = inputValue.trim();
        if (!values.includes(newValue)) {
          onChange([...values, newValue]);
        }
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const removeValue = (indexToRemove: number) => {
    onChange(values.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-white min-h-[2.5rem]">
      {values.map((value, index) => (
        <span
          key={index}
          className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded"
        >
          {value}
          <button
            type="button"
            onClick={() => removeValue(index)}
            className="text-blue-600 hover:text-blue-800"
            disabled={disabled}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={values.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[100px] outline-none bg-transparent"
        disabled={disabled}
      />
    </div>
  );
};

export default MultipleValuesSelect;
