'use client';

import { useRef, useState } from 'react';
import { clsx } from 'clsx';

interface FileUploadProps {
  label: string;
  accept?: string;
  currentPath?: string | null;
  onChange: (file: File | null) => void;
  hint?: string;
}

export default function FileUpload({ label, accept = 'image/*,.pdf', currentPath, onChange, hint }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    onChange(file);
    if (file) {
      setFileName(file.name);
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreview(url);
      } else {
        setPreview(null);
      }
    } else {
      setFileName(null);
      setPreview(null);
    }
  }

  const displayPath = preview || currentPath;
  const isImage = displayPath && !displayPath.endsWith('.pdf');

  return (
    <div className="flex flex-col gap-1.5">
      <label className="label">{label}</label>

      <div
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors text-center',
          fileName || currentPath
            ? 'border-primary/40 bg-primary/5'
            : 'border-slate-200 hover:border-slate-300 bg-slate-50',
        )}
      >
        {isImage ? (
          <img
            src={displayPath!}
            alt={label}
            className="mx-auto h-20 w-20 object-cover rounded-lg mb-2"
          />
        ) : displayPath?.endsWith('.pdf') ? (
          <div className="text-4xl mb-1">📄</div>
        ) : (
          <div className="text-3xl mb-1 text-slate-300">📎</div>
        )}

        <p className="text-xs text-slate-500 font-medium">
          {fileName ?? (currentPath ? '✓ File uploaded — click to replace' : 'Click to select file')}
        </p>
        {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
      </div>

      {(fileName || currentPath) && (
        <button
          type="button"
          className="text-xs text-red-500 hover:underline self-start"
          onClick={(e) => {
            e.stopPropagation();
            onChange(null);
            setFileName(null);
            setPreview(null);
            if (inputRef.current) inputRef.current.value = '';
          }}
        >
          Remove
        </button>
      )}

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
    </div>
  );
}
