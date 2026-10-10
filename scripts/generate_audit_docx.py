import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'''
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="{top}" w:type="dxa"/>
            <w:bottom w:w="{bottom}" w:type="dxa"/>
            <w:left w:w="{left}" w:type="dxa"/>
            <w:right w:w="{right}" w:type="dxa"/>
        </w:tcMar>
    ''')
    tcPr.append(tcMar)

def set_table_borders(table, color="D1D5DB", sz="4"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:left w:val="none"/>
            <w:right w:val="none"/>
            <w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>
    ''')
    tblPr.append(borders)

def build_docx():
    doc = Document()

    # Set page margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Base style font
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(10.5)
    font.color.rgb = RGBColor(0x33, 0x41, 0x55) # Slate 700

    # Document Header Title
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(4)
    run_title = p_title.add_run("DATABASE USAGE & ARCHITECTURAL AUDIT")
    run_title.font.name = 'Calibri'
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A) # Slate 900

    # Subtitle
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(16)
    run_sub = p_sub.add_run("Forensic Analysis of PostgreSQL, MongoDB, and Redis Usage Across the Codebase")
    run_sub.font.size = Pt(12)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(0x64, 0x74, 0x8B) # Slate 500

    # Section 1: Executive Summary
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(14)
    h1.paragraph_format.space_after = Pt(6)
    r1 = h1.add_run("1. Executive Summary")
    r1.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    r1.font.bold = True

    p = doc.add_paragraph("This audit determined the exact usage, data ownership, dependencies, and runtime roles of PostgreSQL, MongoDB, and Redis across the entire platform repository.")
    p.paragraph_format.space_after = Pt(8)

    # Table: Executive Summary
    table_data = [
        ["Database / Service", "Container in Docker", "In package.json", "Used in Code", "Runtime Status", "Architectural Status"],
        ["PostgreSQL", "YES (nm_postgres:5432)", "YES (@prisma/client)", "YES (All 5 Services)", "ACTIVE & CONNECTED", "ACTIVE — Authoritative Primary DB"],
        ["MongoDB", "YES (nm_mongodb:27017)", "NO (0 packages)", "NO (0 models / queries)", "UNUSED BY APP", "CONFIGURED ONLY — Completely Unused"],
        ["Redis", "YES (nm_redis:6379)", "NO (0 packages)", "NO (0 queues / keys)", "UNUSED BY APP", "CONFIGURED ONLY — Completely Unused"],
    ]

    t = doc.add_table(rows=len(table_data), cols=len(table_data[0]))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t)

    col_widths = [Inches(1.2), Inches(1.3), Inches(1.1), Inches(1.2), Inches(1.2), Inches(1.8)]

    for r_idx, row in enumerate(t.rows):
        is_header = (r_idx == 0)
        for c_idx, cell in enumerate(row.cells):
            cell.width = col_widths[c_idx]
            cell.text = table_data[r_idx][c_idx]
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            set_cell_margins(cell, top=120, bottom=120, left=120, right=120)
            
            run = p.runs[0]
            run.font.name = 'Calibri'
            run.font.size = Pt(9.5)
            
            if is_header:
                set_cell_background(cell, "0F172A") # Slate 900
                run.font.bold = True
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            else:
                if r_idx % 2 == 1:
                    set_cell_background(cell, "F8FAFC")
                else:
                    set_cell_background(cell, "FFFFFF")
                if c_idx == 0:
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
                elif "ACTIVE" in cell.text:
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(0x16, 0x65, 0x34) # Emerald 800
                elif "CONFIGURED ONLY" in cell.text or "UNUSED" in cell.text:
                    run.font.color.rgb = RGBColor(0x99, 0x1B, 0x1B) # Rose 800

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # Section 2: PostgreSQL Audit
    h2 = doc.add_heading(level=1)
    h2.paragraph_format.space_before = Pt(16)
    h2.paragraph_format.space_after = Pt(6)
    r2 = h2.add_run("2. PostgreSQL Audit")
    r2.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    r2.font.bold = True

    p = doc.add_paragraph("PostgreSQL is the single authoritative database for the entire platform. All relational data, authentication records, candidate profiles, question bank datasets, interview execution records, AI evaluation snapshots, autopsy failure patterns, DNA skill progressions, and personalized improvement plans are persisted in PostgreSQL using Prisma ORM.")
    p.paragraph_format.space_after = Pt(8)

    pg_table_data = [
        ["Service", "Key Source Files", "Technology", "Models / Tables Accessed", "Purpose"],
        [
            "Auth Service",
            "schema.prisma\nIdentityRepository.ts\nSessionRepository.ts\nRefreshTokenRepository.ts",
            "Prisma ORM\n(@prisma/client)",
            "Identity, Role, Permission, IdentityRole, Session, RefreshToken, PasswordResetToken, AuditLog",
            "User credentials, password hashing, RBAC permissions, session tokens, refresh token rotation, password reset OTPs, security logs."
        ],
        [
            "User Service",
            "schema.prisma\nProfileRepository.ts\nEducationRepository.ts\nSkillRepository.ts\nResumeRepository.ts",
            "Prisma ORM\n(@prisma/client)",
            "Profile, StudentProfile, FacultyProfile, CareerProfile, AIPreferences, Education, ProfileSkill, Resume",
            "Candidate education, Naan Mudhalvan registration, career goals, AI interview parameters (strictness, hints), and uploaded resume text."
        ],
        [
            "Question Bank",
            "schema.prisma\nSearchService.ts\nQuestionManagementService.ts\nImportService.ts",
            "Prisma ORM\n(@prisma/client)",
            "Question, QuestionCategory, QuestionTopic, TestCase, ProgrammingLanguage, QuestionMetadata",
            "Curated question catalog (40 Coding, 15 Aptitude, 10 HR), categorized topics, test cases, code templates, and difficulty ratings."
        ],
        [
            "Interview Service",
            "schema.prisma\nInterviewSessionService.ts\nInterviewStageService.ts\nInterviewAutopsyService.ts\nInterviewDNAService.ts\nPersonalizedImprovementEngine.ts",
            "Prisma ORM\n(@prisma/client)",
            "Interview, InterviewSession, InterviewStage, StageCodingExecution, StageHrResponse, StageAptitudeAnswer, InterviewSnapshot",
            "Multi-round interview scheduling (Aptitude, Coding, HR), STT transcripts, AI corrections, rubrics, longitudinal DNA, Autopsy diagnostics, and Improvement Plans."
        ],
        [
            "Judge Service",
            "schema.prisma",
            "Prisma ORM\n(@prisma/client)",
            "ExecutionHistory, LanguageMapping",
            "Schema defined for execution logging and language ID mappings."
        ]
    ]

    t_pg = doc.add_table(rows=len(pg_table_data), cols=len(pg_table_data[0]))
    t_pg.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_pg)
    pg_widths = [Inches(1.2), Inches(1.6), Inches(1.1), Inches(1.8), Inches(2.1)]

    for r_idx, row in enumerate(t_pg.rows):
        is_header = (r_idx == 0)
        for c_idx, cell in enumerate(row.cells):
            cell.width = pg_widths[c_idx]
            cell.text = pg_table_data[r_idx][c_idx]
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            set_cell_margins(cell, top=100, bottom=100, left=100, right=100)
            run = p.runs[0]
            run.font.name = 'Calibri'
            run.font.size = Pt(9.0)
            if is_header:
                set_cell_background(cell, "0F172A")
                run.font.bold = True
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            else:
                set_cell_background(cell, "F8FAFC" if r_idx % 2 == 1 else "FFFFFF")
                if c_idx == 0:
                    run.font.bold = True

    # Section 3: MongoDB Audit
    h3 = doc.add_heading(level=1)
    h3.paragraph_format.space_before = Pt(16)
    h3.paragraph_format.space_after = Pt(6)
    r3 = h3.add_run("3. MongoDB Audit")
    r3.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    r3.font.bold = True

    p = doc.add_paragraph("Findings from project-wide forensic search for mongoose, mongodb, MongoClient, and MONGO_URI:")
    p.paragraph_format.space_after = Pt(4)

    bullet1 = doc.add_paragraph(style='List Bullet')
    bullet1.add_run("Dependencies: Zero MongoDB packages (mongodb or mongoose) are installed in any service package.json.")
    bullet2 = doc.add_paragraph(style='List Bullet')
    bullet2.add_run("Application Code: Zero connections (mongoose.connect / MongoClient), zero schemas, and zero collections exist.")
    bullet3 = doc.add_paragraph(style='List Bullet')
    bullet3.add_run("Data Storage: The docker-compose comment indicating MongoDB stores resumes and transcripts is superseded by PostgreSQL, which natively stores resumes (Resume model) and transcripts (StageHrResponse) using PostgreSQL Text/JSON types.")

    p_mongo_verdict = doc.add_paragraph()
    p_mongo_verdict.paragraph_format.space_before = Pt(6)
    p_mongo_verdict.paragraph_format.space_after = Pt(10)
    r_mv_label = p_mongo_verdict.add_run("Is MongoDB Actually Used? ")
    r_mv_label.font.bold = True
    r_mv_ans = p_mongo_verdict.add_run("NO — only Docker / configuration exists.")
    r_mv_ans.font.bold = True
    r_mv_ans.font.color.rgb = RGBColor(0x99, 0x1B, 0x1B)

    # Section 4: Redis Audit
    h4 = doc.add_heading(level=1)
    h4.paragraph_format.space_before = Pt(16)
    h4.paragraph_format.space_after = Pt(6)
    r4 = h4.add_run("4. Redis Audit")
    r4.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    r4.font.bold = True

    p = doc.add_paragraph("Findings from project-wide search for redis, ioredis, createClient, REDIS_URL, and BullMQ:")
    p.paragraph_format.space_after = Pt(4)

    bullet1 = doc.add_paragraph(style='List Bullet')
    bullet1.add_run("Dependencies: Zero Redis packages (redis, ioredis, bull, bullmq) are installed.")
    bullet2 = doc.add_paragraph(style='List Bullet')
    bullet2.add_run("Application Implementation: AdminService.ts explicitly reports status: 'DISABLED', isUsed: false, reason: 'Stateless JWT Architecture (No caching layer or Redis broker required)'.")
    bullet3 = doc.add_paragraph(style='List Bullet')
    bullet3.add_run("Execution Queuing: ExecutionQueue.ts in judge-service implements an in-memory Map counting semaphore rather than a distributed Redis queue.")

    p_redis_verdict = doc.add_paragraph()
    p_redis_verdict.paragraph_format.space_before = Pt(6)
    p_redis_verdict.paragraph_format.space_after = Pt(10)
    r_rv_label = p_redis_verdict.add_run("Is Redis Actually Used? ")
    r_rv_label.font.bold = True
    r_rv_ans = p_redis_verdict.add_run("NO — only Docker / configuration exists.")
    r_rv_ans.font.bold = True
    r_rv_ans.font.color.rgb = RGBColor(0x99, 0x1B, 0x1B)

    # Section 5: Answers to Audit Questions
    h5 = doc.add_heading(level=1)
    h5.paragraph_format.space_before = Pt(16)
    h5.paragraph_format.space_after = Pt(6)
    r5 = h5.add_run("5. Core Audit Verdict & Architecture Analysis")
    r5.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    r5.font.bold = True

    qa_list = [
        ("1. Why is PostgreSQL used in this project?", "PostgreSQL provides ACID transactions, relational integrity across candidate entities, and structured JSON/Text storage required for multi-round interviews, STT transcripts, rubrics, and longitudinal skill tracking."),
        ("2. Why is MongoDB in the project?", "It was defined in docker-compose.yml during initial project scaffolding under the assumption that NoSQL was required for unstructured documents. PostgreSQL's native JSON and Text capabilities satisfied all requirements, so MongoDB was never connected."),
        ("3. Why is Redis in the project?", "It was provisioned in docker-compose.yml for prospective session caching and BullMQ job queues. The application implemented a stateless JWT architecture and in-memory execution semaphores, leaving Redis unintegrated."),
        ("4. Which database is the primary authoritative database?", "PostgreSQL (nm_interview_db)."),
        ("5. Which database stores permanent data?", "PostgreSQL."),
        ("6. Which database stores temporary / cache / queue data?", "Temporary execution throttling is handled in-memory by Node.js (ExecutionQueue.ts); persistent session states reside in PostgreSQL."),
        ("7. Is MongoDB actually necessary?", "No. MongoDB is completely unused."),
        ("8. Is Redis actually necessary?", "No. Redis is completely unused in the current architecture."),
        ("9. Are any of the three databases currently redundant?", "Yes. Both MongoDB and Redis are redundant in the current implementation."),
        ("10. Can any database configuration safely be removed later?", "Yes. The mongodb and redis service blocks in docker-compose.yml, along with their volumes (mongo_data, redis_data) and environment variables (MONGO_*, REDIS_*), can be safely removed without affecting platform behavior.")
    ]

    for q, a in qa_list:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(2)
        rq = p.add_run(q)
        rq.font.bold = True
        rq.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        
        pa = doc.add_paragraph()
        pa.paragraph_format.space_before = Pt(0)
        pa.paragraph_format.space_after = Pt(6)
        ra = pa.add_run(a)
        ra.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    # Section 6: Recommended Actions
    h6 = doc.add_heading(level=1)
    h6.paragraph_format.space_before = Pt(16)
    h6.paragraph_format.space_after = Pt(6)
    r6 = h6.add_run("6. Recommended Next Actions")
    r6.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    r6.font.bold = True

    b1 = doc.add_paragraph(style='List Bullet')
    b1.add_run("Resource Optimization: Run 'docker stop nm_mongodb nm_redis' to reclaim memory and CPU cycles from the two unused containers.")
    b2 = doc.add_paragraph(style='List Bullet')
    b2.add_run("Configuration Cleanup: Prune unused MONGO_* and REDIS_* keys from .env and .env.example to streamline developer configuration.")
    b3 = doc.add_paragraph(style='List Bullet')
    b3.add_run("Database Strategy: Maintain PostgreSQL as the unified single-source-of-truth database for all relational, document, and analytics workloads.")

    # Save document
    out_path = "d:/MINI_PROJECT/DATABASE_USAGE_AUDIT.docx"
    doc.save(out_path)
    print("SUCCESS: Saved", out_path)

if __name__ == "__main__":
    build_docx()
