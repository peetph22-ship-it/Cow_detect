#!/usr/bin/env python3
"""
แปลงเอกสาร .md เป็น .html (และ .pdf ถ้าใส่ --pdf) ใช้หน้าตาเดียวกันทุกไฟล์
ต้องมี pandoc · PDF ใช้ Google Chrome แบบ headless

  python3 docs/tools/md_to_html.py docs/paper/CowCare_AI_scope_and_technology.md --pdf
  python3 docs/tools/md_to_html.py docs/COWCARE_PROJECT_MASTER_OVERVIEW.md

- หัวข้อ # แรก = ชื่อเอกสาร, ข้อความก่อน ## แรก = ส่วนหัว
- แต่ละ ## = การ์ด 1 ใบ (มีสารบัญให้อัตโนมัติ)
- [ต้องเติม ...] / [ต้องยืนยัน ...] / [ต้องเช็ก ...] = ป้ายสีเหลือง
- ```mermaid = แผนภาพ (โหลด mermaid จาก CDN)
- $...$ = สูตร (MathML)
"""
import argparse, base64, html, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js'


def pandoc(md_text):
    r = subprocess.run(['pandoc', '-f', 'markdown-smart', '-t', 'html5', '--mathml', '--wrap=none'],
                       input=md_text.encode('utf-8'), capture_output=True, check=True)
    return r.stdout.decode('utf-8')


def todo(h):
    # \[ต้องเติม: ...\] ใน md ถูก pandoc แปลงเป็น [ต้องเติม: ...]
    return re.sub(r'\[(ต้อง(?:เติม|ยืนยัน|เช็ก)[^\]]*)\]', r'<span class="todo">[\1]</span>', h)


def build(md_path, pdf):
    src = open(md_path, encoding='utf-8').read()
    m = re.match(r'\s*# (.+)\n', src)
    title = m.group(1).strip() if m else os.path.basename(md_path)
    body = src[m.end():] if m else src
    first_h2 = body.find('\n## ')
    intro, rest = (body[:first_h2], body[first_h2:]) if first_h2 >= 0 else (body, '')

    parts = re.split(r'\n(?=## )', rest)
    sections, toc = [], []
    for i, part in enumerate([p for p in parts if p.strip()], 1):
        hm = re.match(r'## (.+)', part.strip())
        heading = hm.group(1).strip() if hm else f'ส่วนที่ {i}'
        sid = f's{i}'
        toc.append(f'<li><a href="#{sid}">{html.escape(re.sub(r"^[0-9]+\\.\\s*", "", heading))}</a></li>')
        inner = pandoc(part)
        inner = re.sub(r'<table', '<div class="tbl"><table', inner).replace('</table>', '</table></div>')
        cls = ' class="en"' if re.search(r'English', heading) else ''
        sections.append(f'<section id="{sid}"{cls}>\n{inner}</section>')

    head_html = pandoc(intro)
    doc = '\n'.join(sections)
    doc = re.sub(r'<pre class="mermaid"><code>(.*?)</code></pre>', r'<pre class="mermaid">\1</pre>', doc, flags=re.S)
    has_mermaid = 'class="mermaid"' in doc
    # ฝังรูปในเครื่องลงไฟล์เลย (เปิดไฟล์ html เดี่ยว ๆ หรือส่งต่อแล้วรูปไม่หาย)
    base = os.path.dirname(os.path.abspath(md_path))
    def inline(mm):
        src = mm.group(1)
        f = os.path.join(base, src)
        if src.startswith(('http:', 'https:', 'data:')) or not os.path.exists(f):
            return mm.group(0)
        mime = {'.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg'}.get(os.path.splitext(f)[1].lower(), 'application/octet-stream')
        return 'src="data:%s;base64,%s"' % (mime, base64.b64encode(open(f, 'rb').read()).decode())
    doc = re.sub(r'src="([^"]+)"', inline, doc)
    out = f'''<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
{open(os.path.join(HERE, 'doc_fonts.html'), encoding='utf-8').read().strip()}
<style>
{open(os.path.join(HERE, 'doc_style.css'), encoding='utf-8').read()}
img {{ max-width: 100%; height: auto; background: #fff; border-radius: 8px; }}
figure {{ margin: 0; display: grid; gap: 6px; }} figcaption {{ color: var(--muted); font-size: .85rem; }}
blockquote {{ margin: 0; background: var(--accent-soft); border-radius: 10px; padding: 12px 16px; }}
@media print {{ body {{ background: #fff; padding: 0; }} section {{ break-inside: auto; }} nav {{ display: none; }} }}
</style>
</head>
<body>
<main>
<header style="display:grid;gap:10px">
  <h1>{html.escape(title)}</h1>
{todo(head_html)}
</header>
<nav aria-label="สารบัญ"><section>
  <h2 style="font-size:1.05rem">สารบัญ</h2>
  <ol>{''.join(toc)}</ol>
</section></nav>
{todo(doc)}
<footer>สร้างจาก {html.escape(os.path.basename(md_path))} ด้วย docs/tools/md_to_html.py</footer>
</main>
{f'<script src="{MERMAID}"></script><script>mermaid.initialize({{ startOnLoad: true, theme: "neutral" }});</script>' if has_mermaid else ''}
</body>
</html>
'''
    html_path = os.path.splitext(md_path)[0] + '.html'
    open(html_path, 'w', encoding='utf-8').write(out)
    print('wrote', html_path)
    if pdf:
        pdf_path = os.path.splitext(md_path)[0] + '.pdf'
        subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
                        '--virtual-time-budget=15000', f'--print-to-pdf={os.path.abspath(pdf_path)}',
                        'file://' + os.path.abspath(html_path)], check=True, capture_output=True)
        print('wrote', pdf_path)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('md', nargs='+')
    ap.add_argument('--pdf', action='store_true')
    a = ap.parse_args()
    for p in a.md:
        build(p, a.pdf)
