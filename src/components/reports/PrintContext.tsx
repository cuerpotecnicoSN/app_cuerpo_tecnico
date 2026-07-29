import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface PrintContextType {
  printReport: (content: ReactNode) => void;
}

const PrintContext = createContext<PrintContextType | undefined>(undefined);

export const usePrint = () => {
  const context = useContext(PrintContext);
  if (!context) throw new Error("usePrint must be used within a PrintProvider");
  return context;
};

export const PrintProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const [printContent, setPrintContent] = useState<ReactNode | null>(null);

  const printReport = (content: ReactNode) => {
    setPrintContent(content);
    setTimeout(() => {
      window.print();
      // Limpiamos después de imprimir (opcional, o añadir botón de volver)
      // setTimeout(() => setPrintContent(null), 1000);
    }, 500);
  };

  const clearPrint = () => setPrintContent(null);

  return (
    <PrintContext.Provider value={{ printReport }}>
      {children}
      {printContent && (
        <div id="print-root" className="print-only">
          <div className="absolute top-4 right-4 print:hidden flex gap-2">
            <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg font-bold">{t('reports.print.printButton')}</button>
            <button onClick={clearPrint} className="bg-slate-700 text-white px-4 py-2 rounded-lg shadow-lg font-bold">{t('reports.print.closeReport')}</button>
          </div>
          {printContent}
        </div>
      )}
    </PrintContext.Provider>
  );
};
