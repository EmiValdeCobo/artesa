import app from './app.js';
import { env } from './config/env.js';
import { exigirSinContrasenasDemo } from './utils/contrasenaDemo.js';

try {
  await exigirSinContrasenasDemo({ esProduccion: env.isProduction });
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

app.listen(env.port, () => console.log(`API artesa escuchando en http://localhost:${env.port}`));
