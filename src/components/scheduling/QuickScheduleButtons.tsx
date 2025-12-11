import { useScheduleTemplates } from '../../hooks/useScheduleTemplates';
import type { ScheduleTemplate, TemplateConfig } from '../../types/scheduling';

interface QuickScheduleButtonsProps {
  onLoadTemplate: (config: TemplateConfig) => void;
}

export function QuickScheduleButtons({ onLoadTemplate }: QuickScheduleButtonsProps) {
  const { templates, isLoading, deleteTemplate } = useScheduleTemplates();

  const handleLoadTemplate = (template: ScheduleTemplate) => {
    onLoadTemplate(template.config);
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm('Delete this template?')) {
      await deleteTemplate(templateId);
    }
  };

  if (isLoading) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">Loading templates...</p>
    );
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-4">
        No saved templates yet. Fill in the form and click "Save as Template" to create one.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map(template => (
        <div
          key={template.id}
          className="relative p-4 bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-md rounded-xl transition-all cursor-pointer"
          onClick={() => handleLoadTemplate(template)}
        >
          {/* Delete button - always visible */}
          <button
            type="button"
            onClick={(e) => handleDeleteTemplate(e, template.id)}
            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            title="Delete template"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <p className="font-medium text-gray-900 pr-8">{template.name}</p>
          <p className="text-sm text-gray-500 mt-1">
            {template.config.duration} min · {template.config.searchWindowDays} days
          </p>
          {template.config.meetingPurpose && (
            <p className="text-xs text-gray-400 mt-1 truncate">
              {template.config.meetingPurpose}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default QuickScheduleButtons;
