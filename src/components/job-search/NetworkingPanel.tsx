import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToastStore } from '../../stores/useToastStore';
import { Plus, Search, Filter, ChevronDown, Calendar, Link, Mail, Phone, Upload } from 'lucide-react';
import { NetworkingForm } from './NetworkingForm';
import { ImportNetworkingModal } from './ImportNetworkingModal';

interface NetworkingPanelProps {
  studentId?: string;
}

interface NetworkingInteraction {
  id: string;
  contact_name: string;
  company: string;
  role: string;
  interaction_type: string;
  interaction_date: string;
  interaction_method: string;
  discussion_points: string;
  follow_up_items: string;
  next_steps: string;
  next_follow_up_date: string | null;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;
}

export function NetworkingPanel({ studentId }: NetworkingPanelProps) {
  const { user } = useAuth();
  const { addToast } = useToastStore();
  const [interactions, setInteractions] = useState<NetworkingInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedInteraction, setSelectedInteraction] = useState<NetworkingInteraction | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadInteractions();
  }, [studentId]);

  async function loadInteractions() {
    try {
      const { data, error } = await supabase
        .from('networking_interactions')
        .select('*')
        .eq('student_id', studentId)
        .order('interaction_date', { ascending: false });

      if (error) throw error;

      setInteractions(data || []);
    } catch (error) {
      console.error('Error loading networking interactions:', error);
      addToast('Failed to load networking interactions', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  const filteredInteractions = interactions.filter(interaction => {
    const matchesSearch = (
      interaction.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interaction.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interaction.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const matchesType = typeFilter === 'all' || interaction.interaction_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleInteractionSaved = () => {
    setShowForm(false);
    setSelectedInteraction(null);
    loadInteractions();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      {showForm ? (
        <NetworkingForm
          interaction={selectedInteraction}
          onSave={handleInteractionSaved}
          onCancel={() => {
            setShowForm(false);
            setSelectedInteraction(null);
          }}
        />
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                >
                  <option value="all">All Types</option>
                  <option value="alumni">Alumni</option>
                  <option value="industry_professional">Industry Professional</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="other">Other</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Upload className="h-5 w-5 mr-2" />
                Import
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Interaction
              </button>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredInteractions.length === 0 ? (
                <li className="px-6 py-4 text-center text-gray-500">
                  No networking interactions found
                </li>
              ) : (
                filteredInteractions.map((interaction) => (
                  <li
                    key={interaction.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedInteraction(interaction);
                      setShowForm(true);
                    }}
                  >
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {interaction.contact_name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {interaction.role} {interaction.company ? `at ${interaction.company}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {interaction.linkedin_url && (
                            <a
                              href={interaction.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-400 hover:text-gray-500"
                            >
                              <Link className="h-5 w-5" />
                            </a>
                          )}
                          {interaction.email && (
                            <a
                              href={`mailto:${interaction.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-400 hover:text-gray-500"
                            >
                              <Mail className="h-5 w-5" />
                            </a>
                          )}
                          {interaction.phone && (
                            <a
                              href={`tel:${interaction.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-400 hover:text-gray-500"
                            >
                              <Phone className="h-5 w-5" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                            {new Date(interaction.interaction_date).toLocaleDateString()}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <span className="capitalize">{interaction.interaction_method}</span>
                          </p>
                        </div>
                        {interaction.next_follow_up_date && (
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            Follow-up: {new Date(interaction.next_follow_up_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
      
      {showImportModal && (
        <ImportNetworkingModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            loadInteractions();
          }}
        />
      )}
    </div>
  );
}