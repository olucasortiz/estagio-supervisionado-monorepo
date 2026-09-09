/**
 * exportReportPdf.js
 * 
 * Base visual e utilitário padronizado para geração e exportação de relatórios
 * executivos em formato PDF para o Lion Fitness.
 * 
 * Arquitetura compartilhada:
 * - PDF_THEME: Paleta oficial Lion Fitness com accent vermelho (#C0392B) e base clara para impressão
 * - drawReportHeader: Cabeçalho institucional com marca, título, período e emissão discreta
 * - drawKpiCards: Cards numéricos modernos com valor em destaque e acento da marca
 * - drawChart: Gráficos determinísticos vetoriais (proporção e barras por categoria)
 * - drawReportTable: Tabela AutoTable refinada com zebra sutil, larguras inteligentes e badges de status
 * - drawFooter: Rodapé padronizado em todas as páginas com numeração "Página X de Y"
 * 
 * Executa estritamente no cliente com importações dinâmicas (compatível com SSR Next.js).
 */

export const PDF_THEME = {
  colors: {
    primary: [192, 57, 43],        // Vermelho Lion Fitness (#C0392B)
    primaryLight: [254, 242, 242],   // #FEF2F2
    primaryDark: [153, 27, 27],     // #991B1B
    dark: [24, 24, 27],            // #18181B (Cabeçalho da tabela)
    darkSlate: [30, 41, 59],       // #1E293B
    textPrimary: [15, 23, 42],     // #0F172A
    textSecondary: [71, 85, 105],  // #475569
    textMuted: [148, 163, 184],    // #94A3B8
    background: [255, 255, 255],   // Branco
    surface: [248, 250, 252],      // #F8FAFC (Cards de KPI e Gráficos)
    surfaceAlt: [241, 245, 249],   // #F1F5F9 (Trilha de barras / Zebra)
    border: [226, 232, 240],       // #E2E8F0 (Bordas sutis)
    borderLight: [241, 245, 249],  // #F1F5F9
    success: [21, 128, 61],        // #15803D (Verde Ativo / Em dia)
    successBg: [240, 253, 244],    // #F0FDF4
    warning: [180, 83, 9],         // #B45309 (Âmbar Pendente)
    warningBg: [254, 243, 199],    // #FEF3C7
    danger: [185, 28, 28],         // #B91C1C (Vermelho Inadimplente)
    dangerBg: [254, 242, 242],     // #FEF2F2
    info: [37, 99, 235],           // #2563EB (Azul Informativo)
    infoBg: [239, 246, 255],       // #EFF6FF
  },
  fonts: {
    family: "helvetica",
  }
};

const roleMap = {
  ADMIN: "Administrador",
  PERSONAL_TRAINER: "Personal Trainer",
  OPERATIONAL: "Aluno",
  USER: "Aluno",
};

/**
 * Função para formatar o perfil do usuário de forma amigável
 */
export function getFriendlyRole(role) {
  if (!role) return "Administrador";
  const upper = String(role).toUpperCase();
  return roleMap[upper] || role;
}

/**
 * Desenha o cabeçalho executivo institucional Lion Fitness
 */
export function drawReportHeader(doc, {
  title,
  subtitle,
  filters = {},
  user,
  margin = 14,
  contentWidth = 182,
  pageWidth = 210,
}) {
  // 1. Linha superior discreta no vermelho Lion
  doc.setFillColor(...PDF_THEME.colors.primary);
  doc.rect(margin, 10, contentWidth, 1.2, "F");

  // 2. Marca "Lion Fitness"
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...PDF_THEME.colors.primary);
  doc.text("LION FITNESS", margin, 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_THEME.colors.textMuted);
  doc.text("GESTÃO DE ACADEMIA", margin + 38, 18);

  // 3. Título do relatório
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PDF_THEME.colors.textPrimary);
  doc.text(title || "Relatório Lion Fitness", margin, 26);

  // 4. Período / Subtítulo / Filtros compactos logo abaixo do título
  let filterText = "";
  const filterEntries = Object.entries(filters).filter(([_, v]) => Boolean(v));
  if (filterEntries.length > 0) {
    filterText = filterEntries.map(([k, v]) => `${k}: ${v}`).join("   |   ");
  } else if (subtitle) {
    filterText = subtitle;
  }

  if (filterText) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_THEME.colors.textSecondary);
    doc.text(filterText, margin, 31);
  }

  // 5. Metadados de exportação no canto direito (discretos e profissionais)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_THEME.colors.textMuted);

  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR") + " às " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const exportUser = user?.name || user?.nome || "Lucas Admin";
  const exportRole = getFriendlyRole(user?.role);

  doc.text(`Gerado por: ${exportUser} · ${exportRole}`, pageWidth - margin, 18, { align: "right" });
  doc.text(`Emissão: ${dateStr}`, pageWidth - margin, 22.5, { align: "right" });

  // 6. Linha divisória sutil
  const headerBottomY = filterText ? 34.5 : 29.5;
  doc.setDrawColor(...PDF_THEME.colors.border);
  doc.setLineWidth(0.2);
  doc.line(margin, headerBottomY, pageWidth - margin, headerBottomY);

  return headerBottomY + 4.5;
}

