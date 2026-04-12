import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

interface MondayContext {
  accountId: number;
  userId: number;
  appId: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const token = (req.headers.authorization ?? '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  const secret = process.env.MONDAY_SIGNING_SECRET;
  if (!secret) return res.status(500).json({ error: 'Error de configuración del servidor' });

  try {
    jwt.verify(token, secret) as MondayContext;
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  const { oficina, ramo, poliza, numeroSiniestro, filenet } = req.query as Record<string, string | undefined>;

  const hasPolizaSearch = !!(oficina && ramo && poliza);
  const hasSiniestroSearch = !!numeroSiniestro;
  const hasFilenetSearch = !!filenet;

  if (!hasPolizaSearch && !hasSiniestroSearch && !hasFilenetSearch) {
    return res.status(400).json({
      error: 'Debe proporcionar al menos una opción de búsqueda: oficina+ramo+poliza, numeroSiniestro o filenet',
    });
  }

  const baseUrl = process.env.SINIESTROS_API_BASE_URL;
  const apiToken = process.env.SINIESTROS_API_TOKEN;
  if (!baseUrl || !apiToken) return res.status(500).json({ error: 'API externa no configurada' });

  const params = new URLSearchParams();
  if (oficina) params.set('oficina', oficina);
  if (ramo) params.set('ramo', ramo);
  if (poliza) params.set('poliza', poliza);
  if (numeroSiniestro) params.set('numeroSiniestro', numeroSiniestro);
  if (filenet) params.set('filenet', filenet);

  try {
    const upstream = await fetch(`${baseUrl}/siniestros?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (upstream.status === 404) return res.status(404).json({ error: 'Siniestro no encontrado' });
    if (!upstream.ok) return res.status(502).json({ error: 'No se pudo conectar con la API de siniestros' });

    const data = await upstream.json();
    return res.status(200).json({ data });
  } catch {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
