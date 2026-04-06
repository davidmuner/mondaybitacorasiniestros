import React, { useEffect, useState } from 'react';
import { Button, Loader, Text, AttentionBox, TextField } from '@vibe/core';
import { useSiniestro } from '../hooks/useSiniestro';
import { loadMapping } from '../services/storage.service';
import { MIN_MAPPINGS } from '../hooks/useMapping';
import type { MondayContextData } from '../hooks/useMondayContext';
import type { SearchMode, SearchParams } from '@shared/types';

interface Props {
  context: MondayContextData;
  numeroSiniestro: string | null;
}

const MODES: { value: SearchMode; label: string }[] = [
  { value: 'poliza', label: 'Oficina / Ramo / Póliza' },
  { value: 'siniestro', label: 'Número de Siniestro' },
  { value: 'filenet', label: 'Número de FileNet' },
];

export function SiniestroTab({ context, numeroSiniestro }: Props) {
  const { status, data, message, consultar } = useSiniestro();
  const [hasMapping, setHasMapping] = useState<boolean | null>(null);

  // Modo de búsqueda seleccionado
  const [mode, setMode] = useState<SearchMode>('siniestro');

  // Campos por modo
  const [oficina, setOficina] = useState('');
  const [ramo, setRamo] = useState('');
  const [poliza, setPoliza] = useState('');
  const [numSiniestro, setNumSiniestro] = useState('');
  const [numFilenet, setNumFilenet] = useState('');

  // Pre-poblar siniestro si viene del ítem de Monday
  useEffect(() => {
    if (numeroSiniestro) {
      setNumSiniestro(numeroSiniestro);
      setMode('siniestro');
    }
  }, [numeroSiniestro]);

  // Verificar si hay suficientes mapeos configurados
  useEffect(() => {
    loadMapping().then((config) => {
      const count = config?.mappings?.filter((m) => m.apiField && m.columnId).length ?? 0;
      setHasMapping(count >= MIN_MAPPINGS);
    });
  }, []);

  if (hasMapping === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
        <Loader size="small" />
      </div>
    );
  }

  // Validar si el formulario actual está completo
  const isFormValid = (() => {
    if (mode === 'poliza') return !!(oficina.trim() && ramo.trim() && poliza.trim());
    if (mode === 'siniestro') return !!numSiniestro.trim();
    if (mode === 'filenet') return !!numFilenet.trim();
    return false;
  })();

  const canConsult = hasMapping && isFormValid;

  const handleConsultar = () => {
    if (!canConsult) return;

    let params: SearchParams;
    if (mode === 'poliza') {
      params = { mode: 'poliza', oficina: oficina.trim(), ramo: ramo.trim(), poliza: poliza.trim() };
    } else if (mode === 'siniestro') {
      params = { mode: 'siniestro', numeroSiniestro: numSiniestro.trim() };
    } else {
      params = { mode: 'filenet', filenet: numFilenet.trim() };
    }

    consultar(context.boardId, context.itemId, params);
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* Aviso si no hay configuración */}
      {!hasMapping && (
        <div style={{ marginBottom: '16px' }}>
          <AttentionBox
            title="Sin configuración"
            text="No hay mapeo de campos configurado. Un administrador debe configurarlo en la pestaña Configuración."
            type="warning"
          />
        </div>
      )}

      {/* Selector de modo de búsqueda */}
      <div style={{ marginBottom: '16px' }}>
        <Text weight="bold" style={{ marginBottom: '8px', display: 'block' }}>
          Buscar por
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {MODES.map(({ value, label }) => (
            <label
              key={value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid ${mode === value ? 'var(--primary-color)' : 'var(--ui-border-color)'}`,
                background: mode === value ? 'var(--primary-selected-color)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="radio"
                name="searchMode"
                value={value}
                checked={mode === value}
                onChange={() => setMode(value)}
                style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px' }}
              />
              <Text>{label}</Text>
            </label>
          ))}
        </div>
      </div>

      {/* Campos del modo seleccionado */}
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {mode === 'poliza' && (
          <>
            <TextField
              title="Oficina *"
              placeholder="Código de oficina"
              value={oficina}
              onChange={(val: string) => setOficina(val)}
            />
            <TextField
              title="Ramo *"
              placeholder="Código de ramo"
              value={ramo}
              onChange={(val: string) => setRamo(val)}
            />
            <TextField
              title="Póliza *"
              placeholder="Número de póliza"
              value={poliza}
              onChange={(val: string) => setPoliza(val)}
            />
            <Text type="text2" color="secondary">
              Los tres campos son obligatorios para esta búsqueda.
            </Text>
          </>
        )}

        {mode === 'siniestro' && (
          <TextField
            title="Número de Siniestro *"
            placeholder="Ej. 123456789"
            value={numSiniestro}
            onChange={(val: string) => setNumSiniestro(val)}
          />
        )}

        {mode === 'filenet' && (
          <TextField
            title="Número de FileNet *"
            placeholder="Ej. FN-000123"
            value={numFilenet}
            onChange={(val: string) => setNumFilenet(val)}
          />
        )}
      </div>

      {/* Botón principal */}
      <Button
        disabled={!canConsult || status === 'loading'}
        loading={status === 'loading'}
        onClick={handleConsultar}
        size="medium"
      >
        Consultar y Poblar Datos
      </Button>

      {/* Resultado */}
      {status === 'success' && message && (
        <div style={{ marginTop: '16px' }}>
          <AttentionBox title="Completado" text={message} type="positive" />
        </div>
      )}

      {status === 'error' && message && (
        <div style={{ marginTop: '16px' }}>
          <AttentionBox title="Error" text={message} type="negative" />
        </div>
      )}

      {/* Vista previa de datos obtenidos */}
      {data && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: 'var(--primary-background-hover-color)',
            borderRadius: '8px',
          }}
        >
          <Text weight="bold" style={{ marginBottom: '8px' }}>
            Datos recibidos de la API
          </Text>
          {Object.entries(data)
            .filter(([, v]) => v !== '' && v !== null)
            .map(([key, value]) => (
              <div key={key} style={{ display: 'flex', gap: '8px', padding: '2px 0' }}>
                <Text type="text2" color="secondary" style={{ minWidth: '180px' }}>
                  {key}
                </Text>
                <Text type="text2">{String(value)}</Text>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
