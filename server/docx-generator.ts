import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  ShadingType,
} from 'docx';

export interface DocxPaperData {
  title: string;
  instituteName?: string;
  subject?: string;
  examType?: string;
  duration?: string;
  totalMarks?: string | number;
  instructions?: string[];
  questions?: Array<{
    number: number | string;
    textEn: string;
    textHi?: string;
    optionsEn?: string[];
    optionsHi?: string[];
    correctOption?: string;
    marks?: number | string;
    solution?: string;
  }>;
  rawContent?: string;
}

export async function generateDocxBuffer(data: DocxPaperData): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  const instituteName = data.instituteName || 'JARVIS ACADEMY';
  const testTitle = data.title || 'NEET / JEE Practice Assessment';
  const subject = data.subject || 'All Subjects';
  const examType = data.examType || 'NEET / JEE';
  const duration = data.duration || '60 Mins';
  const totalMarks = data.totalMarks || (data.questions ? data.questions.length * 4 : '100');

  // 1. Header Banner
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: instituteName.toUpperCase(),
          bold: true,
          size: 32, // 16pt
          color: '1E3A8A', // Deep blue
          font: 'Calibri',
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: testTitle,
          bold: true,
          size: 26, // 13pt
          color: '0F172A',
          font: 'Calibri',
        }),
      ],
    })
  );

  // 2. Questions Render OR General Document Render
  if (data.questions && data.questions.length > 0) {
    // 2a. Meta Info Table (Exam, Subject, Time, Marks)
    const metaTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Target Exam: ', bold: true, size: 20 }),
                    new TextRun({ text: examType, size: 20 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Subject: ', bold: true, size: 20 }),
                    new TextRun({ text: subject, size: 20 }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Time Allowed: ', bold: true, size: 20 }),
                    new TextRun({ text: duration, size: 20 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Maximum Marks: ', bold: true, size: 20 }),
                    new TextRun({ text: String(totalMarks), size: 20 }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    children.push(metaTable);

    children.push(
      new Paragraph({
        spacing: { before: 200, after: 120 },
        children: [
          new TextRun({
            text: 'GENERAL INSTRUCTIONS / सामान्य निर्देश:',
            bold: true,
            size: 20,
            color: '334155',
          }),
        ],
      })
    );

    const defaultInstructions = data.instructions && data.instructions.length > 0
      ? data.instructions
      : [
          '1. All questions are compulsory. Each correct answer carries +4 marks.',
          '2. For each incorrect answer, 1 mark will be deducted (-1 negative marking).',
          '3. Read both English and Hindi versions carefully before answering.',
        ];

    for (const inst of defaultInstructions) {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: inst,
              size: 18,
              color: '475569',
              italics: true,
            }),
          ],
        })
      );
    }

    // Divider
    children.push(
      new Paragraph({
        spacing: { before: 100, after: 200 },
        border: {
          bottom: { color: 'CBD5E1', size: 6, style: BorderStyle.SINGLE },
        },
        children: [],
      })
    );

    // 3. Questions List
    for (const q of data.questions) {
      // Question Number & English Text
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 60 },
          children: [
            new TextRun({
              text: `Q.${q.number}  `,
              bold: true,
              size: 22,
              color: '1E293B',
            }),
            new TextRun({
              text: q.textEn,
              bold: true,
              size: 20,
              color: '0F172A',
            }),
          ],
        })
      );

      // Hindi Translation Text (if present)
      if (q.textHi && q.textHi.trim()) {
        children.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: `      (हिन्दी): ${q.textHi}`,
                size: 20,
                color: '334155',
              }),
            ],
          })
        );
      }

      // Options (A, B, C, D)
      if (q.optionsEn && q.optionsEn.length > 0) {
        for (let i = 0; i < q.optionsEn.length; i++) {
          const optLetter = String.fromCharCode(65 + i); // A, B, C, D
          const optTextEn = q.optionsEn[i];
          const optTextHi = q.optionsHi && q.optionsHi[i] ? ` / ${q.optionsHi[i]}` : '';

          children.push(
            new Paragraph({
              spacing: { after: 40 },
              indent: { left: 400 },
              children: [
                new TextRun({
                  text: `(${optLetter}) `,
                  bold: true,
                  size: 20,
                  color: '2563EB',
                }),
                new TextRun({
                  text: `${optTextEn}${optTextHi}`,
                  size: 20,
                  color: '1E293B',
                }),
              ],
            })
          );
        }
      }

      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [],
        })
      );
    }

    // 4. Answer Key Section
    children.push(
      new Paragraph({
        spacing: { before: 280, after: 120 },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: '--- ANSWER KEY / उत्तर कुंजी ---',
            bold: true,
            size: 24,
            color: '1E3A8A',
          }),
        ],
      })
    );

    // Build Answer Key Table (e.g. 5 questions per row)
    const keyRows: TableRow[] = [];
    const questionsWithKeys = data.questions.filter((q) => q.correctOption);

    if (questionsWithKeys.length > 0) {
      const chunkSize = 5;
      for (let i = 0; i < questionsWithKeys.length; i += chunkSize) {
        const slice = questionsWithKeys.slice(i, i + chunkSize);
        const headerCells: TableCell[] = [];
        const answerCells: TableCell[] = [];

        for (const item of slice) {
          headerCells.push(
            new TableCell({
              shading: { fill: 'E2E8F0', type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `Q.${item.number}`, bold: true, size: 18 })],
                }),
              ],
            })
          );

          answerCells.push(
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: item.correctOption || '-', bold: true, size: 20, color: '16A34A' })],
                }),
              ],
            })
          );
        }

        keyRows.push(new TableRow({ children: headerCells }));
        keyRows.push(new TableRow({ children: answerCells }));
      }

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: keyRows,
        })
      );
    }

    // 5. Detailed Solutions (if any)
    const hasSolutions = data.questions.some((q) => q.solution);
    if (hasSolutions) {
      children.push(
        new Paragraph({
          spacing: { before: 300, after: 120 },
          children: [
            new TextRun({
              text: 'HINTS & DETAILED SOLUTIONS / विस्तृत हल:',
              bold: true,
              size: 22,
              color: '1E3A8A',
            }),
          ],
        })
      );

      for (const q of data.questions) {
        if (q.solution) {
          children.push(
            new Paragraph({
              spacing: { before: 80, after: 40 },
              children: [
                new TextRun({ text: `Q.${q.number} Solution: `, bold: true, size: 18, color: '2563EB' }),
                new TextRun({ text: q.solution, size: 18, color: '334155' }),
              ],
            })
          );
        }
      }
    }
  } else if (data.rawContent) {
    // If raw text format is provided, split by paragraphs
    const paragraphs = data.rawContent.split('\n');
    for (const p of paragraphs) {
      if (p.trim()) {
        children.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: p,
                size: 20,
              }),
            ],
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
