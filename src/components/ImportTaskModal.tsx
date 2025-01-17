import React, { useState, useRef } from 'react';
import { X, Upload, Download, AlertCircle } from 'lucide-react';
import { read, utils, writeFileXLSX } from 'xlsx';
import type { Task, TaskGroup } from '../types';

interface ImportTaskModalProps {
  onClose: () => void;
  onImport: (tasks: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'subtasks' | 'resources'>[]) => void;
  groups: TaskGroup[];
}

const TEMPLATE_HEADERS = [
  'Title',
  'Description',
  'Priority',
  'Status',
  'Due Date',
  'Tags',
  'Group Name',
];

const VALID_PRIORITIES = ['low', 'medium', 'high'];
const VALID_STATUSES = ['pending', 'in_progress', 'completed'];

export function ImportTaskModal({ onClose, onImport, groups }: ImportTaskModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const templateData = [
      TEMPLATE_HEADERS,
      [
        'Learn React Basics',
        'Complete fundamental React concepts and hooks',
        'high',
        'pending',
        '2024-12-31',
        'react,frontend,learning',
        groups[0]?.title || 'Technical Training',
      ],
      [
        'Database Design Project',
        'Design and implement database schema',
        'medium',
        'in_progress',
        '2024-11-30',
        'database,backend',
        groups[0]?.title || 'Technical Training',
      ]
    ];

    const ws = utils.aoa_to_sheet(templateData);
    const colWidths = [
      { wch: 20 },
      { wch: 40 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 15 },
    ];
    ws['!cols'] = colWidths;

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Tasks Template');
    writeFileXLSX(wb, 'task-import-template.xlsx');
  };

  const validateRow = (row: any, rowIndex: number): string | null => {
    if (!row.Title?.trim()) return `Row ${rowIndex}: Title is required`;
    
    if (!row.Priority) return `Row ${rowIndex}: Priority is required`;
    const priority = row.Priority.toString().toLowerCase();
    if (!VALID_PRIORITIES.includes(priority)) {
      return `Row ${rowIndex}: Invalid priority "${row.Priority}". Must be one of: ${VALID_PRIORITIES.join(', ')}`;
    }

    if (!row.Status) return `Row ${rowIndex}: Status is required`;
    const status = row.Status.toString().toLowerCase();
    if (!VALID_STATUSES.includes(status)) {
      return `Row ${rowIndex}: Invalid status "${row.Status}". Must be one of: ${VALID_STATUSES.join(', ')}`;
    }

    if (row['Due Date'] && !/^\d{4}-\d{2}-\d{2}$/.test(row['Due Date'])) {
      return `Row ${rowIndex}: Invalid date format for "${row['Due Date']}". Use YYYY-MM-DD`;
    }

    if (!row['Group Name']?.trim()) return `Row ${rowIndex}: Group Name is required`;

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
      const dataRows = rows[0]['Title'] === TEMPLATE_HEADERS[0] ? rows.slice(1) : rows;

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

      // Create a map of group names to group IDs
      const groupMap = new Map(groups.map(g => [g.title.toLowerCase(), g.id]));

      // Transform data to match Task type
      const tasks = dataRows.map((row: any) => {
        const groupName = row['Group Name'].trim();
        const groupId = groupMap.get(groupName.toLowerCase()) || groups[0]?.id;

        if (!groupId) {
          throw new Error(`Group "${groupName}" not found`);
        }

        return {
          title: row.Title.trim(),
          description: row.Description?.trim() || '',
          priority: row.Priority.toLowerCase(),
          status: row.Status.toLowerCase(),
          due_date: row['Due Date'] || undefined,
          tags: row.Tags ? row.Tags.split(',').map((tag: string) => tag.trim()) : [],
          groupId,
        };
      });

      onImport(tasks);
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
                  <h3 className="text-lg font-medium text-gray-900">Import Tasks</h3>
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
                    Download and fill out the template before importing your tasks.
                    Make sure to use existing group names.
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