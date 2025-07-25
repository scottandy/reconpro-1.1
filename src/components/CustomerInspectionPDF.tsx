import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Vehicle } from '../types/vehicle';
import { InspectionSettings } from '../types/inspectionSettings';
import { InspectionDataManager } from '../utils/inspectionDataManager';
import { PDFGenerator, CustomerComment } from '../utils/pdfGenerator';
import { 
  FileText, 
  Download, 
  Eye, 
  Plus, 
  MessageSquare, 
  X, 
  Check, 
  Mail, 
  Share2,
  Printer,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import CustomerCommentModal from './CustomerCommentModal';

interface CustomerInspectionPDFProps {
  vehicle: Vehicle;
  isOpen: boolean;
  onClose: () => void;
}

const CustomerInspectionPDF: React.FC<CustomerInspectionPDFProps> = ({ 
  vehicle, 
  isOpen, 
  onClose 
}) => {
  const { dealership, user } = useAuth();
  const [inspectionSettings, setInspectionSettings] = useState<InspectionSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [customerComments, setCustomerComments] = useState<CustomerComment[]>([]);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [pdfHtml, setPdfHtml] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  // Load inspection settings from DB only (never localStorage)
  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      setSettingsLoaded(false);
      if (dealership && isOpen) {
        await InspectionDataManager.initializeDefaultSettings(dealership.id);
        const settings = await InspectionDataManager.getSettings(dealership.id);
        if (!cancelled) {
          setInspectionSettings(settings);
          setSettingsLoaded(true);
        }
      } else {
        setInspectionSettings(null);
        setSettingsLoaded(false);
      }
    };
    loadSettings();
    return () => { cancelled = true; };
  }, [dealership, vehicle, isOpen]);

  // Listen for inspection data changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vehicleInspections') {
        setLastRefreshed(new Date());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Separate useEffect for generating PDF to ensure settings are loaded
  useEffect(() => {
    if (isOpen && inspectionSettings && settingsLoaded) {
      generatePdfPreview();
    }
  }, [inspectionSettings, customerComments, isOpen, lastRefreshed, settingsLoaded]);

  const loadCustomerComments = () => {
    // Load from localStorage
    const savedComments = localStorage.getItem(`vehicle_customer_comments_${vehicle.id}`);
    if (savedComments) {
      try {
        setCustomerComments(JSON.parse(savedComments));
      } catch (error) {
        console.error('Error loading customer comments:', error);
        setCustomerComments([]);
      }
    } else {
      setCustomerComments([]);
    }
  };

  const saveCustomerComments = (comments: CustomerComment[]) => {
    localStorage.setItem(`vehicle_customer_comments_${vehicle.id}`, JSON.stringify(comments));
  };

  const handleAddComment = (commentData: Omit<CustomerComment, 'id' | 'timestamp'>) => {
    const newComment: CustomerComment = {
      ...commentData,
      id: `comment-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    
    const updatedComments = [newComment, ...customerComments];
    setCustomerComments(updatedComments);
    saveCustomerComments(updatedComments);
  };

  const handleDeleteComment = (commentId: string) => {
    const updatedComments = customerComments.filter(comment => comment.id !== commentId);
    setCustomerComments(updatedComments);
    saveCustomerComments(updatedComments);
  };

  const generatePdfPreview = async () => {
    if (!dealership || !inspectionSettings || !user) {
      setError('Cannot generate PDF: Missing dealership, inspection settings, or user');
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      // Get dealership info
      const dealershipInfo = {
        name: dealership.name,
        address: `${dealership.address}, ${dealership.city}, ${dealership.state} ${dealership.zipCode}`,
        phone: dealership.phone,
        email: dealership.email,
        website: dealership.website
      };
      // Generate PDF HTML (async)
      const html = await PDFGenerator.generateCustomerInspectionPDF({
        vehicle,
        inspectionSettings,
        customerComments,
        dealershipInfo,
        inspectionDate: new Date().toISOString(),
        inspectorName: user ? `${user.firstName} ${user.lastName}` : undefined
      }, user.id);
      setPdfHtml(html);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!pdfHtml) return;
    
    const fileName = `${vehicle.year}_${vehicle.make}_${vehicle.model}_Inspection_${new Date().toISOString().split('T')[0]}.html`;
    PDFGenerator.downloadPDF(pdfHtml, fileName);
  };

  const handlePreviewPDF = () => {
    if (!pdfHtml) return;
    
    PDFGenerator.previewPDF(pdfHtml);
  };

  const handleEmailPDF = () => {
    if (!pdfHtml) return;
    
    const fileName = `${vehicle.year}_${vehicle.make}_${vehicle.model}_Inspection_${new Date().toISOString().split('T')[0]}.html`;
    const subject = `Vehicle Inspection Report - ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const body = `Please find attached the vehicle inspection report for the ${vehicle.year} ${vehicle.make} ${vehicle.model}.\n\nThis report contains detailed inspection results and recommendations.\n\nBest regards,\n${dealership?.name || 'Your Dealership'}`;
    
    // Create a data URL for the HTML content
    const blob = new Blob([pdfHtml], { type: 'text/html' });
    const dataUrl = URL.createObjectURL(blob);
    
    // Create mailto link with attachment (note: most email clients don't support attachments via mailto)
    // So we'll include the content in the body and provide instructions
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\nNote: The full inspection report will be downloaded separately. Please attach the downloaded file to your email.')}`;
    
    // Open email client and trigger download
    window.open(mailtoLink);
    
    // Also trigger the download so user can attach it manually
    setTimeout(() => {
      PDFGenerator.downloadPDF(pdfHtml, fileName);
    }, 500);
  };

  const handlePrintPDF = () => {
    if (!pdfHtml) return;
    
    // Create a new window with the PDF content and trigger print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(pdfHtml);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        // Add a small delay to ensure all styles are loaded
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get visible sections for the comment modal
  const getVisibleSections = () => {
    if (!inspectionSettings || !inspectionSettings.sections) return [];
    return inspectionSettings.sections
      .filter(section => section.isActive && section.isCustomerVisible)
      .map(section => ({
        key: section.key,
        label: section.label
      }));
  };

  // Manual refresh handler
  const handleManualRefresh = () => {
    setLastRefreshed(new Date());
    generatePdfPreview();
  };

  if (!isOpen) return null;
  if (!settingsLoaded) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-2xl w-full p-8 flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Loading Inspection Settings...</h2>
          <p className="text-gray-600 text-sm">Please wait while we load the latest inspection settings for this dealership.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-white/20">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200/60 px-6 py-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Customer Inspection Report</h2>
                <p className="text-sm text-gray-600">
                  {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim || ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row h-[calc(90vh-80px)]">
          {/* Left Panel - PDF Preview */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-medium text-gray-900">PDF Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleManualRefresh}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  disabled={isGenerating}
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={handlePreviewPDF}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  disabled={!pdfHtml || isGenerating}
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  disabled={!pdfHtml || isGenerating}
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4 bg-gray-100">
              {isGenerating ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Generating PDF preview...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Generating PDF</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                      onClick={handleManualRefresh}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : pdfHtml ? (
                <div className="bg-white shadow-lg border border-gray-200 rounded-lg mx-auto max-w-[800px]">
                  <iframe
                    srcDoc={pdfHtml}
                    title="PDF Preview"
                    className="w-full h-[calc(90vh-180px)]"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">PDF preview not available</p>
                    <button 
                      onClick={generatePdfPreview}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Generate Preview
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Customer Comments */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-200 flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Inspection Notes</h3>
              <button
                onClick={() => setShowCommentModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {customerComments.length > 0 ? (
                <div className="space-y-4">
                  {customerComments.map(comment => (
                    <div key={comment.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                              {comment.section}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(comment.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{comment.comment}</p>
                          {comment.customerName && (
                            <p className="text-xs text-gray-500 mt-1">
                              From: {comment.customerName}
                              {comment.customerEmail && ` (${comment.customerEmail})`}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete comment"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-4">No inspection notes yet</p>
                  <button
                    onClick={() => setShowCommentModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add First Note
                  </button>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="space-y-2">
                <button
                  onClick={handleDownloadPDF}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  disabled={!pdfHtml || isGenerating}
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleEmailPDF}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                    disabled={!pdfHtml || isGenerating}
                  >
                    <Mail className="w-3 h-3" />
                    <span>Email</span>
                  </button>
                  <button
                    onClick={handlePrintPDF}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                    disabled={!pdfHtml || isGenerating}
                  >
                    <Printer className="w-3 h-3" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Comment Modal */}
      <CustomerCommentModal
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        onSave={handleAddComment}
        sections={getVisibleSections()}
      />
    </div>
  );
};

export default CustomerInspectionPDF;