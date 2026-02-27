function normalizeCellValue(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if (typeof value.text === "string") {
      return value.text;
    }
    if (typeof value.result !== "undefined") {
      return value.result;
    }
    if (typeof value.hyperlink === "string") {
      return value.text || value.hyperlink;
    }
  }
  return value;
}

export async function readExcelFile(file, columns) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        if (!file?.name?.toLowerCase().endsWith('.xlsx')) {
          return reject("Formato no soportado. Usa un archivo .xlsx");
        }

        const { default: ExcelJS } = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(e.target.result);
        const sheet = workbook.worksheets[0];
        if (!sheet || sheet.rowCount < 1) return reject("El archivo está vacío");

        const headerRow = sheet.getRow(1);
        const headers = [];
        for (let i = 1; i <= headerRow.cellCount; i++) {
          headers.push(String(normalizeCellValue(headerRow.getCell(i).value)).trim().toLowerCase());
        }

        const required = columns.slice(0, 3).map(c => c.toLowerCase());
        for (let col of required) {
          if (!headers.includes(col)) return reject(`Falta la columna: ${col}`);
        }

        const rows = [];
        for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
          const row = sheet.getRow(rowIndex);
          let obj = {};
          columns.forEach((col) => {
            const idx = headers.indexOf(col.toLowerCase());
            obj[col] = idx !== -1 ? normalizeCellValue(row.getCell(idx + 1).value) : "";
          });
          rows.push(obj);
        }

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
