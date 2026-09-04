/**
 * exportWorkoutPdf.js
 * 
 * Utilitário especializado para exportar a ficha de treinos completa do aluno
 * em formato PDF profissional utilizando jsPDF + jspdf-autotable.
 * Roda estritamente no lado do cliente (client-side) com importações dinâmicas.
 */

const WEEK_DAYS = [
  { key: "MONDAY", label: "Seg", fullLabel: "Segunda-feira" },
  { key: "TUESDAY", label: "Ter", fullLabel: "Terça-feira" },
  { key: "WEDNESDAY", label: "Qua", fullLabel: "Quarta-feira" },
  { key: "THURSDAY", label: "Qui", fullLabel: "Quinta-feira" },
  { key: "FRIDAY", label: "Sex", fullLabel: "Sexta-feira" },
  { key: "SATURDAY", label: "Sáb", fullLabel: "Sábado" },
  { key: "SUNDAY", label: "Dom", fullLabel: "Domingo" },
];

/**
 * Utilitário de exportação de ficha de treino
 * 
 * @param {Object} params
 * @param {string} params.studentName Nome do aluno
 * @param {string} params.planName Plano de assinatura atual
 * @param {string} params.status Status da assinatura (Ativo, Vencida, etc.)
 * @param {Array} params.workouts Fichas de treino do aluno
 */
export default async function exportWorkoutPdf({
  studentName,
  planName = "—",
  status = "—",
  workouts = [],
}) {
  if (typeof window === "undefined") {
    console.warn("A exportação de PDF só é permitida no ambiente do navegador (client-side).");
    return;
  }

  // 1. Carregar dinamicamente jsPDF e jspdf-autotable
  const { jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default;

  // 2. Instanciar o jsPDF
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

  // Nome do documento
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(26, 26, 26); // #1A1A1A
  doc.text("Ficha de Treino Semanal Completa", margin, 27);

  // Metadados do Aluno e Exportação
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // #64748B

  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR") + " " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  let metaY = 19;
  doc.text(`Aluno: ${studentName}`, pageWidth - margin, metaY, { align: "right" });
  doc.text(`Plano: ${planName}`, pageWidth - margin, metaY + 4, { align: "right" });
  doc.text(`Situação: ${status}`, pageWidth - margin, metaY + 8, { align: "right" });
  doc.text(`Data de exportação: ${dateStr}`, pageWidth - margin, metaY + 12, { align: "right" });

  // Linha divisória
  let currentY = 44;
  doc.setDrawColor(226, 232, 240); // #E2E8F0
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // ─── CONTEÚDO SEMANAL POR DIA ───
  WEEK_DAYS.forEach((day) => {
    const workout = workouts.find((w) => w.weekDay === day.key);

    // Evitar que o cabeçalho do dia e a tabela fiquem espremidos no final da página
    if (currentY > 235) {
      doc.addPage();
      currentY = 20;
    }

    // Título do dia
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(192, 57, 43); // #C0392B
    doc.text(day.fullLabel.toUpperCase(), margin, currentY);
    
    // Subtítulo (Meta/Foco do treino)
    if (workout?.title) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Foco: ${workout.title}`, margin + 50, currentY);
    }
    
    currentY += 4.5;

    if (!workout || !workout.exercises || workout.exercises.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184); // #94A3B8
      doc.text("Nenhum exercício cadastrado para este dia.", margin, currentY);
      currentY += 10;
    } else {
      const headers = ["Exercício", "Grupo Muscular", "Séries", "Repetições", "Descanso", "Observações/Instruções"];
      const body = workout.exercises.map((ex) => [
        ex.name || "—",
        ex.muscle || "—",
        String(ex.sets || "—"),
        String(ex.reps || "—"),
        `${ex.restSeconds}s`,
        ex.notes || "—"
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [headers],
        body: body,
        theme: "striped",
        headStyles: {
          fillColor: [26, 26, 26], // Preto (#1A1A1A)
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          cellPadding: 2.5,
        },
        bodyStyles: {
          fontSize: 7.5,
          cellPadding: 2,
          textColor: [51, 65, 85],
          valign: "middle",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        styles: {
          font: "helvetica",
          lineWidth: 0.1,
          lineColor: [226, 232, 240],
        },
        margin: { left: margin, right: margin },
      });

      // Atualizar Y para a próxima seção
      currentY = doc.lastAutoTable.finalY + 9;
    }
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
  const cleanName = studentName.toLowerCase().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  doc.save(`treino-completo-${cleanName}.pdf`);
}