/**
 * Desenha os cards numéricos modernos de indicadores (KPIs)
 */
export function drawKpiCards(doc, {
  kpis = [],
  startY,
  margin = 14,
  contentWidth = 182,
}) {
  if (!kpis || kpis.length === 0) return startY;

  const kpiCount = kpis.length;
  const cardHeight = 15;
  const gap = 3.5;
  const cardWidth = (contentWidth - (kpiCount - 1) * gap) / kpiCount;

  kpis.forEach((kpi, idx) => {
    const cardX = margin + idx * (cardWidth + gap);

    // Card background com borda sutil
    doc.setFillColor(...PDF_THEME.colors.surface);
    doc.setDrawColor(...PDF_THEME.colors.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(cardX, startY, cardWidth, cardHeight, 1.2, 1.2, "FD");

    // Detalhe superior no Vermelho Lion Fitness
    doc.setFillColor(...PDF_THEME.colors.primary);
    doc.rect(cardX + 1.2, startY, cardWidth - 2.4, 0.9, "F");

    // Valor principal em destaque
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...PDF_THEME.colors.textPrimary);

    let valStr = String(kpi.value ?? "0");
    if (typeof kpi.value === "number" && !Number.isInteger(kpi.value)) {
      valStr = kpi.value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    }
    doc.text(valStr, cardX + 3.5, startY + 6.2);

    // Label menor em cinza
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_THEME.colors.textMuted);
    const labelStr = String(kpi.label || "").toUpperCase();

    // Truncar label se ultrapassar a largura do card
    const maxWidth = cardWidth - 7;
    let finalLabel = labelStr;
    if (doc.getTextWidth(labelStr) > maxWidth) {
      while (doc.getTextWidth(finalLabel + "…") > maxWidth && finalLabel.length > 0) {
        finalLabel = finalLabel.slice(0, -1);
      }
      finalLabel += "…";
    }
    doc.text(finalLabel, cardX + 3.5, startY + 11.2);
  });

  return startY + cardHeight + 4.5;
}

/**
 * Desenha gráficos determinísticos vetoriais diretos no jsPDF
 */
