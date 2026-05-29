import React from 'react';

interface JsonViewerProps {
  data: any;
}

export default function JsonViewer({ data }: JsonViewerProps) {
  const pretty = JSON.stringify(data, null, 2);
  return (
    <pre className="bg-gray-800/30 text-white rounded p-4 overflow-auto text-xs font-mono">
      {pretty}
    </pre>
  );
}
