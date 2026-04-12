import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { fetchSiniestro } from '../server/src/services/siniestro.service';

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

  try {
    const data = await fetchSiniestro({ oficina, ramo, poliza, numeroSiniestro, filenet });
    return res.status(200).json({ data });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    const status = error.status ?? 500;
    const message =
      status === 404
        ? 'Siniestro no encontrado'
        : status === 502
          ? 'No se pudo conectar con la API de siniestros'
          : 'Error interno del servidor';
    return res.status(status).json({ error: message });
  }
}