export function drawChart(doc, {
  chart,
  startY,
  margin = 14,
  contentWidth = 182,
}) {
  if (!chart || !chart.type || !chart.items || chart.items.length === 0) return startY;

  // 1. Gráfico de barra de proporção (stacked horizontal bar)
  if (chart.type === "proportional_bar") {
    const cardHeight = 19;
    doc.setFillColor(...PDF_THEME.colors.surface);
    doc.setDrawColor(...PDF_THEME.colors.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, startY, contentWidth, cardHeight, 1.2, 1.2, "FD");

    // Título do gráfico
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_THEME.colors.textSecondary);
    const chartTitle = String(chart.title || "DISTRIBUIÇÃO PROPORCIONAL").toUpperCase();
    doc.text(chartTitle, margin + 4, startY + 4.8);

    // Barra de progresso
    const barX = margin + 4;
    const barY = startY + 7;
    const barWidth = contentWidth - 8;
    const barHeight = 3.8;

    // Fundo da barra
    doc.setFillColor(...PDF_THEME.colors.surfaceAlt);
    doc.rect(barX, barY, barWidth, barHeight, "F");

    let currentX = barX;
    chart.items.forEach((item) => {
      const segWidth = (item.percentage / 100) * barWidth;
      if (segWidth > 0) {
        doc.setFillColor(...(item.color || PDF_THEME.colors.primary));
        doc.rect(currentX, barY, segWidth, barHeight, "F");
        currentX += segWidth;
      }
    });

    // Legenda abaixo da barra
    let legendX = barX;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    chart.items.forEach((item) => {
      // Ponto colorido da legenda
      doc.setFillColor(...(item.color || PDF_THEME.colors.primary));
      doc.circle(legendX + 1.2, startY + 15, 1, "F");

      // Texto da legenda
      doc.setTextColor(...PDF_THEME.colors.textSecondary);
      const text = `${item.label}: ${item.count} (${item.percentage}%)`;
      doc.text(text, legendX + 3.5, startY + 15.8);

      legendX += doc.getTextWidth(text) + 8;
    });

    return startY + cardHeight + 4.5;
  }

  // 2. Gráfico de categorias (barras horizontais para motivos ou planos)
  if (chart.type === "category_bars") {
    const items = chart.items.slice(0, 5);
    const itemHeight = 4.8;
    const cardHeight = 8.5 + items.length * itemHeight;

    doc.setFillColor(...PDF_THEME.colors.surface);
    doc.setDrawColor(...PDF_THEME.colors.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, startY, contentWidth, cardHeight, 1.2, 1.2, "FD");

    // Título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_THEME.colors.textSecondary);
    const chartTitle = String(chart.title || "DISTRIBUIÇÃO POR CATEGORIA").toUpperCase();
    doc.text(chartTitle, margin + 4, startY + 4.8);

    items.forEach((item, idx) => {
      const rowY = startY + 8.2 + idx * itemHeight;

      // Label à esquerda
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(...PDF_THEME.colors.textPrimary);
      const label = item.label || "Não informado";
      doc.text(label, margin + 4, rowY);

      // Quantidade e percentual à direita
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(...PDF_THEME.colors.textSecondary);
      const valText = `${item.count} (${item.percentage}%)`;
      doc.text(valText, margin + contentWidth - 4, rowY, { align: "right" });

      // Mini barra horizontal
      const barTrackX = margin + 55;
      const barTrackWidth = contentWidth - 85;
      const barTrackY = rowY - 1.8;
      const barTrackHeight = 1.6;

      doc.setFillColor(...PDF_THEME.colors.surfaceAlt);
      doc.rect(barTrackX, barTrackY, barTrackWidth, barTrackHeight, "F");

      const fillWidth = Math.max(1, (item.percentage / 100) * barTrackWidth);
      doc.setFillColor(...(item.color || PDF_THEME.colors.primary));
      doc.rect(barTrackX, barTrackY, fillWidth, barTrackHeight, "F");
    });

    return startY + cardHeight + 4.5;
  }

  return startY;
}

/**
 * Calcula larguras inteligentes para as colunas impedindo quebras indevidas
 */
