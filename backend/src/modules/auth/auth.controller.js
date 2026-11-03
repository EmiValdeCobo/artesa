import * as service from './auth.service.js';

export async function login(req, res) {
  const { username, password } = req.body;
  res.json(await service.login(username, password));
}

export async function me(req, res) {
  res.json(await service.perfil(req.user.id));
}
