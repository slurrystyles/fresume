import { NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from "docx";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

export async function POST(request: Request) {
  try {
    const { resumeData, resumeId, userId } = await request.json();

    if (!resumeData) {
      return NextResponse.json(
        { success: false, error: "Resume data is required to build Word document." },
        { status: 400 }
      );
    }

    // Server-side check of export limits for non-premium (Free) tier
    if (supabase && resumeId && userId) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const isPro = subscription?.tier === "pro" && subscription?.status === "active" && (
        !subscription.ends_at || new Date(subscription.ends_at) > new Date()
      );

      if (!isPro) {
        // Find user's resumes
        const { data: userResumes } = await supabase
          .from('resumes')
          .select('id')
          .eq('user_id', userId);

        const resumeIds = userResumes?.map((r: any) => r.id) || [resumeId];

        // Count downloads for this month (Free limit: 3)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { count } = await supabase
          .from('exports')
          .select('*', { count: 'exact', head: true })
          .in('resume_id', resumeIds)
          .gte('created_at', startOfMonth);

        if (count !== null && count >= 3) {
          return NextResponse.json(
            { 
              success: false, 
              error: "Monthly free export limit exceeded (3 / month). Please upgrade to the Pro Ledger Plan for unlimited exports.",
              limitExceeded: true
            },
            { status: 403 }
          );
        }
      }
    }

    const name = resumeData.contact.name || "Resume";
    const filename = `${name.replace(/\s+/g, "_")}_Groundwork_Export.docx`;

    // Construct the children for the docx document
    const docChildren: any[] = [];

    // 1. Header (Name & Contact Info)
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: name.toUpperCase(),
            bold: true,
            size: 36, // 18pt
            font: "Calibri",
            color: "111111"
          })
        ]
      })
    );

    // Contact details string
    const contactParts = [
      resumeData.contact.location,
      resumeData.contact.phone,
      resumeData.contact.email
    ].filter(Boolean);
    if (resumeData.contact.linkedin_url) contactParts.push(resumeData.contact.linkedin_url);
    if (resumeData.contact.github_url) contactParts.push(resumeData.contact.github_url);

    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 }, // 12pt
        children: [
          new TextRun({
            text: contactParts.join("  |  "),
            size: 19, // 9.5pt
            font: "Calibri",
            color: "555555"
          })
        ]
      })
    );

    // Helper to add headings
    const addSectionHeading = (title: string) => {
      docChildren.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: title.toUpperCase(),
              bold: true,
              size: 22, // 11pt
              font: "Calibri",
              color: "222222"
            })
          ],
          border: {
            bottom: {
              color: "999999",
              space: 4,
              style: BorderStyle.SINGLE,
              size: 6 // 0.75pt
            }
          }
        })
      );
    };

    // 2. Summary
    if (resumeData.summary) {
      addSectionHeading("Professional Summary");
      docChildren.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: resumeData.summary,
              size: 21, // 10.5pt
              font: "Calibri",
              color: "333333"
            })
          ]
        })
      );
    }

    // 3. Experience
    if (resumeData.experience && resumeData.experience.length > 0) {
      addSectionHeading("Professional Experience");
      for (const exp of resumeData.experience) {
        // Experience Item table layout for Company/Title on Left, Dates on Right
        docChildren.push(
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `${exp.title}  |  ${exp.org}`,
                            bold: true,
                            size: 22, // 11pt
                            font: "Calibri",
                            color: "111111"
                          })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({
                            text: `${exp.start_date} - ${exp.end_date}`,
                            size: 20, // 10pt
                            font: "Calibri",
                            color: "555555"
                          })
                        ]
                      })
                    ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnSpan: 2,
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: exp.location,
                            italics: true,
                            size: 19, // 9.5pt
                            font: "Calibri",
                            color: "666666"
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        );

        // Bullets
        if (exp.bullets && exp.bullets.length > 0) {
          for (const b of exp.bullets) {
            docChildren.push(
              new Paragraph({
                bullet: {
                  level: 0
                },
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: b.text,
                    size: 21, // 10.5pt
                    font: "Calibri",
                    color: "333333"
                  })
                ]
              })
            );
          }
        }
        // Spacer
        docChildren.push(new Paragraph({ spacing: { after: 120 } }));
      }
    }

    // 4. Projects
    if (resumeData.projects && resumeData.projects.length > 0) {
      addSectionHeading("Projects");
      for (const proj of resumeData.projects) {
        docChildren.push(
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `${proj.title} (${proj.role})`,
                            bold: true,
                            size: 22,
                            font: "Calibri",
                            color: "111111"
                          })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({
                            text: `${proj.start_date} - ${proj.end_date}`,
                            size: 20,
                            font: "Calibri",
                            color: "555555"
                          })
                        ]
                      })
                    ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnSpan: 2,
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Technologies: ${proj.tech_stack.join(', ')}`,
                            italics: true,
                            size: 19,
                            font: "Calibri",
                            color: "666666"
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        );

        if (proj.bullets && proj.bullets.length > 0) {
          for (const b of proj.bullets) {
            docChildren.push(
              new Paragraph({
                bullet: {
                  level: 0
                },
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: b.text,
                    size: 21,
                    font: "Calibri",
                    color: "333333"
                  })
                ]
              })
            );
          }
        }
        docChildren.push(new Paragraph({ spacing: { after: 120 } }));
      }
    }

    // 5. Skills
    addSectionHeading("Technical Skills");
    const skillRows = [];
    if (resumeData.skills.technical && resumeData.skills.technical.length > 0) {
      skillRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Languages & Core:", bold: true, size: 21, font: "Calibri" })
                  ]
                })
              ]
            }),
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: resumeData.skills.technical.join(', '), size: 21, font: "Calibri" })
                  ]
                })
              ]
            })
          ]
        })
      );
    }
    if (resumeData.skills.tools && resumeData.skills.tools.length > 0) {
      skillRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Tools & Infrastructure:", bold: true, size: 21, font: "Calibri" })
                  ]
                })
              ]
            }),
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: resumeData.skills.tools.join(', '), size: 21, font: "Calibri" })
                  ]
                })
              ]
            })
          ]
        })
      );
    }
    if (resumeData.skills.soft && resumeData.skills.soft.length > 0) {
      skillRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Soft Skills:", bold: true, size: 21, font: "Calibri" })
                  ]
                })
              ]
            }),
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: resumeData.skills.soft.join(', '), size: 21, font: "Calibri" })
                  ]
                })
              ]
            })
          ]
        })
      );
    }

    if (skillRows.length > 0) {
      docChildren.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE }
          },
          rows: skillRows
        })
      );
    }

    // 6. Education
    if (resumeData.education && resumeData.education.length > 0) {
      addSectionHeading("Education");
      for (const edu of resumeData.education) {
        docChildren.push(
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `${edu.degree}  |  ${edu.institution}`,
                            bold: true,
                            size: 22,
                            font: "Calibri",
                            color: "111111"
                          })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({
                            text: edu.end_date,
                            size: 20,
                            font: "Calibri",
                            color: "555555"
                          })
                        ]
                      })
                    ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnSpan: 2,
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `${edu.location} ${edu.score ? `  |  Score: ${edu.score}` : ''}`,
                            italics: true,
                            size: 19,
                            font: "Calibri",
                            color: "666666"
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        );
        docChildren.push(new Paragraph({ spacing: { after: 120 } }));
      }
    }

    // Construct the document using Document class
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1080, // 0.75in in twips (1440 * 0.75)
                bottom: 1080,
                left: 1080,
                right: 1080
              }
            }
          },
          children: docChildren
        }
      ]
    });

    const docBuffer = await Packer.toBuffer(doc);

    return new Response(docBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });

  } catch (error: any) {
    console.error("DOCX generator route error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
