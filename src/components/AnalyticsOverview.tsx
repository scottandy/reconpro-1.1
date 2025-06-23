import React from 'react';
import { Dealership } from '../types/auth';

interface AnalyticsOverviewProps {
  dealership: Dealership;
}

const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({ dealership }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Analytics Overview</h2>
      <p className="text-gray-600 dark:text-gray-400">
        Analytics dashboard for {dealership.name} - Coming soon!
      </p>
    </div>
  );
};

export default AnalyticsOverview; 