import React from 'react';

interface CoolStrategiesProps {
  scores: {
    NEI: number;
    SWE: number;
    HEAT: number;
    TCI: number;
    BCI: number;
    UCIS: number;
  };
  locationData?: {
    name?: string;
    lat?: number;
    lon?: number;
  };
}

const CoolStrategies: React.FC<CoolStrategiesProps> = ({ scores, locationData }) => {
  return null;
};

export default CoolStrategies;
