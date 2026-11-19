export async function listarTodasLasPaginas(solicitarPagina, filtros = {}, limite = 100) {
  const filas = [];
  let pagina = 1;
  while (true) {
    const datos = await solicitarPagina({ ...filtros, page: pagina, limit: limite });
    filas.push(...datos);
    if (datos.length < limite) return filas;
    pagina += 1;
  }
}
