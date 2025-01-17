import React, { useState, useRef } from 'react';
import { X, Upload, Download, AlertCircle } from 'lucide-react';
import { read, utils, writeFileXLSX } from 'xlsx';
import type { UserRole } from '../types';

interface ImportUsersModalProps {
  onClose: () => void;
  onImport: (users: {
    email: string;
    full_name: string;
    role: UserRole;
    password: string;
  }[]) => void;
}

const REQUIRED_HEADERS = [
  'Email',
  'Full Name',
  'Role',
  'Password',
];

const TEMPLATE_HEADERS = [
  ...REQUIRED_HEADERS,
  // Student fields
  'Student: Program Start Date',
  'Student: Expected End Date',
  'Student: Program Type',
  'Student: School',
  'Student: School Graduation Date',
  'Student: LinkedIn URL',
  'Student: Facebook URL',
  'Student: Phone',
  'Student: Major',
  'Student: Timezone',
  'Student: Parent Name',
  'Student: Parent Phone',
  'Student: Parent Email',
  // Mentor fields
  'Mentor: LinkedIn URL',
  'Mentor: Bio',
  'Mentor: Company',
  'Mentor: Internal Note',
];

const VALID_ROLES: UserRole[] = ['student', 'coach', 'mentor', 'admin'];

export function ImportUsersModal({ onClose, onImport }: ImportUsersModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const templateData = [
      TEMPLATE_HEADERS,
      // Student example
      [
        'student@example.com',
        'Student Name',
        'student',
        'Password123!',
        '2024-01-15', // Program Start Date
        '2024-12-15', // Expected End Date
        'Standard',
        'University of Technology',
        '2023-05-15',
        'https://linkedin.com/in/student',
        'https://facebook.com/student',
        '+1234567890',
        'Computer Science',
        'UTC-5',
        'Parent Name',
        '+1234567890',
        'parent@example.com',
        '', '', '', '', // Empty mentor fields
      ],
      // Mentor example
      [
        'mentor@example.com',
        'Mentor Name',
        'mentor',
        'Password123!',
        '', '', '', '', '', '', '', '', '', '', '', '', '', // Empty student fields
        'https://linkedin.com/in/mentor',
        'Experienced software engineer with 10+ years in web development',
        'Tech Corp',
        'Mentor in Canada',
      ]
    ];

    const ws = utils.aoa_to_sheet(templateData);
    const colWidths = [
      { wch: 25 },  // Email
      { wch: 20 },  // Full Name
      { wch: 10 },  // Role
      { wch: 15 },  // Password
      { wch: 15 },  // Program Start Date
      { wch: 15 },  // Expected End Date
      { wch: 20 },  // Program Type
      { wch: 25 },  // School
      { wch: 15 },  // School Graduation Date
      { wch: 30 },  // LinkedIn URL
      { wch: 30 },  // Facebook URL
      { wch: 15 },  // Phone
      { wch: 30 },  // Facebook URL
      { wch: 15 },  // Phone
      { wch: 20 },  // Major
      { wch: 10 },  // Timezone
      { wch: 20 },  // Parent Name
      { wch: 15 },  // Parent Phone
      { wch: 25 },  // Parent Email
      { wch: 30 },  // Mentor LinkedIn URL
      { wch: 40 },  // Mentor Bio
      { wch: 25 },  // Mentor Company
      { wch: 25 },  // Internal Note
    ];
    ws['!cols'] = colWidths;

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Users Template');
    writeFileXLSX(wb, 'user-import-template.xlsx');
  };

  const validateRow = (row: any, rowIndex: number): string | null => {
    if (!row.Email?.trim()) return `Row ${rowIndex}: Email is required`;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.Email)) {
      return `Row ${rowIndex}: Invalid email format`;
    }
    
    if (!row['Full Name']?.trim()) return `Row ${rowIndex}: Full Name is required`;
    
    if (!row.Role) return `Row ${rowIndex}: Role is required`;
    const role = row.Role.toString().toLowerCase();
    if (!VALID_ROLES.includes(role as UserRole)) {
      return `Row ${rowIndex}: Invalid role "${row.Role}". Must be one of: ${VALID_ROLES.join(', ')}`;
    }

    if (!row.Password?.trim()) return `Row ${rowIndex}: Password is required`;
    if (row.Password.length < 8) {
      return `Row ${rowIndex}: Password must be at least 8 characters long`;
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
      const dataRows = rows[0]['Email'] === TEMPLATE_HEADERS[0] ? rows.slice(1) : rows;

      // Validate required headers
      const headers = Object.keys(dataRows[0] || {});
      const missingHeaders = REQUIRED_HEADERS.filter(header => !headers.includes(header));
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

      // Transform data
      const users = dataRows.map((row: any) => ({
        email: row.Email.trim(),
        full_name: row['Full Name'].trim(),
        role: row.Role.toLowerCase() as UserRole,
        password: row.Password.trim(),
      }));

      onImport(users);
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
                  <h3 className="text-lg font-medium text-gray-900">Import Users</h3>
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
                    Download and fill out the template before importing your users.
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