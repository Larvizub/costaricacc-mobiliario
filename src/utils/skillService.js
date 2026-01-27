const API_BASE_URL = 'https://costaricacc-mobiliario.web.app'; // URL del proxy en Functions

export const searchEvent = async (query) => {
  if (!query.trim()) return null;

  try {
    const isId = /^\d+$/.test(query.trim());
    const params = isId ? { eventNumber: query.trim() } : { title: query.trim() };

    const response = await fetch(`${API_BASE_URL}/skill/events?${new URLSearchParams(params)}`);
    const text = await response.text();
    let data = null;
    try { data = JSON.parse(text); } catch(e) { data = text; }
    if (!response.ok) {
      // Incluir detalles del error de la función/proxy
      const errMsg = typeof data === 'string' ? data : JSON.stringify(data);
      throw new Error(`Error en la búsqueda: ${response.status} - ${errMsg}`);
    }
    if (data.success && data.result && data.result.events && data.result.events.length > 0) {
      return data.result.events[0].title;
    }
    return null;
  } catch (error) {
    console.error('Error searching event:', error);
    return null;
  }
};