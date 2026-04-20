import React from 'react';

const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
);

export const SkeletonBox = ({ className }) => (
  <div className={`relative overflow-hidden bg-white/5 rounded-xl ${className}`}>
    <Shimmer />
  </div>
);

export const SkeletonStall = () => (
  <div className="glass-card p-4 h-24 flex flex-col justify-between">
    <div className="flex justify-between items-start">
      <SkeletonBox className="w-1/2 h-5" />
      <SkeletonBox className="w-12 h-4" />
    </div>
    <div className="flex justify-between items-end">
      <SkeletonBox className="w-24 h-4" />
      <SkeletonBox className="w-16 h-6 rounded-lg" />
    </div>
  </div>
);

export const SkeletonOrder = () => (
  <div className="glass-card p-5 h-48 space-y-4">
    <div className="flex justify-between">
      <div className="space-y-2 flex-1">
        <SkeletonBox className="w-2/3 h-5" />
        <SkeletonBox className="w-1/3 h-3" />
      </div>
      <SkeletonBox className="w-12 h-10" />
    </div>
    <SkeletonBox className="w-full h-8 rounded-full" />
    <SkeletonBox className="w-full h-16" />
  </div>
);

export const SkeletonCategory = () => (
  <div className="flex gap-2 overflow-hidden mb-5">
    {[1, 2, 3, 4, 5].map((i) => (
      <SkeletonBox key={i} className="min-w-[100px] h-10" />
    ))}
  </div>
);
