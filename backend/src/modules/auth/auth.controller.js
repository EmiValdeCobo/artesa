import * as service from './auth.service.js';
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde.' },
});

export async function login(req, res) {
  const { username, password } = req.body;
  const sesion = await service.login(username, password);
  res.cookie('artesa_session', sesion.token, service.opcionesCookie());
  delete sesion.token;
  res.json(sesion);
}

export async function logout(req, res) {
  if (req.user?.jti) {
    await service.revocarToken(req.user.jti, req.tokenExp, req.user.id);
  }
  res.clearCookie('artesa_session', service.opcionesCookie());
  res.status(204).send();
}

export async function me(req, res) {
  res.json(await service.perfil(req.user.id));
}
