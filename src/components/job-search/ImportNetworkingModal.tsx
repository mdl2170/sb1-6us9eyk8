import React, { useState, useRef } from 'react';
import { X, Upload, Download, AlertCircle } from 'lucide-react';
import { read, utils, writeFileXLSX } from 'xlsx';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToastStore } from '../../stores/useToastStore';

interface ImportNetworkingModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const TEMPLATE_HEADERS = [
  'Contact Name',
  'Company',
  'Role',
  'Interaction Type',
  'Interaction Date',
  'Interaction Method',
  'Discussion Points',
  'Follow Up Items',
  'Next Steps',
  'Next Follow Up Date',
  'LinkedIn URL',
  'Email',
  'Phone',
  'Notes'
];

const VALID_INTERACTION_TYPES = ['alumni', 'industry_professional', 'recruiter', 'other'];
const VALID_INTERACTION_METHODS = ['linkedin', 'email', 'event', 'call', 'meeting', 'other'];

export function ImportNetworkingModal({ onClose, onSuccess }: ImportNetworkingModalProps) {
  const { user } = useAuth();
  const { addToast } = useToastStore();
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const templateData = [
      TEMPLATE_HEADERS,
      [
        'John Doe',
        'Tech Corp',
        'Senior Engineer',
        'industry_professional',
        '2024-02-11',
        'linkedin',
        'Discussed career opportunities',
        'Send resume',
        'Schedule follow-up call',
        '2024-02-25',
        'https://linkedin.com/in/johndoe',
        'john@example.com',
        '123-456-7890',
        'Met at tech conference'
      ]
    ];

    const ws = utils.aoa_to_sheet(templateData);
    const colWidths = [
      { wch: 20 }, // Contact Name
      { wch: 20 }, // Company
      { wch: 20 }, // Role
      { wch: 20 }, // Interaction Type
      { wch: 12 }, // Interaction Date
      { wch: 15 }, // Interaction Method
      { wch: 40 }, // Discussion Points
      { wch: 40 }, // Follow Up Items
      { wch: 40 }, // Next Steps
      { wch: 12 }, // Next Follow Up Date
      { wch: 30 }, // LinkedIn URL
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 40 }  // Notes
    ];
    ws['!cols'] = colWidths;

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Networking Template');
    writeFileXLSX(wb, 'networking-import-template.xlsx');
  };

  const validateRow = (row: any, rowIndex: number): string | null => {
    if (!row['Contact Name']?.trim()) return `Row ${rowIndex}: Contact Name is required`;
    if (!row['Interaction Date']) return `Row ${rowIndex}: Interaction Date is required`;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row['Interaction Date'])) {
      return `Row ${rowIndex}: Invalid date format for Interaction Date. Use YYYY-MM-DD`;
    }

    // Validate next follow up date if present
    if (row['Next Follow Up Date'] && !/^\d{4}-\d{2}-\d{2}$/.test(row['Next Follow Up Date'])) {
      return `Row ${rowIndex}: Invalid date format for Next Follow Up Date. Use YYYY-MM-DD`;
    }

    // Validate interaction type
    if (!row['Interaction Type'] || !VALID_INTERACTION_TYPES.includes(row['Interaction Type'].toLowerCase())) {
      return `Row ${rowIndex}: Invalid interaction type "${row['Interaction Type']}". Must be one of: ${VALID_INTERACTION_TYPES.join(', ')}`;
    }

    // Validate interaction method
    if (!row['Interaction Method'] || !VALID_INTERACTION_METHODS.includes(row['Interaction Method'].toLowerCase())) {
      return `Row ${rowIndex}: Invalid interaction method "${row['Interaction Method']}". Must be one of: ${VALID_INTERACTION_METHODS.join(', ')}`;
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
      const dataRows = rows[0]['Contact Name'] === TEMPLATE_HEADERS[0] ? rows.slice(1) : rows;

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
      const interactions = dataRows.map((row: any) => ({
        student_id: user?.id,
        contact_name: row['Contact Name'].trim(),
        company: row.Company?.trim() || null,
        role: row.Role?.trim() || null,
        interaction_type: row['Interaction Type'].toLowerCase(),
        interaction_date: row['Interaction Date'],
        interaction_method: row['Interaction Method'].toLowerCase(),
        discussion_points: row['Discussion Points']?.trim() || null,
        follow_up_items: row['Follow Up Items']?.trim() || null,
        next_steps: row['Next Steps']?.trim() || null,
        next_follow_up_date: row['Next Follow Up Date'] || null,
        linkedin_url: row['LinkedIn URL']?.trim() || null,
        email: row.Email?.trim() || null,
        phone: row.Phone?.trim() || null,
        notes: row.Notes?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('networking_interactions')
        .insert(interactions);

      if (insertError) throw insertError;

      addToast(`Successfully imported ${interactions.length} networking interactions`, 'success');
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
                  <h3 className="text-lg font-medium text-gray-900">Import Networking Interactions</h3>
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
                    Download and fill out the template before importing your networking interactions.
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