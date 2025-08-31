import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export const Input = ({
  label,
  placeholder,
  type = "text",
  register,
  disabled ,
  error,
  cnInput,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType =
    type === "password" ? (showPassword ? "text" : "password") : type;

  return (
    <div className="w-full mb-5">
      <div className="relative ">
         <input
          type={inputType}
          placeholder=" "
          className={`
            peer w-full rounded-xl border px-4 pt-5 pb-2  
            bg-white/90 text-gray-900 text-[16px] shadow-inner transition-all
            focus:border-transparent focus:ring-2 focus:ring-emerald-500/70
            placeholder-transparent outline-none
			${disabled && " opacity-80 !bg-gray-200/70 border-slate-100  pointer-events-none "}
			${cnInput}
            ${error ? "border-red-500 focus:ring-red-500/60" : "border-slate-200"}
          `}
          {...register}
          {...props}
        />

        {/* Floating label */}
        {label && (
          <label
            className={` pointer-events-none ${disabled && "!top-1 opacity-50 "}
              absolute left-4 top-2 text-gray-500 text-sm transition-all
              peer-placeholder-shown:top-4  peer-placeholder-shown:text-gray-400 
              peer-placeholder-shown:text-sm  peer-placeholder-shown:font-normal
              peer-focus:top-2  peer-focus:text-sm peer-focus:text-emerald-600
            `}
          >
            {label}
          </label>
        )}

        {/* Password toggle */}
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute  right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          ⚠ {error}
        </p>
      )}
    </div>
  );
};
