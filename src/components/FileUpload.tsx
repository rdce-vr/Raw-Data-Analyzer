import React, { useState, useCallback } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onUploadSuccess: (data: any) => void;
}

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [uploadType, setUploadType] = useState<'ticketing'>('ticketing');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const uploadFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setError('Please upload a valid Excel or CSV file (.xlsx, .xls, .csv)');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', uploadType);

    try {
      // Use relative endpoint /api/upload since frontend and backend share the same server port
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Server error (${response.status})`);
      }

      const result = await response.json();
      setSuccess(true);
      setTimeout(() => {
        onUploadSuccess(result);
      }, 800);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'Connection failed. Please verify your connection or try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  }, [uploadType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-12">
      <div
        className={`relative rounded-2xl p-16 text-center transition-all duration-300 ease-out transform border-2 border-dashed ${
          isDragging
            ? 'border-cyan-500 bg-gradient-to-br from-cyan-50/90 to-amber-50/90 scale-105 shadow-2xl'
            : 'border-slate-200 bg-white/60 hover:bg-white/80 hover:border-slate-300 hover:shadow-xl'
        } ${isUploading ? 'opacity-60 pointer-events-none' : ''} ${
          success ? 'border-emerald-400 bg-gradient-to-br from-green-50/90 to-emerald-50/90' : ''
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
          accept=".xlsx, .xls, .csv"
          disabled={isUploading}
        />

        <div className="flex flex-col items-center justify-center space-y-6">
          <div
            className={`relative p-6 rounded-full transition-all duration-300 ${
              isDragging ? 'bg-cyan-50 scale-110' : ''
            } ${!isDragging && !isUploading && !success ? 'bg-slate-50' : ''} ${
              success ? 'bg-emerald-50' : ''
            }`}
          >
            {isUploading ? (
              <Loader2 className="w-12 h-12 text-cyan-600 animate-spin" />
            ) : success ? (
              <CheckCircle className="w-12 h-12 text-emerald-600 animate-in fade-in" />
            ) : (
              <Upload
                className={`w-12 h-12 transition-all duration-300 ${
                  isDragging ? 'text-cyan-600' : 'text-slate-400'
                }`}
              />
            )}
            
            <div
              className={`absolute inset-0 rounded-full transition-all duration-300 border-4 ${
                isDragging ? 'border-cyan-100' : 'border-transparent'
              }`}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-800">
              {isUploading
                ? 'Uploading Data...'
                : success
                ? 'Upload Complete!'
                : 'Upload Ticketing File'}
            </h3>
            <p className="text-slate-500 font-medium max-w-xs mx-auto">
              {success
                ? 'Preparing your dashboard...'
                : 'Drag & drop your .xlsx or .csv file here, or click to browse'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {['.XLSX', '.XLS', '.CSV'].map((ext) => (
              <span
                key={ext}
                className="px-3 py-1 rounded-md bg-slate-100 text-slate-500 text-xs font-bold border border-slate-200"
              >
                {ext}
              </span>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 flex items-start text-red-800 shadow-md animate-in fade-in">
          <AlertCircle className="w-6 h-6 mr-3 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold mb-1">Upload Failed</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
