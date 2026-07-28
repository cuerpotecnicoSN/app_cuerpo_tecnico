import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check, AlertCircle, ImagePlus, Eraser, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ensureContext } from '../../lib/dataService';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface PlayerImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
  playerToEdit?: any;
}

export default function PlayerImportModal({ onClose, onSuccess, playerToEdit }: PlayerImportModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10
  });
  const imgRef = useRef<HTMLImageElement>(null);
  
  const [formData, setFormData] = useState<any>({
    first_name: playerToEdit?.first_name || '',
    last_name: playerToEdit?.last_name || '',
    main_position: playerToEdit?.main_position || '',
    nationality: playerToEdit?.nationality || '',
    height_cm: playerToEdit?.height_cm || 0,
    weight_kg: playerToEdit?.weight_kg || 0,
    kit_number: playerToEdit?.kit_number || 0,
    dominant_foot: playerToEdit?.dominant_foot || '',
    photo_url: playerToEdit?.photo_url || '',
    birth_date: playerToEdit?.birth_date || '',
    market_value: playerToEdit?.market_value || '',
    history: playerToEdit?.history || '',
    current_club: playerToEdit?.current_club || '',
    birth_place: playerToEdit?.birth_place || '',
    birth_place_flag: playerToEdit?.birth_place_flag || ''
  });

  const scrapeExternalData = async () => {
    if (!url.includes('besoccer.es/jugador/') && !url.includes('transfermarkt.')) {
      setError('Por favor, introduce un enlace válido de BeSoccer o Transfermarkt');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      let textHtml = '';
      let isTransfermarkt = url.includes('transfermarkt.');

      if (isTransfermarkt) {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error('status-not-ok');
          textHtml = await response.text();
          if (!textHtml.includes('data-header__headline-wrapper')) throw new Error('blocked-content');
        } catch {
          const proxyResponse = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
          if (!proxyResponse.ok) throw new Error('Transfermarkt bloqueó la petición (protección anti-bots). Prueba de nuevo en unos segundos.');
          textHtml = await proxyResponse.text();
        }
      } else {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Error al conectar con BeSoccer');
        textHtml = await response.text();
      }
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(textHtml, 'text/html');

      let firstName = '';
      let lastName = '';
      let age = 0;
      let weight = 0;
      let height = 0;
      let kitNumber = 0;
      let position = 'Sin definir';
      let nationality = '';
      let foot = '';
      let photoUrl = '';
      let birthDate = '';
      let marketValue = '';
      let historyText = '';
      let currentClub = '';
      let birthPlace = '';
      let birthPlaceFlag = '';
      let careerClubs: { club: string; seasons: string; matches: number; goals: number; assists: number; logo?: string }[] = [];

      if (isTransfermarkt) {
        let fullName = doc.querySelector('h1.data-header__headline-wrapper')?.textContent?.replace(/[\n\t]/g, '')?.trim() || '';
        fullName = fullName.replace(/\s{2,}/g, ' '); 
        if (!fullName) throw new Error('No se pudo leer la página de Transfermarkt. (Protección anti-bots o URL inválida)');
        
        const parts = fullName.split(' ');
        if (parts.length > 0) {
           firstName = parts[0];
           lastName = parts.slice(1).join(' ');
        }

        const imgEl = doc.querySelector('.data-header__profile-image');
        if (imgEl && (imgEl as HTMLImageElement).src) {
          photoUrl = (imgEl as HTMLImageElement).src;
        }

        const regularItems = Array.from(doc.querySelectorAll('.info-table__content--regular'));
        const boldItems = Array.from(doc.querySelectorAll('.info-table__content--bold'));
        
        regularItems.forEach((labelEl, index) => {
          const label = labelEl.textContent?.trim().toLowerCase() || '';
          const valueEl = boldItems[index];
          const value = valueEl ? valueEl.textContent?.trim().replace(/[\n\t]/g, '').trim() : '';

          if ((label.includes('edad') || label.includes('nacim')) && value) {
             const mAge = value.match(/\((\d+)\)/);
             if (mAge) age = parseInt(mAge[1]) || 0;
             const mDate = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
             if (mDate) birthDate = `${mDate[3]}-${mDate[2]}-${mDate[1]}`;
          }
          if (label.includes('altura') && value) {
             const m = value.match(/(\d)[.,](\d{2})/);
             if (m) height = parseInt(m[1] + m[2]);
          }
          if ((label.includes('nacionalidad') || label.includes('ciudadanía')) && value) {
             nationality = value.replace(/&nbsp;/g, ' ').trim();
          }
          if (label.includes('pie') && value) {
             const fLow = value.toLowerCase();
             if (fLow.includes('derecho')) foot = 'Derecho';
             if (fLow.includes('izquierdo')) foot = 'Izquierdo';
             if (fLow.includes('ambidiestro')) foot = 'Ambidiestro';
          }
          if (label.includes('lugar de nac') && valueEl) {
             const flagImg = valueEl.querySelector('img');
             if (flagImg) {
                birthPlaceFlag = flagImg.getAttribute('data-src') || flagImg.getAttribute('src') || '';
             }
             const clone = valueEl.cloneNode(true) as HTMLElement;
             clone.querySelectorAll('img').forEach(img => img.remove());
             birthPlace = (clone.textContent || '').replace(/&nbsp;/g, ' ').replace(/\s{2,}/g, ' ').trim();
          }
        });

        if (!nationality) {
          const flagImg = doc.querySelector('.data-header__nationality img, .info-table img[alt]') as HTMLImageElement | null;
          if (flagImg?.alt) nationality = flagImg.alt;
        }

        const posTitle = Array.from(doc.querySelectorAll('.detail-position__title')).find(el => el.textContent?.toLowerCase().includes('principal'));
        if (posTitle && posTitle.nextElementSibling) {
            const posValue = posTitle.nextElementSibling.textContent?.trim() || '';
            const posLow = posValue.toLowerCase();
            if (posLow.includes('delantero') || posLow.includes('extremo')) position = 'Delantero';
            else if (posLow.includes('medio') || posLow.includes('interior') || posLow.includes('pivote')) position = 'Centrocampista';
            else if (posLow.includes('defensa') || posLow.includes('lateral')) position = 'Defensa';
            else if (posLow.includes('portero')) position = 'Portero';
            else position = posValue;
        }

        const marketEl = doc.querySelector('.data-header__market-value-wrapper');
        if (marketEl) {
           marketValue = (marketEl.textContent || '')
             .split('Última revisión')[0]
             .replace(/\s{2,}/g, ' ')
             .trim();
        }

        const clubEl = doc.querySelector('.data-header__club');
        if (clubEl) {
           currentClub = clubEl.textContent?.trim() || '';
        }

        const additionalDataHeadline = Array.from(doc.querySelectorAll('.content-box-headline'))
          .find(el => el.textContent?.trim().toLowerCase().includes('clubes juveniles'));
        if (additionalDataHeadline) {
          const contentEl = additionalDataHeadline.parentElement?.querySelector('.content')
            || additionalDataHeadline.nextElementSibling;
          const clubsText = contentEl?.textContent?.trim().replace(/\s{2,}/g, ' ') || '';
          if (clubsText) {
            const matches = Array.from(clubsText.matchAll(/([^,()]+)\(([^)]+)\)/g));
            careerClubs = matches.map(m => ({
              club: m[1].trim(),
              seasons: m[2].trim(),
              matches: 0,
              goals: 0,
              assists: 0
            }));
            historyText = careerClubs.map(c => `${c.seasons}: ${c.club}`).join(' ➔ ');
          }
        }

        const headerSection = Array.from(doc.querySelectorAll('section')).find(sec => {
            const divs = sec.querySelectorAll(':scope > div');
            return divs.length >= 4 && divs[0].textContent?.trim() === 'Temporada';
        });

        if (headerSection && headerSection.parentElement) {
            const allSections = Array.from(headerSection.parentElement.querySelectorAll('section'));
            const rows = allSections.filter(sec => sec !== headerSection && sec.querySelectorAll(':scope > div').length >= 4);
            const parsedClubs = [];
            
            for (const row of rows) {
                const divs = row.querySelectorAll(':scope > div');
                const season = divs[0].textContent?.trim() || '';
                let newClub = divs[3].textContent?.replace(/[\n\t]/g, '')?.replace(/\s{2,}/g, ' ').trim() || '';
                
                const logoImg = divs[3].querySelector('img.logo') as HTMLImageElement;
                const logo = logoImg ? (logoImg.getAttribute('data-src') || logoImg.getAttribute('src') || undefined) : undefined;

                if (season && newClub && season !== 'Temporada') {
                    parsedClubs.push({
                        club: newClub,
                        seasons: season,
                        logo,
                        matches: 0, goals: 0, assists: 0
                    });
                }
            }

            if (parsedClubs.length > 0) {
                careerClubs = parsedClubs;
                historyText = careerClubs.map(c => `${c.seasons}: ${c.club}`).join(' ➔ ');
            }
        }

        const playerIdMatch = url.match(/spieler\/(\d+)/);
        if (playerIdMatch) {
           try {
             const apiUrl = `https://www.transfermarkt.es/ceapi/transferHistory/list/${playerIdMatch[1]}`;
             const proxyApiUrl = `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`;
             const histRes = await fetch(proxyApiUrl, {
                headers: { 'Accept': 'application/json' }
             });
             if (histRes.ok) {
                const histData = await histRes.json();
                if (histData && Array.isArray(histData.transfers) && histData.transfers.length > 0) {
                   const chronological = [...histData.transfers];
                   const trajectory = chronological
                     .filter((t: any) => t.to && t.to.clubName)
                     .map((t: any) => `${t.season}: ${t.to.clubName.trim()}${t.fee && t.fee !== '-' ? ` (${t.fee})` : ''}`)
                     .join(' ➔ ');
                   if (trajectory) historyText = trajectory;

                   const detailedClubs = chronological
                     .filter((t: any) => t.to && t.to.clubName)
                     .map((t: any) => {
                       let logoUrl = t.to['clubEmblem-1x'] || t.to.clubEmblemMobile || undefined;
                       if (logoUrl) {
                          logoUrl = logoUrl.replace('/tiny/', '/medium/');
                       }
                       return {
                         club: t.to.clubName.trim(),
                         seasons: t.season || '',
                         logo: logoUrl,
                         matches: 0,
                         goals: 0,
                         assists: 0
                       };
                     });
                   if (detailedClubs.length > 0) careerClubs = detailedClubs;
                }
             }
           } catch (e) {
             console.warn('No se pudo obtener el historial detallado', e);
           }
        }

      } else {
        const titleEl = doc.querySelector('.panel-title');
        if (!titleEl) {
          throw new Error('BeSoccer ha bloqueado la extracción automática (protección anti-bots).');
        }
        const subtitleEl = doc.querySelector('.panel-subtitle');
        firstName = titleEl?.textContent?.trim() || '';
        lastName = subtitleEl?.textContent?.trim() || '';
        
        if (lastName && firstName && lastName.includes(firstName.split(' ')[0])) {
           const parts = lastName.split(' ');
           firstName = parts[0] + (parts.length > 2 ? ' ' + parts[1] : '');
           lastName = parts.slice(parts.length > 2 ? 2 : 1).join(' ');
        }

        const possibleImages = Array.from(doc.querySelectorAll('img')).filter(img => img.src && (img.src.includes('img_data/players/') || img.src.includes('jugadores/') || img.src.includes('player_images')));
        if (possibleImages.length > 0) {
          photoUrl = possibleImages[0].src;
        }
        
        const statsBlocks = Array.from(doc.querySelectorAll('.stat-list .stat'));
        statsBlocks.forEach(stat => {
          const bigRow = stat.querySelector('.big-row')?.textContent?.trim() || '';
          const smallRows = Array.from(stat.querySelectorAll('.small-row')).map(el => el.textContent?.trim().toLowerCase());
          
          if (smallRows.includes('años')) age = parseInt(bigRow) || 0;
          if (smallRows.includes('kgs')) weight = parseInt(bigRow) || 0;
          if (smallRows.includes('cms')) height = parseInt(bigRow) || 0;
          
          const spanText = stat.querySelector('span')?.textContent?.trim();
          if (smallRows.includes('posición') && spanText) position = spanText;
          if (smallRows.includes('dorsal') && spanText) kitNumber = parseInt(spanText) || 0;
        });

        const flagImg = doc.querySelector('.stat-list img[alt]');
        if (flagImg) nationality = (flagImg as HTMLImageElement).alt || '';

        const tableRows = Array.from(doc.querySelectorAll('.table-row'));
        tableRows.forEach(row => {
          const text = row.textContent || '';
          if (text.includes('Pie preferido')) {
            if (text.toLowerCase().includes('derecho')) foot = 'Derecho';
            if (text.toLowerCase().includes('izquierdo')) foot = 'Izquierdo';
            if (text.toLowerCase().includes('ambidiestro')) foot = 'Ambidiestro';
          }
          if (!nationality && text.includes('País de nacimiento')) {
             const texts = text.split('\n').map(t => t.trim()).filter(Boolean);
             if (texts.length > 1) nationality = texts[texts.length - 1];
          }
        });
      }

      if (age && !birthDate) {
         birthDate = new Date(new Date().setFullYear(new Date().getFullYear() - age)).toISOString().split('T')[0];
      }

      const fullHistory = historyText;

      setFormData({
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        height_cm: height,
        weight_kg: weight,
        kit_number: kitNumber,
        main_position: position === 'DEL' ? 'Delantero' : position === 'MED' ? 'Centrocampista' : position === 'DEF' ? 'Defensa' : position === 'POR' ? 'Portero' : position,
        nationality,
        dominant_foot: foot,
        photo_url: photoUrl,
        market_value: marketValue,
        history: fullHistory,
        current_club: currentClub,
        career_clubs: careerClubs,
        birth_place: birthPlace,
        birth_place_flag: birthPlaceFlag
      });

    } catch (err: any) {
      setError(err.message || 'Error analizando la web');
    } finally {
      setLoading(false);
    }
  };

  const prepareCrop = async (imageSource: string | File) => {
    try {
      setIsRemovingBg(true);
      setError(null);
      if (typeof imageSource === 'string') {
        const proxyUrl = imageSource.startsWith('data:') ? imageSource : `https://corsproxy.io/?${encodeURIComponent(imageSource)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('No se pudo descargar la imagen original');
        const blob = await response.blob();
        setCropImageSrc(URL.createObjectURL(blob));
      } else {
        setCropImageSrc(URL.createObjectURL(imageSource));
      }
    } catch (err: any) {
      console.error(err);
      setError('Error al cargar imagen para recortar: ' + (err.message || 'Desconocido'));
    } finally {
      setIsRemovingBg(false);
    }
  };

  const applyCropAndRemoveBg = () => {
    if (!imgRef.current || !crop.width || !crop.height) {
       setCropImageSrc(null);
       return;
    }
    
    setIsRemovingBg(true);
    setCropImageSrc(null); // Ocultar UI de recorte mientras procesa

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
       setIsRemovingBg(false);
       return;
    }
    
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    );
    
    canvas.toBlob(async (blob) => {
       if (!blob) {
         setIsRemovingBg(false);
         return;
       }
       try {
         const { removeBackground } = await import('@imgly/background-removal');
         const transparentBlob = await removeBackground(blob);

         const img = new Image();
         const objectUrl = URL.createObjectURL(transparentBlob);
         
         const base64Result = await new Promise<string>((resolve, reject) => {
           img.onload = () => {
             URL.revokeObjectURL(objectUrl);
             const outCanvas = document.createElement('canvas');
             
             const MAX_SIZE = 400;
             let width = img.width;
             let height = img.height;
             
             if (width > height && width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
             } else if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
             }

             outCanvas.width = width;
             outCanvas.height = height;

             const outCtx = outCanvas.getContext('2d');
             if (!outCtx) return reject('No canvas context');

             outCtx.fillStyle = '#ffffff';
             outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);
             outCtx.drawImage(img, 0, 0, width, height);

             resolve(outCanvas.toDataURL('image/jpeg', 0.85));
           };
           img.onerror = () => reject('Error al procesar la imagen generada');
           img.src = objectUrl;
         });

         setFormData((prev: any) => ({ ...prev, photo_url: base64Result }));
       } catch (err: any) {
         console.error(err);
         setError('Error al quitar el fondo: ' + (err.message || 'Desconocido'));
       } finally {
         setIsRemovingBg(false);
       }
    }, 'image/png');
  };

  const handleSave = async () => {
    try {
      if (!formData.first_name) {
        setError("El nombre es obligatorio");
        return;
      }
      setLoading(true);
      const seasonId = await ensureContext();

      const isTransfermarktUrl = url.includes('transfermarkt.');
      const { birth_place, birth_place_flag, ...safeFormData } = formData;
      
      const payload = {
        ...safeFormData,
        season_id: seasonId,
        medical_status: 'Alta',
        transfermarkt_url: isTransfermarktUrl ? url : null,
        besoccer_url: url && !isTransfermarktUrl ? url : null
      };

      if (!payload.birth_date) {
        payload.birth_date = null;
      }

      if (playerToEdit?.id) {
        const { error } = await supabase.from('players').update(payload).eq('id', playerToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('players').insert(payload);
        if (error) throw error;
      }
      
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      {cropImageSrc && (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center p-4 z-[60] animate-fade-in">
          <h3 className="text-white text-xl font-bold mb-2">Recorta la cara del jugador</h3>
          <p className="text-gray-400 mb-6 text-sm text-center max-w-md">Selecciona el encuadre (cuadrado perfecto). Se utilizará para extraer el rostro sin el fondo.</p>
          <div className="bg-black/50 border border-white/20 p-2 rounded-xl">
             <ReactCrop 
               crop={crop} 
               onChange={c => setCrop(c)} 
               aspect={1}
               circularCrop={false}
             >
               <img ref={imgRef} src={cropImageSrc} style={{ maxHeight: '60vh' }} alt="Crop me" />
             </ReactCrop>
          </div>
          <div className="flex gap-4 mt-8">
             <button className="btn btn-outline text-white border-white hover:bg-white/10" onClick={() => { setCropImageSrc(null); setIsRemovingBg(false); }}>
                Cancelar
             </button>
             <button className="btn btn-primary" onClick={applyCropAndRemoveBg}>
               <Check size={18} /> Confirmar y Quitar Fondo
             </button>
          </div>
        </div>
      )}

      <div className="card w-full max-w-2xl flex flex-col p-0" style={{ maxHeight: '90vh', minHeight: 0, backgroundColor: 'var(--color-bg-base)' }}>
        <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}>
          <h2 className="h3 mb-0">{playerToEdit ? 'Editar Jugador' : 'Añadir Jugador'}</h2>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors p-1">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ flex: '1 1 auto' }}>
          <div className="p-5 rounded-lg border mb-6" style={{ backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}>
            <label className="block text-sm font-bold mb-2">Autocompletar con BeSoccer o Transfermarkt (Opcional)</label>
            <div className="flex gap-3">
              <input 
                type="url" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.transfermarkt.es/... o besoccer.es/..." 
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && scrapeExternalData()}
              />
              <button 
                onClick={scrapeExternalData}
                disabled={loading || !url}
                className="btn btn-secondary whitespace-nowrap"
              >
                {loading ? 'Analizando...' : (
                  <>
                    <Search size={18} />
                    Extraer Datos
                  </>
                )}
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-danger text-sm mt-3 p-3 rounded-lg border badge-danger">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>

          <div>
            <h3 className="h3 mb-4" style={{ color: 'var(--color-primary)' }}>Datos del Jugador</h3>
            <div className="grid-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-secondary">Nombre *</label>
                <input type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-secondary">Apellidos</label>
                <input type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-secondary">Posición</label>
                <input type="text" value={formData.main_position} onChange={e => setFormData({...formData, main_position: e.target.value})} className="w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-secondary">Nacionalidad</label>
                <input type="text" value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} className="w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-secondary">Altura (cm)</label>
                <input type="number" value={formData.height_cm || ''} onChange={e => setFormData({...formData, height_cm: parseInt(e.target.value) || 0})} className="w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-secondary">Peso (kg)</label>
                <input type="number" value={formData.weight_kg || ''} onChange={e => setFormData({...formData, weight_kg: parseInt(e.target.value) || 0})} className="w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-secondary">Dorsal</label>
                <input type="number" value={formData.kit_number || ''} onChange={e => setFormData({...formData, kit_number: parseInt(e.target.value) || 0})} className="w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-secondary">Valor de Mercado</label>
                <input type="text" value={formData.market_value || ''} onChange={e => setFormData({...formData, market_value: e.target.value})} className="w-full" placeholder="Ej: 150 mil €" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-secondary">Club Actual</label>
                <input type="text" value={formData.current_club || ''} onChange={e => setFormData({...formData, current_club: e.target.value})} className="w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-secondary">Pie Dominante</label>
                <input type="text" value={formData.dominant_foot} onChange={e => setFormData({...formData, dominant_foot: e.target.value})} className="w-full" />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-bold text-secondary">Trayectoria (Equipos)</label>
                <textarea 
                   value={formData.history || ''} 
                   onChange={e => setFormData({...formData, history: e.target.value})} 
                   className="w-full border-gray-300 rounded-md shadow-sm p-2 text-sm" 
                   rows={2} 
                   placeholder="Ej: 22/23: Equipo A ➔ 23/24: Equipo B" 
                />
              </div>
            </div>

            <div className="flex-col gap-1 mt-4">
              <label className="text-xs font-bold text-secondary">Foto Perfil (Recomendado: Quitar fondo)</label>
              <div className="flex gap-4 items-center">
                {formData.photo_url ? (
                  <img src={formData.photo_url} alt="Profile" className="w-16 h-16 object-cover object-top bg-white rounded-lg border border-gray-200 shadow-sm" onError={(e) => (e.currentTarget.style.display = 'none')} />
                ) : (
                  <div className="w-16 h-16 rounded-lg flex items-center justify-center text-xs text-muted" style={{ backgroundColor: 'var(--color-bg-hover)' }}>Sin foto</div>
                )}
                
                <div className="flex-1 flex flex-col gap-2">
                   <div className="flex gap-2">
                     <input 
                       type="text" 
                       value={formData.photo_url} 
                       onChange={e => setFormData({...formData, photo_url: e.target.value})} 
                       placeholder="https://... o Base64" 
                       className="flex-1 text-sm overflow-hidden text-ellipsis whitespace-nowrap" 
                     />
                     {formData.photo_url && !formData.photo_url.startsWith('data:image/jpeg') && (
                        <button 
                           onClick={() => prepareCrop(formData.photo_url)}
                           disabled={isRemovingBg}
                           className="btn btn-outline py-1 px-3 flex items-center gap-1"
                           title="Encuadrar, quitar fondo y poner fondo blanco"
                        >
                           {isRemovingBg ? <Loader2 size={16} className="animate-spin" /> : <Eraser size={16} />}
                           <span className="hidden sm:inline">{isRemovingBg ? 'Procesando...' : 'Recortar y Limpiar'}</span>
                        </button>
                     )}
                   </div>
                   
                   <div className="flex items-center gap-2">
                     <span className="text-xs text-muted">Subir desde PC:</span>
                     <label className="cursor-pointer flex items-center gap-1 text-xs font-bold text-primary hover:text-red-700 transition-colors">
                       {isRemovingBg ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                       {isRemovingBg ? 'Procesando...' : 'Subir imagen, recortar y limpiar'}
                       <input 
                         type="file" 
                         accept="image/*" 
                         className="hidden" 
                         disabled={isRemovingBg}
                         onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                               prepareCrop(e.target.files[0]);
                               e.target.value = '';
                            }
                         }} 
                       />
                     </label>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}>
          <button onClick={onClose} disabled={loading} className="btn btn-outline">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading || !formData.first_name} className="btn btn-primary">
            {loading ? 'Guardando...' : (
              <>
                <Check size={18} />
                {playerToEdit ? 'Guardar Cambios' : 'Guardar Jugador'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
