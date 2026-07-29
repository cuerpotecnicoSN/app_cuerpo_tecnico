import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { jsPDF } from 'jspdf';
import { Plus, Download, Construction } from 'lucide-react';
import './PlaceholderSection.css';

interface PlaceholderSectionProps {
  title: string;
  breadcrumb: string;
}

const PlaceholderSection: React.FC<PlaceholderSectionProps> = ({ title, breadcrumb }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [items, setItems] = useState<string[]>([]);

  const handleCreate = () => {
    const name = window.prompt(t('placeholder.promptNewItem', { title }));
    if (name && name.trim()) {
      setItems((prev) => [...prev, name.trim()]);
    }
  };

  const handleExport = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(title, 14, 20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(breadcrumb, 14, 28);
    doc.setDrawColor(219, 0, 48);
    doc.line(14, 32, 196, 32);

    if (items.length === 0) {
      doc.text(t('placeholder.noItemsPdf'), 14, 44);
    } else {
      let y = 44;
      items.forEach((item, i) => {
        doc.text(`${i + 1}. ${item}`, 14, y);
        y += 8;
      });
    }

    doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <div className="placeholder-section animate-fade-in">
      <div className="placeholder-header">
        <div>
          <p className="placeholder-breadcrumb">{breadcrumb}</p>
          <h1 className="placeholder-title">{title}</h1>
        </div>
        <div className="placeholder-actions">
          <button className="btn btn-outline" onClick={handleExport}>
            <Download size={16} />
            {t('placeholder.exportPdf')}
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={16} />
            {t('placeholder.createNew')}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="placeholder-empty card">
          <Construction size={32} className="text-muted" />
          <p className="h3 mt-4">{t('placeholder.emptyTitle')}</p>
          <p className="text-muted mt-2" style={{ maxWidth: '420px' }}>
            {t('placeholder.emptyDescriptionPre')} <strong>{title}</strong> {t('placeholder.emptyDescriptionPost')}
          </p>
          <p className="text-xs text-muted mt-4" style={{ opacity: 0.6 }}>{location.pathname}</p>
        </div>
      ) : (
        <ul className="placeholder-list">
          {items.map((item, i) => (
            <li key={i} className="card placeholder-list-item">
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PlaceholderSection;
