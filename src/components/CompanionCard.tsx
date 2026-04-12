import React from 'react';

interface CompanionCardProps {
  name: string;
  subtitle: string;
  img: string;
  onClick?: () => void;
}

const CompanionCard: React.FC<CompanionCardProps>