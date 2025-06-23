import React from 'react';
import { Car, CheckCircle2, Clock, AlertTriangle, Archive, MapPin, TrendingUp, TrendingDown } from 'lucide-react';

interface InventorySummaryProps {
  summary: {
    totalVehicles: number;
    activeVehicles: number;
    completedVehicles: number;
    pendingVehicles: number;
    needsAttention: number;
    soldVehicles: number;
    pendingStatus: number;
    onSite: number;
    offSite: number;
    inTransit: number;
  };
  onCardClick: (filterType: string) => void;
  onLocationCardClick: (filterType: string) => void;
}

const InventorySummary: React.FC<InventorySummaryProps> = ({ summary, onCardClick, onLocationCardClick }) => {
  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Vehicles */}
        <button
          onClick={() => onCardClick('all')}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200/60 dark:border-blue-700/60 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Total</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 group-hover:text-blue-700 dark:group-hover:text-blue-200 transition-colors">{summary.totalVehicles}</p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-700 transition-colors flex-shrink-0">
              <Car className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to view all vehicles →
          </div>
        </button>

        {/* Completed Vehicles */}
        <button
          onClick={() => onCardClick('completed')}
          className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-6 rounded-xl border border-emerald-200/60 dark:border-emerald-700/60 hover:from-emerald-100 hover:to-green-100 dark:hover:from-emerald-900/30 dark:hover:to-green-900/30 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Ready</p>
              <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-200 transition-colors">{summary.completedVehicles}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {summary.totalVehicles > 0 ? Math.round((summary.completedVehicles / summary.totalVehicles) * 100) : 0}% of total
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-700 transition-colors flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to view completed vehicles →
          </div>
        </button>

        {/* Active Vehicles */}
        <button
          onClick={() => onCardClick('active')}
          className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-6 rounded-xl border border-amber-200/60 dark:border-amber-700/60 hover:from-amber-100 hover:to-yellow-100 dark:hover:from-amber-900/30 dark:hover:to-yellow-900/30 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Working</p>
              <p className="text-3xl font-bold text-amber-900 dark:text-amber-100 group-hover:text-amber-700 dark:group-hover:text-amber-200 transition-colors">{summary.activeVehicles}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {summary.totalVehicles > 0 ? Math.round((summary.activeVehicles / summary.totalVehicles) * 100) : 0}% of total
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center group-hover:bg-amber-700 transition-colors flex-shrink-0">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to view in-progress vehicles →
          </div>
        </button>

        {/* Needs Attention */}
        <button
          onClick={() => onCardClick('needs-attention')}
          className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 p-6 rounded-xl border border-red-200/60 dark:border-red-700/60 hover:from-red-100 hover:to-rose-100 dark:hover:from-red-900/30 dark:hover:to-rose-900/30 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">Issues</p>
              <p className="text-3xl font-bold text-red-900 dark:text-red-100 group-hover:text-red-700 dark:group-hover:text-red-200 transition-colors">{summary.needsAttention}</p>
              <p className="text-xs text-red-600 dark:text-red-400">
                {summary.totalVehicles > 0 ? Math.round((summary.needsAttention / summary.totalVehicles) * 100) : 0}% of total
              </p>
            </div>
            <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-700 transition-colors flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-xs text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to view vehicles needing attention →
          </div>
        </button>
      </div>

      {/* Location Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* On-Site */}
        <button
          onClick={() => onLocationCardClick('on-site')}
          className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-green-200/60 dark:border-green-700/60 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-1">On-Site</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 group-hover:text-green-700 dark:group-hover:text-green-200 transition-colors">{summary.onSite}</p>
            </div>
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center group-hover:bg-green-700 transition-colors flex-shrink-0">
              <MapPin className="w-5 h-5 text-white" />
            </div>
          </div>
        </button>

        {/* Off-Site */}
        <button
          onClick={() => onLocationCardClick('off-site')}
          className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-xl border border-yellow-200/60 dark:border-yellow-700/60 hover:from-yellow-100 hover:to-orange-100 dark:hover:from-yellow-900/30 dark:hover:to-orange-900/30 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide mb-1">Off-Site</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 group-hover:text-yellow-700 dark:group-hover:text-yellow-200 transition-colors">{summary.offSite}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center group-hover:bg-yellow-700 transition-colors flex-shrink-0">
              <MapPin className="w-5 h-5 text-white" />
            </div>
          </div>
        </button>

        {/* In-Transit */}
        <button
          onClick={() => onLocationCardClick('in-transit')}
          className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-purple-200/60 dark:border-purple-700/60 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-1">In-Transit</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 group-hover:text-purple-700 dark:group-hover:text-purple-200 transition-colors">{summary.inTransit}</p>
            </div>
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center group-hover:bg-purple-700 transition-colors flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
        </button>
      </div>

      {/* Progress Overview */}
      {summary.totalVehicles > 0 && (
        <div className="mt-6 p-4 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/60 dark:border-gray-700/60">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Overall Completion Rate</h3>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {Math.round((summary.completedVehicles / summary.totalVehicles) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-green-600 h-3 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${(summary.completedVehicles / summary.totalVehicles) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-2">
            <span>{summary.completedVehicles} completed</span>
            <span>{summary.totalVehicles - summary.completedVehicles} remaining</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventorySummary; 