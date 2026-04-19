'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { User as UserType } from '@/types';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface PhotosStepProps {
  user: UserType;
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
}

export const PhotosStep: React.FC<PhotosStepProps> = ({ 
  user, 
  data, 
  onNext, 
  onBack 
}) => {
  const [photos, setPhotos] = useState<string[]>(user.photos || []);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('Image must be smaller than 10MB');
      return;
    }

    if (photos.length >= 6) {
      toast.error('Maximum 6 photos allowed');
      return;
    }

    setUploading(true);

    try {
      const result = await api.photos.upload(file);
      setPhotos(result.photos);
      toast.success('Photo uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  }, [photos.length]);

  const handleDeletePhoto = async (index: number) => {
    try {
      const result = await api.photos.delete(index);
      setPhotos(result.photos);
      toast.success('Photo deleted');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete photo');
    }
  };

  const handleNext = async () => {
    if (photos.length < 3) {
      toast.error('Please upload at least 3 photos');
      return;
    }

    setLoading(true);

    try {
      // Photos are already saved via the upload API
      onNext({ photos });
    } catch (error: any) {
      console.error('Next error:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Camera className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Add your photos
        </h2>
        <p className="text-slate-600">
          Upload at least 3 photos to show your personality. First photo will be your main profile picture.
        </p>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 gap-4">
        {[...Array(6)].map((_, index) => {
          const hasPhoto = photos[index];
          
          return (
            <div
              key={index}
              className="relative aspect-[3/4] rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 bg-slate-50"
            >
              {hasPhoto ? (
                <>
                  <Image
                    src={hasPhoto}
                    alt={`Photo ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  
                  {/* Main photo indicator */}
                  {index === 0 && (
                    <div className="absolute top-2 left-2 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      MAIN
                    </div>
                  )}
                  
                  {/* Delete button */}
                  <button
                    onClick={() => handleDeletePhoto(index)}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    disabled={uploading}
                  />
                  
                  {uploading && index === photos.length ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-sm text-slate-500 font-medium">
                        {index === 0 ? 'Main Photo' : `Photo ${index + 1}`}
                      </span>
                      {index < 3 && (
                        <span className="text-xs text-rose-500 mt-1">Required</span>
                      )}
                    </>
                  )}
                </label>
              )}
            </div>
          );
        })}
      </div>

      {/* Photo count indicator */}
      <div className="text-center">
        <p className="text-sm text-slate-600">
          {photos.length} of 6 photos uploaded
          {photos.length < 3 && (
            <span className="text-rose-500 ml-1">
              ({3 - photos.length} more required)
            </span>
          )}
        </p>
      </div>

      {/* Photo tips */}
      <div className="bg-blue-50 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Photo Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use clear, recent photos of yourself</li>
          <li>• Show your face clearly in at least 2 photos</li>
          <li>• Include full-body photos and photos that show your interests</li>
          <li>• Avoid group photos, sunglasses, or heavily filtered images</li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex space-x-4">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary flex-1 flex items-center justify-center space-x-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        
        <button
          onClick={handleNext}
          disabled={loading || photos.length < 3}
          className="btn-primary flex-[2] flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};