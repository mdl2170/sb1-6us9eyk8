import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToastStore } from '../../stores/useToastStore';
import { Trash2 } from 'lucide-react';

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
  next_follow_up_date: string;
  linkedin_url: string;
  email: string;
  phone: string;
  notes: string;
}

interface NetworkingFormProps {
  interaction?: NetworkingInteraction | null;
  onSave: () => void;
  onCancel: () => void;
}

export function NetworkingForm({ interaction, onSave, onCancel }: NetworkingFormProps) {
  const { user } = useAuth();
  const { addToast } = useToastStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<Partial<NetworkingInteraction>>(
    interaction || {
      interaction_date: new Date().toISOString().split('T')[0],
      interaction_type: 'industry_professional',
      interaction_method: 'linkedin'
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const interactionData = {
        ...formData,
        student_id: user.id,
        updated_at: new Date().toISOString()
      };

      if (interaction) {
        const { error } = await supabase
          .from('networking_interactions')
          .update(interactionData)
          .eq('id', interaction.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('networking_interactions')
          .insert([interactionData]);

        if (error) throw error;
      }

      addToast(
        `Networking interaction ${interaction ? 'updated' : 'created'} successfully`,
        'success'
      );
      onSave();
    } catch (error) {
      console.error('Error saving networking interaction:', error);
      addToast(
        `Failed to ${interaction ? 'update' : 'create'} networking interaction`,
        'error'
      );
    }
  };

  const handleDelete = async () => {
    if (!user || !interaction) return;
    
    if (!window.confirm('Are you sure you want to delete this networking interaction? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      
      // Delete the interaction
      const { error } = await supabase
        .from('networking_interactions')
        .delete()
        .eq('id', interaction.id)
        .eq('student_id', user.id);

      if (error) throw error;

      addToast('Networking interaction deleted successfully', 'success');
      onSave();
      onCancel();
    } catch (error) {
      console.error('Error deleting networking interaction:', error);
      addToast('Failed to delete networking interaction', 'error');
    } finally {
      setIsDeleting(false);
    } 
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {interaction ? 'Edit Interaction' : 'New Interaction'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {interaction
                ? 'Update the details of your networking interaction'
                : 'Record a new networking interaction'}
            </p>
          </div>

          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Contact Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.contact_name || ''}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Company
                </label>
                <input
                  type="text"
                  value={formData.company || ''}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <input
                  type="text"
                  value={formData.role || ''}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Interaction Type
                </label>
                <select
                  required
                  value={formData.interaction_type || 'industry_professional'}
                  onChange={(e) => setFormData({ ...formData, interaction_type: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="alumni">Alumni</option>
                  <option value="industry_professional">Industry Professional</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Interaction Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.interaction_date || ''}
                  onChange={(e) => setFormData({ ...formData, interaction_date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Interaction Method
                </label>
                <select
                  required
                  value={formData.interaction_method || 'linkedin'}
                  onChange={(e) => setFormData({ ...formData, interaction_method: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="linkedin">LinkedIn</option>
                  <option value="email">Email</option>
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="event">Event</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="col-span-6">
                <label className="block text-sm font-medium text-gray-700">
                  Discussion Points
                </label>
                <textarea
                  rows={3}
                  value={formData.discussion_points || ''}
                  onChange={(e) => setFormData({ ...formData, discussion_points: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-6">
                <label className="block text-sm font-medium text-gray-700">
                  Follow-up Items
                </label>
                <textarea
                  rows={3}
                  value={formData.follow_up_items || ''}
                  onChange={(e) => setFormData({ ...formData, follow_up_items: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-6">
                <label className="block text-sm font-medium text-gray-700">
                  Next Steps
                </label>
                <textarea
                  rows={3}
                  value={formData.next_steps || ''}
                  onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Next Follow-up Date
                </label>
                <input
                  type="date"
                  value={formData.next_follow_up_date || ''}
                  onChange={(e) => setFormData({ ...formData, next_follow_up_date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={formData.linkedin_url || ''}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        {interaction && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete Interaction'}
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {interaction ? 'Update' : 'Create'} Interaction
        </button>
      </div>
    </form>
  );
}