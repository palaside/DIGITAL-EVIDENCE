import React from 'react'

type Props = {
  onFileSelected: (file: File) => void
}

export default function UploadPanel({ onFileSelected }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onFileSelected(f)
  }

  return (
    <div className="p-4 rounded-xl border border-white/30 bg-white/50 dark:bg-slate-900/40">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Upload image</label>
      <input type="file" accept="image/*" onChange={handleChange} className="mt-3" />
    </div>
  )
}
