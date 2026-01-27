// Utilidad para importar archivos Excel y convertirlos a objetos JS
// Usamos import dinámico de `xlsx` para evitar que bloquee la optimización de dependencias
export async function readExcelFile(file, columns) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const { default: XLSX } = await import('xlsx');
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (!json.length) return reject("El archivo está vacío");
        const headers = json[0].map(h => h.toString().trim().toLowerCase());
        // Solo validar como requeridas las primeras 3 columnas (Nombre, Categoría, Cantidad)
        const required = columns.slice(0, 3).map(c => c.toLowerCase());
        for (let col of required) {
          if (!headers.includes(col)) return reject(`Falta la columna: ${col}`);
        }
        // Convertir filas a objetos, permitiendo columnas opcionales
        const rows = json.slice(1).map(row => {
          let obj = {};
          columns.forEach((col) => {
            const idx = headers.indexOf(col.toLowerCase());
            obj[col] = idx !== -1 ? row[idx] : "";
          });
          return obj;
        });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
