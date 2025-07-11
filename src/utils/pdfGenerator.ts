import { Vehicle } from '../types/vehicle';
import { InspectionSettings } from '../types/inspectionSettings';
import { ProgressCalculator } from '../utils/progressCalculator';
import { InspectionDataManager } from './inspectionDataManager';
import { DEFAULT_INSPECTION_DATA } from '../components/InspectionChecklist';

export interface CustomerComment {
  id: string;
  section: string;
  comment: string;
  timestamp: string;
  customerName?: string;
  customerEmail?: string;
}

export interface CustomerPdfData {
  vehicle: Vehicle;
  inspectionSettings: InspectionSettings;
  customerComments: CustomerComment[];
  dealershipInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website?: string;
  };
  inspectionDate: string;
  inspectorName?: string;
}

export class PDFGenerator {
  static async generateCustomerInspectionPDF(data: CustomerPdfData, inspectorId: string): Promise<string> {
    const { vehicle, inspectionSettings, customerComments, dealershipInfo, inspectionDate, inspectorName } = data;
    
    // Get ALL sections in order (not just customer-visible)
    const allSections = inspectionSettings.sections
      .slice() // shallow copy
      .sort((a, b) => a.order - b.order);

    // Load inspection data from the database (not localStorage)
    let vehicleInspection: any = {};
    try {
      const dbData = await InspectionDataManager.loadInspectionData(vehicle.id, inspectorId);
      vehicleInspection = dbData || DEFAULT_INSPECTION_DATA;
    } catch (error) {
      vehicleInspection = DEFAULT_INSPECTION_DATA;
    }

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const getStockNumber = (vin: string): string => {
      return vin.slice(-6);
    };

    const getRatingLabel = (rating: string) => {
      switch (rating) {
        case 'G':
        case 'great':
          return 'Great';
        case 'F':
        case 'fair':
          return 'Fair';
        case 'N':
        case 'needs-attention':
          return 'Needs Attention';
        case 'not-checked':
          return 'Not Checked';
        default:
          return rating;
      }
    };

    const getRatingClass = (rating: string) => {
      switch (rating) {
        case 'G':
        case 'great':
          return 'badge-great';
        case 'F':
        case 'fair':
          return 'badge-fair';
        case 'N':
        case 'needs-attention':
          return 'badge-needs-attention';
        case 'not-checked':
          return 'badge-not-checked';
        default:
          return 'badge-not-checked';
      }
    };

    const getRatingColor = (rating: string) => {
      switch (rating) {
        case 'great':
          return '#10b981'; // emerald-500
        case 'fair':
          return '#f59e0b'; // amber-500
        case 'needs-attention':
          return '#ef4444'; // red-500
        default:
          return '#6b7280'; // gray-500
      }
    };

    // Section status calculation logic (matching VehicleDetail exactly)
    const sectionKeys = ['emissions', 'cosmetic', 'mechanical', 'cleaning', 'photos'];
    const getSectionStatus = (sectionKey: string, inspectionData: any): string => {
      const items = inspectionData?.[sectionKey] || [];
      if (!Array.isArray(items) || items.length === 0) return 'not-started';
      // If any item is 'not-checked', return 'not-started' (grey)
      if (items.some((item: any) => item.rating === 'not-checked')) return 'not-started';
      if (items.some((item: any) => item.rating === 'N')) return 'needs-attention';
      if (items.some((item: any) => item.rating === 'F')) return 'pending';
      if (items.every((item: any) => item.rating === 'G')) return 'completed';
      return 'not-started';
    };
    const sectionStatuses: Record<string, string> = sectionKeys.reduce((acc, key) => {
      acc[key] = getSectionStatus(key, vehicleInspection);
      return acc;
    }, {} as Record<string, string>);
    // Count sections that are 'completed', 'pending', or 'needs-attention' as completed for progress (matching VehicleDetail)
    const completedSections = sectionKeys.filter(key => {
      const status = sectionStatuses[key];
      return status === 'completed' || status === 'pending' || status === 'needs-attention';
    }).length;
    const needsAttention = sectionKeys.some(key => sectionStatuses[key] === 'needs-attention');
    const inProgress = !needsAttention && sectionKeys.some(key => sectionStatuses[key] === 'pending');
    const allCompleted = sectionKeys.filter(key => sectionStatuses[key] === 'completed').length === sectionKeys.length;
    const progress = Math.round((completedSections / sectionKeys.length) * 100);

    let statusBadgeHtml = '';
    if (needsAttention) {
      statusBadgeHtml = `<span style="display:inline-flex;align-items:center;font-weight:bold;font-size:15px;padding:4px 16px;border-radius:999px;background:#fee2e2;color:#b91c1c;"><span style='font-size:16px;margin-right:6px;'>⚠️</span> Needs Attention</span>`;
    } else if (inProgress) {
      statusBadgeHtml = `<span style="display:inline-flex;align-items:center;font-weight:bold;font-size:15px;padding:4px 16px;border-radius:999px;background:#fde68a;color:#92400e;">In Progress</span>`;
    } else if (allCompleted) {
      statusBadgeHtml = `<span style="display:inline-flex;align-items:center;font-weight:bold;font-size:15px;padding:4px 16px;border-radius:999px;background:#d1fae5;color:#065f46;"><span style='font-size:16px;margin-right:6px;'>✓</span> Ready for Sale</span>`;
    }

    // Generate HTML content for the PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Vehicle Inspection Report - ${vehicle.year} ${vehicle.make} ${vehicle.model}</title>
        <style>
          body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
          }
          .header h1 {
            color: #1e40af;
            margin-bottom: 5px;
          }
          .header p {
            color: #6b7280;
            margin: 5px 0;
          }
          .dealership-info {
            margin-bottom: 20px;
            font-size: 14px;
          }
          .vehicle-info {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
          }
          .vehicle-info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
          }
          .info-item {
            margin-bottom: 10px;
          }
          .info-item label {
            font-weight: bold;
            display: block;
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 4px;
          }
          .info-item p {
            margin: 0;
            font-size: 14px;
          }
          .section {
            margin-bottom: 30px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
          }
          .section-header {
            background-color: #f3f4f6;
            padding: 12px 15px;
            border-bottom: 1px solid #e5e7eb;
          }
          .section-header h2 {
            margin: 0;
            font-size: 18px;
            color: #1f2937;
          }
          .section-content {
            padding: 15px;
          }
          .inspection-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f3f4f6;
          }
          .inspection-item:last-child {
            border-bottom: none;
          }
          .item-name {
            font-weight: 500;
          }
          .item-rating {
            font-weight: bold;
            font-size: 13px;
            padding: 2px 14px;
            border-radius: 999px;
            display: inline-block;
            min-width: 0;
            text-align: center;
            margin-left: 12px;
          }
          .badge-great {
            background-color: #10b981;
            color: #fff;
          }
          .badge-fair {
            background-color: #fde68a;
            color: #92400e;
          }
          .badge-needs-attention {
            background-color: #ef4444;
            color: #fff;
          }
          .badge-not-checked {
            background-color: #e5e7eb;
            color: #6b7280;
          }
          .section-notes {
            margin-top: 15px;
            padding: 10px;
            background-color: #f9fafb;
            border-radius: 6px;
            font-size: 14px;
          }
          .section-notes h4 {
            margin: 0 0 5px 0;
            font-size: 14px;
            color: #4b5563;
          }
          .section-notes p {
            margin: 0;
            color: #6b7280;
          }
          .customer-comments {
            margin-top: 30px;
            padding: 20px;
            background-color: #eff6ff;
            border-radius: 8px;
            border: 1px solid #dbeafe;
          }
          .customer-comments h3 {
            margin-top: 0;
            color: #1e40af;
          }
          .comment {
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #dbeafe;
          }
          .comment:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
          }
          .comment-section {
            font-weight: 600;
            color: #1e40af;
          }
          .comment-text {
            margin: 5px 0;
          }
          .comment-meta {
            font-size: 12px;
            color: #6b7280;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
          }
          .signature {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }
          .signature-line {
            display: inline-block;
            width: 200px;
            border-bottom: 1px solid #000;
            margin-bottom: 5px;
          }
          .signature-name {
            font-size: 14px;
          }
          .ready-badge {
            display: inline-block;
            background-color: #d1fae5;
            color: #065f46;
            padding: 5px 10px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            margin-top: 10px;
          }
          .not-ready-badge {
            display: inline-block;
            background-color: #fee2e2;
            color: #b91c1c;
            padding: 5px 10px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            margin-top: 10px;
          }
          .progress-container {
            width: 100%;
            background-color: #e5e7eb;
            border-radius: 10px;
            margin: 15px 0;
          }
          .progress-bar {
            height: 10px;
            border-radius: 10px;
            background: linear-gradient(to right, #3b82f6, #6366f1);
          }
          .progress-text {
            text-align: right;
            font-size: 14px;
            font-weight: 600;
            margin-top: 5px;
          }
          .vin {
            font-family: monospace;
            background-color: #f3f4f6;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 14px;
          }
          .page-break {
            page-break-after: always;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Vehicle Inspection Report</h1>
            <p>Comprehensive inspection details for your vehicle</p>
            <p>Inspection Date: ${formatDate(inspectionDate)}</p>
            ${inspectorName ? `<p>Inspector: ${inspectorName}</p>` : ''}
          </div>
          
          <div class="dealership-info">
            <h3>${dealershipInfo.name}</h3>
            <p>${dealershipInfo.address}</p>
            <p>Phone: ${dealershipInfo.phone} | Email: ${dealershipInfo.email}</p>
            ${dealershipInfo.website ? `<p>Website: ${dealershipInfo.website}</p>` : ''}
          </div>
          
          <div class="vehicle-info">
            <h2>${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}</h2>
            <p>Stock #: ${getStockNumber(vehicle.vin)}</p>
            <p class="vin">VIN: ${vehicle.vin}</p>
            
            <div class="vehicle-info-grid">
              <div class="info-item">
                <label>Color</label>
                <p>${vehicle.color}</p>
              </div>
              <div class="info-item">
                <label>Mileage</label>
                <p>${vehicle.mileage.toLocaleString()} miles</p>
              </div>
            </div>
            
            <div class="info-item">
              <label>Reconditioning Status</label>
              ${statusBadgeHtml}
            </div>
            
            <div class="progress-container">
              <div class="progress-bar" style="width: ${progress}%;background:${allCompleted ? 'linear-gradient(to right,#10b981,#059669)' : 'linear-gradient(to right,#3b82f6,#6366f1)'}"></div>
            </div>
            <div class="progress-text" style="font-weight:bold;font-size:20px;text-align:right;">${progress}% Complete</div>
          </div>
          
          ${vehicle.notes ? `
          <div class="section">
            <div class="section-header">
              <h2>Vehicle Notes</h2>
            </div>
            <div class="section-content">
              <p>${vehicle.notes}</p>
            </div>
          </div>
          ` : ''}
          
          ${allSections.map(section => {
            const sectionItems = vehicleInspection[section.key] || [];
            return `
              <div class="section">
                <div class="section-header">
                  <h2>${section.icon} ${section.label}</h2>
                </div>
                <div class="section-content">
                  ${sectionItems.length > 0 ? `
                    ${sectionItems.map(item => `
                      <div class="inspection-item">
                        <div class="item-name">${item.label}</div>
                        <div class="item-rating ${getRatingClass(item.rating)}">
                          ${getRatingLabel(item.rating)}
                        </div>
                      </div>
                    `).join('')}
                  ` : `
                    <p>No inspection data available for this section.</p>
                  `}
                  ${vehicleInspection.sectionNotes && vehicleInspection.sectionNotes[section.key] ? `
                    <div class="section-notes">
                      <h4>Section Notes:</h4>
                      <p>${vehicleInspection.sectionNotes[section.key]}</p>
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
          
          ${customerComments.length > 0 ? `
            <div class="customer-comments">
              <h3>Inspection Notes</h3>
              ${customerComments.map(comment => `
                <div class="comment">
                  <div class="comment-section">${comment.section}</div>
                  <div class="comment-text">${comment.comment}</div>
                  <div class="comment-meta">
                    ${comment.customerName ? `By: ${comment.customerName} | ` : ''}
                    Date: ${formatDate(comment.timestamp)}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <div class="signature">
            <p>This document certifies that the vehicle has been inspected according to our dealership standards.</p>
            <div>
              <div class="signature-line"></div>
              <div class="signature-name">Dealership Representative</div>
            </div>
          </div>
          
          <div class="footer">
            <p>${inspectionSettings.customerPdfSettings?.footerText || ''}</p>
            <p>Report generated on ${new Date().toLocaleDateString()} by ${dealershipInfo.name}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return htmlContent;
  }

  static downloadPDF(html: string, fileName: string) {
    const blob = new Blob([html], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static previewPDF(html: string) {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  }
}
