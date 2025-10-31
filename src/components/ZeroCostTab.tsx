import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import ZeroCostStrategies from './ZeroCostStrategies';
import { toast } from "@/hooks/use-toast";
import { StrategyComponent } from '../pages/Index';

interface ZeroCostTabProps {
  spotPrice: number;
  setStrategy: (strategy: StrategyComponent[]) => void;
  calculatePayoff: () => void;
  monthsToHedge?: number;
  interestRate?: number; // ✅ AJOUT: Taux sans risque réel
  optionPricingModel?: 'black-scholes' | 'monte-carlo'; // ✅ AJOUT: Modèle de pricing
}

const ZeroCostTab: React.FC<ZeroCostTabProps> = ({ 
  spotPrice, 
  setStrategy, 
  calculatePayoff,
  monthsToHedge,
  interestRate = 5, // Default 5% si non fourni
  optionPricingModel = 'black-scholes' // Default Black-Scholes
}) => {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="text-xl font-bold text-primary">Zero-Cost Commodity Strategies</CardTitle>
        <CardDescription>
          Zero-cost commodity price risk hedging strategies
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <ZeroCostStrategies 
          spotPrice={spotPrice}
          monthsToHedge={monthsToHedge}
          interestRate={interestRate}
          optionPricingModel={optionPricingModel}
          addStrategyToSimulator={(strategy, name, options) => {
            setStrategy(strategy);
            calculatePayoff();
            toast({
              title: "Strategy applied",
              description: `${name} added to simulator`,
            });

            // Store options in localStorage or another state if needed for the simulator
            if (options) {
              localStorage.setItem('zeroCostOptions', JSON.stringify(options));
            }
          }}
        />
      </CardContent>
    </Card>
  );
};

export default ZeroCostTab; 