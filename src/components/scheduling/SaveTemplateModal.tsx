import { useState } from 'react';
import { useScheduleTemplates } from '../../hooks/useScheduleTemplates';
import type { TemplateConfig } from '../../types/scheduling';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: TemplateConfig;
}

export function SaveTemplateModal({ isOpen, onClose, currentConfig }: SaveTemplateModalProps) {
  const { createTemplate } = useScheduleTemplates();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a template name');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await createTemplate(trimmedName, currentConfig);
      setName('');
      onClose();
    } catch (err) {
      if (err instanceof Error && err.message.includes('unique_user_template_name')) {
        setError('A template with this name already exists');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save template');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSaving) {
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-template-title"
      >
        <h2 id="save-template-title" className="text-lg font-semibold text-slate-800 mb-4">
          Save as Template
        </h2>

        <p className="text-sm text-slate-600 mb-4">
          Save your current scheduling configuration as a reusable template.
        </p>

        {error && (
          <div className="mb-4 p-3 text-sm bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="template-name" className="block text-sm font-medium text-slate-700 mb-1">
            Template Name
          </label>
          <input
            id="template-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Weekly 1:1, Team Standup"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            autoFocus
            disabled={isSaving}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SaveTemplateModal;
