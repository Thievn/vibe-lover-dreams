import React from 'react';
import { Twitter } from 'lucide-react';

const FollowXSection = () => {
  const handleClick = () => {
    window.open('https://x.com/LustForgeApp', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full py-8 px-4 bg-gradient-to-b from-[#1a1a1a] to-[#2d1b1b] border-t border-[#8b0000] flex justify-center">
      <div className="max-w-md w-full bg-gradient-to-r from-[#1a1a1a] to-[#2d1b1b] rounded-lg border border-[#8b0000] p-6 text-center shadow-lg shadow-[#8b0000]/30 hover:shadow-lg hover:shadow-[#ff4500]/30 transition-all duration-300">
        <button
          onClick={handleClick