export function getSmartColumnStyles(columns, contentWidth = 182) {
  const columnStyles = {};
  const fixedWidths = {};
  let totalFixed = 0;
  const flexibleIndices = [];

  columns.forEach((col, idx) => {
    const key = String(col.dataKey || col.key || "").toLowerCase();
    const title = String(col.title || col.header || "").toLowerCase();

    if (key.includes("cpf") || title.includes("cpf")) {
      fixedWidths[idx] = 28;
      columnStyles[idx] = { cellWidth: 28, halign: "center" };
      totalFixed += 28;
    } else if (title.includes("cancelamento") || key.includes("cancellation")) {
      fixedWidths[idx] = 30;
      columnStyles[idx] = { cellWidth: 30, halign: "center" };
      totalFixed += 30;
    } else if (key.includes("date") || key.includes("data") || key.includes("createdat") || key.includes("vencimento") || title.includes("data") || title.includes("cadastro") || title.includes("vencimento")) {
      fixedWidths[idx] = 25;
      columnStyles[idx] = { cellWidth: 25, halign: "center" };
      totalFixed += 25;
    } else if (key.includes("status") || key.includes("situacao") || key.includes("active") || title.includes("status") || title.includes("situação")) {
      fixedWidths[idx] = 24;
      columnStyles[idx] = { cellWidth: 24, halign: "center" };
      totalFixed += 24;
    } else if (key.includes("valor") || key.includes("amount") || key.includes("price") || title.includes("valor") || title.includes("pendente")) {
      fixedWidths[idx] = 25;
      columnStyles[idx] = { cellWidth: 25, halign: "right" };
      totalFixed += 25;
    } else {
      flexibleIndices.push({ idx, key, title });
    }
  });

  const remainingWidth = Math.max(contentWidth - totalFixed, flexibleIndices.length * 20);

  if (flexibleIndices.length === 1) {
    const { idx } = flexibleIndices[0];
    columnStyles[idx] = { cellWidth: remainingWidth, overflow: "linebreak" };
  } else if (flexibleIndices.length === 2) {
    const first = flexibleIndices[0];
    const second = flexibleIndices[1];

    if (second.key.includes("email") || second.title.includes("email")) {
      const w1 = Math.floor(remainingWidth * 0.46);
      const w2 = remainingWidth - w1;
      columnStyles[first.idx] = { cellWidth: w1, overflow: "linebreak" };
      columnStyles[second.idx] = { cellWidth: w2, overflow: "ellipsize" };
    } else if (second.key.includes("reason") || second.title.includes("motivo")) {
      const w1 = Math.floor(remainingWidth * 0.45);
      const w2 = remainingWidth - w1;
      columnStyles[first.idx] = { cellWidth: w1, overflow: "linebreak" };
      columnStyles[second.idx] = { cellWidth: w2, overflow: "linebreak" };
    } else if (second.key.includes("plano") || second.title.includes("plano")) {
      const w1 = Math.floor(remainingWidth * 0.55);
      const w2 = remainingWidth - w1;
      columnStyles[first.idx] = { cellWidth: w1, overflow: "linebreak" };
      columnStyles[second.idx] = { cellWidth: w2, overflow: "linebreak" };
    } else {
      const w = Math.floor(remainingWidth / 2);
      columnStyles[first.idx] = { cellWidth: w, overflow: "linebreak" };
      columnStyles[second.idx] = { cellWidth: remainingWidth - w, overflow: "linebreak" };
    }
  } else if (flexibleIndices.length > 2) {
    const eachWidth = Math.floor(remainingWidth / flexibleIndices.length);
    flexibleIndices.forEach(({ idx, key, title }, i) => {
      const isLast = i === flexibleIndices.length - 1;
      const w = isLast ? remainingWidth - eachWidth * (flexibleIndices.length - 1) : eachWidth;
      columnStyles[idx] = {
        cellWidth: w,
        overflow: (key.includes("email") || title.includes("email")) ? "ellipsize" : "linebreak"
      };
    });
  }

  return columnStyles;
}

/**
 * Renderiza a tabela de dados via AutoTable com estilização executiva
 */
export function drawReportTable(doc, {
  columns = [],
  rows = [],
  startY,
  margin = 14,
  contentWidth = 182,
  autoTable,
}) {
  const tableHeaders = columns.map(c => c.title || c.header || "");
  const tableKeys = columns.map(c => c.dataKey || c.key || "");

  let tableBody = [];
  if (rows.length === 0) {
    tableBody = [[{
      content: "Nenhum registro encontrado para os critérios selecionados.",
      colSpan: Math.max(1, columns.length),
      styles: {
        halign: "center",
        textColor: PDF_THEME.colors.textMuted,
        fontStyle: "italic",
        cellPadding: 8,
      }
    }]];
  } else {
    tableBody = rows.map(row => {
      return tableKeys.map(key => {
        const val = row[key];
        return val === null || val === undefined ? "—" : String(val);
      });
    });
  }

  // Larguras inteligentes e alinhamentos
  const columnStyles = getSmartColumnStyles(columns, contentWidth);

  autoTable(doc, {
    startY,
    head: [tableHeaders],
    body: tableBody,
    theme: "plain",
    showHead: "everyPage",
    rowPageBreak: "avoid",
    headStyles: {
      fillColor: [...PDF_THEME.colors.dark], // Grafite escuro / neutro
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 3.2,
      valign: "middle",
    },
    bodyStyles: {
      fontSize: 7.6,
      cellPadding: 2.8,
      textColor: [...PDF_THEME.colors.textPrimary],
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [...PDF_THEME.colors.surface], // Zebra muito sutil
    },
    styles: {
      font: "helvetica",
      lineWidth: 0.1,
      lineColor: [...PDF_THEME.colors.border],
    },
    columnStyles,
    didParseCell: (data) => {
      if (data.section === "body") {
        const colIdx = data.column.index;
        const col = columns[colIdx];
        const key = String(col?.dataKey || col?.key || "").toLowerCase();
        const title = String(col?.title || col?.header || "").toLowerCase();

        // Estilização diferenciada de Status (visível em cores e legível em preto e branco)
        if (key.includes("status") || key.includes("situacao") || key.includes("active") || title.includes("status") || title.includes("situação")) {
          const rawVal = String(data.cell.raw || "").trim().toLowerCase();
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 7;

          if (rawVal === "ativo" || rawVal === "pago" || rawVal === "em dia") {
            data.cell.styles.textColor = [...PDF_THEME.colors.success];
            data.cell.styles.fillColor = [...PDF_THEME.colors.successBg];
          } else if (rawVal === "inativo" || rawVal === "cancelado") {
            data.cell.styles.textColor = [...PDF_THEME.colors.textSecondary];
            data.cell.styles.fillColor = [...PDF_THEME.colors.surfaceAlt];
          } else if (rawVal === "inadimplente" || rawVal === "vencido") {
            data.cell.styles.textColor = [...PDF_THEME.colors.danger];
            data.cell.styles.fillColor = [...PDF_THEME.colors.dangerBg];
          } else if (rawVal === "pendente") {
            data.cell.styles.textColor = [...PDF_THEME.colors.warning];
            data.cell.styles.fillColor = [...PDF_THEME.colors.warningBg];
          }
        }
      }
    },
    margin: { left: margin, right: margin, bottom: 16 },
  });
}

