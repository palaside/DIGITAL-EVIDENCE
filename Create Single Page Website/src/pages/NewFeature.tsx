import React, { useState } from 'react'
import UploadPanel from '../components/UploadPanel'
import CanvasPreview from '../components/CanvasPreview'

export default function NewFeature() {
  const [file, setFile] = useState<File | undefined>(undefined)

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h3 className="text-xl font-semibold mb-4">New Feature — Canvas preview</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <UploadPanel onFileSelected={(f) => setFile(f)} />
        </div>
        <div>
          <CanvasPreview file={file} alt="Preview canvas" />
        </div>
      </div>
    </div>
  )
}
