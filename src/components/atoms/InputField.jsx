"use client";

import React, { memo } from "react";

const InputField = memo(function InputField({
  value,
  placeholder,
  inputMode,
  onChange,
  onBlur,
  className = "",
  type = "text",
}) {
  const hasValue = String(value ?? "").trim().length > 0;

  return (
    <div className="relative w-full">
      <label
        className={[
          "absolute left-2 px-1 text-[10px] transition-all bg-white pointer-events-none",
          hasValue
            ? "top-[-6px] !bg-[linear-gradient(to_bottom,#f1f5f9_50%,#ffffff_50%)] text-indigo-500 opacity-100"
            : "top-1/2 -translate-y-1/2 text-slate-400 opacity-0",
        ].join(" ")}
      >
        {placeholder}
      </label>

      <input
        value={value ?? ""}
        inputMode={inputMode}
        type={type}
        placeholder={hasValue ? "" : placeholder}
        onChange={onChange}
        onBlur={onBlur}
        className={[
          "h-8 w-full rounded-md border px-2 text-[12px]",
          "bg-white outline-none transition",
          "focus:ring-4 focus:ring-slate-400/20",
          hasValue
            ? "border-indigo-300 hover:border-indigo-400"
            : "border-slate-200 hover:border-slate-300",
          className,
        ].join(" ")}
      />
    </div>
  );
});

export default InputField;
