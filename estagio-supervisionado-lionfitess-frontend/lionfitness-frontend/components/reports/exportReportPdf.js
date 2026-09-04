/**
 * exportReportPdf.js
 * 
 * Utilitário reutilizável para exportar relatórios em formato PDF profissional
 * utilizando jsPDF + jspdf-autotable. Executa estritamente no lado do cliente (client-side)
 * com importações dinâmicas, evitando qualquer erro de SSR no Next.js.
 */

const roleMap = {
  ADMIN: "Administrador",
  PERSONAL_TRAINER: "Personal Trainer",
  OPERATIONAL: "Aluno",
  USER: "Aluno",
};

/**
 * Função para formatar o perfil do usuário de forma amigável
 */
function getFriendlyRole(role) {
  if (!role) return "—";
  const upper = String(role).toUpperCase();
  return roleMap[upper] || role;
}

/**
 * Utilitário de exportação
 * 
 * @param {Object} params
 * @param {string} params.title Título do relatório
 * @param {Object} params.user Usuário logado ({ name, role })
 * @param {Object} params.filters Filtros aplicados { key: value }
 * @param {Array} params.columns Colunas da tabela [{ title: string, dataKey: string }]
 * @param {Array} params.rows Dados das linhas [{ [dataKey]: value }]
 * @param {Array} params.summary KPIs resumidos [{ label: string, value: any }]
 * @param {string} params.filename Nome do arquivo a ser salvo
 */
export default async function exportReportPdf({
  title,
  user,
  filters = {},
  columns = [],
  rows = [],
  summary = [],
  filename = "relatorio.pdf",
}) {
  if (typeof window === "undefined") {
    console.warn("A exportação de PDF só é permitida no ambiente do navegador (client-side).");
    return;
  }

  // 1. Carregar dinamicamente jsPDF e jspdf-autotable
  const { jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default;

  // 2. Instanciar o jsPDF (Formato A4, unidade em mm, orientação vertical)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.width; // 210
  const pageHeight = doc.internal.pageSize.height; // 297
  const margin = 14;
  const contentWidth = pageWidth - 2 * margin; // 182

  // ─── CABEÇALHO DO PDF ───
  
  // Linha decorativa no topo (Vermelho Lion Fitness)
  doc.setFillColor(192, 57, 43); // #C0392B
  doc.rect(margin, 12, contentWidth, 1.5, "F");

  // Logo LION FITNESS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(192, 57, 43); // #C0392B
  doc.text("LION FITNESS", margin, 20);

  // Nome do relatório
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(26, 26, 26); // #1A1A1A
  doc.text(title || "Relatório do Sistema", margin, 27);

  // Metadados de exportação (canto direito ou em bloco no topo)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // #64748B

  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR") + " " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const exportUser = user?.name || user?.nome || "Admin";
  const exportRole = getFriendlyRole(user?.role);

  let metaY = 19;
  doc.text(`Exportado por: ${exportUser}`, pageWidth - margin, metaY, { align: "right" });
  doc.text(`Perfil: ${exportRole}`, pageWidth - margin, metaY + 4, { align: "right" });
  doc.text(`Data: ${dateStr}`, pageWidth - margin, metaY + 8, { align: "right" });

  // ─── FILTROS UTILIZADOS ───
  let currentY = 38;

  const filterEntries = Object.entries(filters);
  if (filterEntries.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(26, 26, 26);
    doc.text("Filtros aplicados:", margin, currentY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // #475569
    
    let filterParts = [];
    filterEntries.forEach(([key, value]) => {
      if (value) {
        filterParts.push(`${key}: ${value}`);
      }
    });

    const filterText = filterParts.join("   |   ");
    doc.text(filterText, margin, currentY + 4.5);
    currentY += 10;
  } else {
    currentY += 2;
  }

  // Linha separadora antes dos KPIs
  doc.setDrawColor(226, 232, 240); // #E2E8F0
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // ─── RESUMO / INDICADORES (KPIs) ───
  if (summary && summary.length > 0) {
    const kpiCount = summary.length;
    const cardHeight = 16;
    const gap = 4;
    const cardWidth = (contentWidth - (kpiCount - 1) * gap) / kpiCount;

    // Fundo cinza para os cards
    summary.forEach((kpi, idx) => {
      const cardX = margin + idx * (cardWidth + gap);
      
      // Desenhar retângulo de fundo para o KPI card
      doc.setFillColor(248, 250, 252); // #F8FAFC
      doc.rect(cardX, currentY, cardWidth, cardHeight, "F");
      doc.setDrawColor(226, 232, 240); // #E2E8F0
      doc.rect(cardX, currentY, cardWidth, cardHeight, "S");

      // Borda lateral esquerda destacando em Vermelho
      doc.setFillColor(192, 57, 43); // #C0392B
      doc.rect(cardX, currentY, 1.2, cardHeight, "F");

      // Valor grande
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(26, 26, 26);
      
      // Tratar valor longo
      const valStr = String(kpi.value ?? "0");
      doc.text(valStr, cardX + 4, currentY + 6);

      // Label pequeno
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // #64748B
      const labelStr = String(kpi.label || "");
      
      // Limitar tamanho da label se ultrapassar o card
      const maxLabelWidth = cardWidth - 8;
      const truncatedLabel = doc.getStringUnitWidth(labelStr) * 7.5 * 0.3527 > maxLabelWidth 
        ? labelStr.substring(0, Math.floor(maxLabelWidth / 1.7)) + "..."
        : labelStr;
      
      doc.text(truncatedLabel, cardX + 4, currentY + 11.5);
    });

    currentY += cardHeight + 8;
  }

  // ─── TABELA DE DADOS (jspdf-autotable) ───
  const tableHeaders = columns.map(c => c.title || c.header || "");
  const tableKeys = columns.map(c => c.dataKey || c.key || "");

  const tableBody = rows.map(row => {
    return tableKeys.map(key => {
      const val = row[key];
      return val === null || val === undefined ? "—" : String(val);
    });
  });

  // Chamar o plugin de autoTable
  autoTable(doc, {
    startY: currentY,
    head: [tableHeaders],
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: [26, 26, 26], // Preto (#1A1A1A) como cor base do cabeçalho
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: 3,
      valign: "middle",
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [51, 65, 85], // #334155
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // #F8FAFC
    },
    styles: {
      font: "helvetica",
      lineWidth: 0.1,
      lineColor: [226, 232, 240], // #E2E8F0
    },
    margin: { left: margin, right: margin },
  });

  // ─── PÓS-PROCESSAMENTO PARA RODAPÉ E PÁGINAS ("Página X de Y") ───
  const totalPages = doc.internal.getNumberOfPages();
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Linha acima do rodapé
    doc.setDrawColor(241, 245, 249); // #F1F5F9
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    // Texto do rodapé
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // #94A3B8
    doc.text("Sistema Lion Fitness — Gestão de Academia", margin, pageHeight - 8);

    // Paginação
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  // 3. Salvar/Baixar o arquivo PDF
  doc.save(filename);
}
