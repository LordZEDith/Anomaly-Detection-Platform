export interface Strategy {
  id: string;
  name: string;
  purpose: string[];
  features: string[];
  advantages: string[];
  disadvantages: string[];
}

export interface StrategyResponse {
  strategies: Strategy[];
} 