import React, { useState, useRef } from 'react';
import { X, Upload, Download, AlertCircle } from 'lucide-react';
import { read, utils, writeFileXLSX } from 'xlsx';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToastStore } from '../../stores/useToastStore';

interface ImportApplicationsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const TEMPLATE_HEADERS = [
  'Company Name',
  'Position Title',
  'Application Date',
  'Source',
  'Status',
  'Location',
  'Work Type',
  'Company Size',
  'Application URL',
  'Company URL',
  'Job Description',
  'Notes'
];

const VALID_STATUSES = [
  'draft', 'applied', 'screening', 'interview', 'offer', 'accepted', 'rejected', 'withdrawn'
];

const VALID_WORK_TYPES = ['remote', 'hybrid', 'onsite'];
const VALID_COMPANY_SIZES = ['startup', 'small', 'midsize', 'large', 'enterprise'];

export function ImportApplicationsModal({ onClose, onSuccess }: ImportApplicationsModalProps) {
  const { user } = useAuth();
  const { addToast } = useToastStore();
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const templateData = [
      TEMPLATE_HEADERS,
      [
        'Acme Inc',
        'Software Engineer',
        '2024-02-11',
        'LinkedIn',
        'applied',
        'New York, NY',
        'hybrid',
        'midsize',
        'https://linkedin.com/jobs/...',
        'https://acme.com',
        'Job description here...',
        'Applied through company website'
      ]
    ];

    const ws = utils.aoa_to_sheet(templateData);
    const colWidths = [
      { wch: 20 }, // Company Name
      { wch: 25 }, // Position Title
      { wch: 12 }, // Application Date
      { wch: 15 }, // Source
      { wch: 10 }, // Status
      { wch: 20 }, // Location
      { wch: 10 }, // Work Type
      { wch: 12 }, // Company Size
      { wch: 40 }, // Application URL
      { wch: 30 }, // Company URL
      { wch: 50 }, // Job Description
      { wch: 40 }  // Notes
    ];
    ws['!cols'] = colWidths;

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Applications Template');
    writeFileXLSX(wb, 'applications-import-template.xlsx');
  };

  const validateRow = (row: any, rowIndex: number): string | null => {
    if (!row['Company Name']?.trim()) return `Row ${rowIndex}: Company Name is required`;
    if (!row['Position Title']?.trim()) return `Row ${rowIndex}: Position Title is required`;
    if (!row['Application Date']) return `Row ${rowIndex}: Application Date is required`;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row['Application Date'])) {
      return `Row ${rowIndex}: Invalid date format for Application Date. Use YYYY-MM-DD`;
    }

    // Validate status
    if (row.Status && !VALID_STATUSES.includes(row.Status.toLowerCase())) {
      return `Row ${rowIndex}: Invalid status "${row.Status}". Must be one of: ${VALID_STATUSES.join(', ')}`;
    }

    // Validate work type
    if (row['Work Type'] && !VALID_WORK_TYPES.includes(row['Work Type'].toLowerCase())) {
      return `Row ${rowIndex}: Invalid work type "${row['Work Type']}". Must be one of: ${VALID_WORK_TYPES.join(', ')}`;
    }

    // Validate company size
    if (row['Company Size'] && !VALID_COMPANY_SIZES.includes(row['Company Size'].toLowerCase())) {
      return `Row ${rowIndex}: Invalid company size "${row['Company Size']}". Must be one of: ${VALID_COMPANY_SIZES.join(', ')}`;
    }

    return null;
  };

  const processFile = async (file: File) => {
    try {
      setError(null);

      const fileType = file.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls'].includes(fileType || '')) {
        setError('Please upload a valid Excel file (.xlsx or .xls)');
        return;
      }

      const data = await file.arrayBuffer();
      const workbook = read(data);
      
      if (!workbook.SheetNames.length) {
        setError('The Excel file is empty');
        return;
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = utils.sheet_to_json(worksheet, { raw: false });

      if (rows.length === 0) {
        setError('No data found in the Excel file');
        return;
      }

      // Skip header row if present
      const dataRows = rows[0]['Company Name'] === TEMPLATE_HEADERS[0] ? rows.slice(1) : rows;

      // Validate headers
      const headers = Object.keys(dataRows[0] || {});
      const missingHeaders = TEMPLATE_HEADERS.filter(header => !headers.includes(header));
      if (missingHeaders.length > 0) {
        setError(`Missing required columns: ${missingHeaders.join(', ')}`);
        return;
      }

      // Validate each row
      for (let i = 0; i < dataRows.length; i++) {
        const validationError = validateRow(dataRows[i], i + 1);
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      // Transform and insert data
      const applications = dataRows.map((row: any) => ({
        student_id: user?.id,
        company_name: row['Company Name'].trim(),
        position_title: row['Position Title'].trim(),
        application_date: row['Application Date'],
        source: row.Source?.trim() || null,
        status: (row.Status?.toLowerCase() || 'draft') as string,
        location: row.Location?.trim() || null,
        work_type: row['Work Type']?.toLowerCase() || null,
        company_size: row['Company Size']?.toLowerCase() || null,
        application_url: row['Application URL']?.trim() || null,
        company_url: row['Company URL']?.trim() || null,
        job_description: row['Job Description']?.trim() || null,
        notes: row.Notes?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('job_applications')
        .insert(applications);

      if (insertError) throw insertError;

      // Add initial status history for each application
      const { data: insertedApps, error: fetchError } = await supabase
        .from('job_applications')
        .select('id, status')
        .in('company_name', applications.map(a => a.company_name))
        .in('position_title', applications.map(a => a.position_title))
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(applications.length);

      if (fetchError) throw fetchError;

      const statusHistory = insertedApps.map(app => ({
        application_id: app.id,
        status: app.status,
        notes: 'Initial status from batch import',
        created_at: new Date().toISOString()
      }));

      const { error: historyError } = await supabase
        .from('application_status_history')
        .insert(statusHistory);

      if (historyError) throw historyError;

      addToast(`Successfully imported ${applications.length} applications`, 'success');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err instanceof Error ? err.message : 'Failed to process the Excel file');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Import Applications</h3>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="mb-4">
                  <button
                    onClick={downloadTemplate}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download Template
                  </button>
                  <p className="mt-2 text-sm text-gray-500">
                    Download and fill out the template before importing your applications.
                  </p>
                </div>

                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center ${
                    isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls"
                    className="hidden"
                  />
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Select File
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    or drag and drop your Excel file here
                  </p>
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 rounded-md">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}