/**
 * Desenha o rodapé institucional padronizado em todas as páginas do relatório
 */
export function drawFooter(doc, {
  margin = 14,
  pageWidth = 210,
  pageHeight = 297,
}) {
  const totalPages = doc.internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Linha divisória discreta acima do rodapé
    doc.setDrawColor(...PDF_THEME.colors.border);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    // Texto institucional à esquerda
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_THEME.colors.textMuted);
    doc.text("Lion Fitness · Gestão de Academia", margin, pageHeight - 7);

    // Paginação à direita
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  }
}

/**
 * Função principal exportada: coordena todo o fluxo de exportação
 * 
 * @param {Object} params
 * @param {string} params.title Título do relatório
 * @param {string} [params.subtitle] Subtítulo descritivo
 * @param {Object} [params.user] Usuário logado ({ name, role })
 * @param {Object} [params.filters] Filtros aplicados { [key]: value }
 * @param {Array} [params.columns] Colunas da tabela [{ title, dataKey }]
 * @param {Array} [params.rows] Linhas com dados reais [{ [dataKey]: value }]
 * @param {Array} [params.kpis] Indicadores numéricos [{ label, value }]
 * @param {Array} [params.summary] Alias para kpis (retrocompatibilidade)
 * @param {Object} [params.chart] Gráfico configurado com dados reais
 * @param {Object} [params.chartData] Alias para chart (retrocompatibilidade)
 * @param {string} [params.filename] Nome do arquivo para download
 * @returns {Promise<jsPDF>} Instância do jsPDF gerada
 */
export default async function exportReportPdf({
  title,
  subtitle,
  user,
  filters = {},
  columns = [],
  rows = [],
  kpis = [],
  summary = [],
  chart = null,
  chartData = null,
  filename = "relatorio.pdf",
}) {
  const effectiveKpis = Array.isArray(kpis) && kpis.length > 0 ? kpis : summary;
  const effectiveChart = chart || chartData;

  // 1. Carregamento dinâmico do jsPDF e autoTable
  const { jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default || autoTableModule;

  // 2. Instanciação A4 retrato
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.width; // 210
  const pageHeight = doc.internal.pageSize.height; // 297
  const margin = 14;
  const contentWidth = pageWidth - 2 * margin; // 182

  // 3. Cabeçalho
  let currentY = drawReportHeader(doc, {
    title,
    subtitle,
    filters,
    user,
    margin,
    contentWidth,
    pageWidth,
  });

  // 4. Cards de KPI
  currentY = drawKpiCards(doc, {
    kpis: effectiveKpis,
    startY: currentY,
    margin,
    contentWidth,
    pageWidth,
  });

  // 5. Gráfico determinístico (quando houver dados reais suficientes)
  currentY = drawChart(doc, {
    chart: effectiveChart,
    startY: currentY,
    margin,
    contentWidth,
    pageWidth,
  });

  // 6. Tabela com AutoTable
  drawReportTable(doc, {
    columns,
    rows,
    startY: currentY,
    margin,
    contentWidth,
    autoTable,
  });

  // 7. Rodapé em todas as páginas
  drawFooter(doc, {
    margin,
    pageWidth,
    pageHeight,
  });

  // 8. Download no navegador (se em ambiente browser)
  if (typeof window !== "undefined") {
    doc.save(filename);
  }

  return doc;
}

