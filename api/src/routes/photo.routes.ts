import { Router, Request, Response } from 'express';
import axios from 'axios';

// Server-side Google Places Photo proxy — fetches the image with the API key
// on the server so the key is never sent to clients. Clients request
// `/api/photo?ref=<photo_reference>&w=<maxwidth>`.
export const photoRouter = Router();

photoRouter.get('/', async (req: Request, res: Response) => {
  const ref = typeof req.query.ref === 'string' ? req.query.ref : '';
  const wRaw = typeof req.query.w === 'string' ? req.query.w : '600';
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!ref || ref.length > 2000) {
    return res.status(400).json({ error: 'Missing or invalid ref' });
  }
  if (!apiKey || apiKey === 'your-google-maps-api-key') {
    return res.status(500).json({ error: 'Maps key not configured' });
  }

  // Clamp width to Google's supported range.
  const maxwidth = Math.min(Math.max(parseInt(wRaw, 10) || 600, 1), 1600);

  try {
    // Host is fixed and ref is sent as an encoded param, so there's no SSRF
    // surface — only the photoreference is caller-influenced.
    const upstream = await axios.get('https://maps.googleapis.com/maps/api/place/photo', {
      params: { maxwidth, photoreference: ref, key: apiKey },
      responseType: 'arraybuffer',
    });
    res.setHeader('Content-Type', (upstream.headers['content-type'] as string) || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, immutable');
    return res.status(200).send(Buffer.from(upstream.data));
  } catch (err) {
    console.error('[photo-proxy] fetch failed:', err);
    return res.status(502).json({ error: 'Photo fetch failed' });
  }
});
