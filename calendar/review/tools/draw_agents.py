"""Generate standalone, readable SVG explanations without external dependencies."""
from pathlib import Path
from html import escape
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


class Drawing:
    def __init__(self, width, height, title, description):
        self.parts = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">
<title id="title">{escape(title)}</title><desc id="desc">{escape(description)}</desc>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#486277"/></marker></defs>
<rect width="{width}" height="{height}" fill="#f6f8fc"/>''']

    def text(self, x, y, label, size=18, bold=False, color='#24394e', center=False):
        self.parts.append(f'<text x="{x}" y="{y}" font-family="Arial, Helvetica, sans-serif" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}" text-anchor="{"middle" if center else "start"}">{escape(label)}</text>')

    def panel(self, x, y, w, h, fill='#eaf1fb', stroke='#b9cbe2'):
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="18" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>')

    def box(self, x, y, w, title, lines=(), h=95, fill='#ffffff'):
        self.panel(x, y, w, h, fill, '#b5c4d4')
        self.text(x+w/2, y+32, title, 20, True, center=True)
        for i, line in enumerate(lines):
            self.text(x+w/2, y+59+i*24, line, 17, center=True)

    def edge(self, points, dashed=False):
        coords = ' '.join(f'{x},{y}' for x,y in points)
        self.parts.append(f'<polyline points="{coords}" fill="none" stroke="#486277" stroke-width="2.2" stroke-linejoin="round" marker-end="url(#arrow)"'+(' stroke-dasharray="7 5"' if dashed else '')+'/>')

    def save(self, name):
        path = ROOT / name
        path.write_text('\n'.join(self.parts) + '\n</svg>\n')
        ET.parse(path)
        print(path)


d = Drawing(1320, 520, 'How an AI agent works', 'A goal leads to planning, tool use, checking results, and reporting. If more work is needed, the agent returns to planning.')
d.text(40, 52, 'How an AI agent works', 32, True)
d.text(40, 88, 'An agent chooses actions toward a goal and adjusts after seeing results.', 20)
for x, title, lines in [
    (40, '1. Your goal', ['Fix note saving']),
    (300, '2. Agent plans', ['Inspect and reproduce']),
    (560, '3. Agent uses tools', ['Read code · Edit · Test']),
    (820, '4. Agent checks', ['Did the fix work?']),
    (1080, '5. Agent reports', ['Evidence and limits']),
]:
    d.box(x, 185, 220, title, lines, h=110)
for x in [260, 520, 780, 1040]:
    d.edge([(x,240),(x+40,240)])
d.edge([(930,295),(930,370),(410,370),(410,295)])
d.text(670, 359, 'Needs more work: revise the plan and try again', 18, center=True)
d.text(1060, 170, 'Ready', 16)
d.text(40, 445, 'Tools perform operations. The agent decides which allowed operations to use.', 21, True)
d.text(40, 481, 'An agent can make mistakes; checks and review remain necessary.', 18)
d.save('agent-working-loop.svg')

d = Drawing(1360, 1500, 'Calendar: development agents and the optional app assistant', 'Development agents coordinate, design, implement, test, and review Calendar code. The finished app runs modules directly, with an optional assistant agent that calls reviewed tools.')
d.text(40, 52, 'Where agents work in Calendar', 32, True)
d.text(40, 87, 'Development agents build the product. An optional assistant agent helps users inside it.', 20)
d.box(450, 115, 460, 'YOU — product owner', ['Set goals, priorities, and important approvals'], h=95, fill='#fff2d8')
d.panel(30, 240, 1300, 630)
d.text(60, 278, '1. DEVELOPMENT AGENTS — work in Codex', 25, True)
d.edge([(680,210),(680,240),(1080,240),(1080,350),(900,350)])
d.box(460, 305, 440, 'Coordinator Agent', ['Plans tasks and coordinates integration'])
d.edge([(680,400),(680,435)])
d.box(460, 435, 440, 'Architecture Agent', ['Defines module boundaries and interfaces'])
for x, title, line in [(80,'Frontend Agent','Builds screens and interactions'),(480,'Calendar Logic Agent','Implements calculation rules'),(880,'Storage Agent','Builds notes, backups, and sync')]:
    d.box(x,570,360,title,[line])
d.edge([(680,530),(680,550),(260,550),(260,570)])
d.edge([(680,530),(680,570)])
d.edge([(680,550),(1060,550),(1060,570)])
d.box(260,725,360,'Testing Agent',['Runs checks and investigates failures'])
d.box(740,725,360,'Review Agent',['Checks changes, risks, and evidence'])
for x in [260,660,1060]:
    d.edge([(x,665),(x,695),(440,695),(440,725)])
d.edge([(620,772),(740,772)])
d.edge([(1100,772),(1270,772),(1270,350),(900,350)],True)
d.text(1260, 710, 'Revision', 16, center=True)
d.text(1260, 734, 'requests', 16, center=True)
d.text(60, 848, 'These roles produce code; they do not need to stay running for Calendar to work.', 18, True)
d.edge([(920,820),(920,920),(680,920),(680,990)])
d.text(690, 908, 'Reviewed code builds the product', 18)
d.panel(30, 950, 1300, 420, '#eaf5ef', '#b3d2c1')
d.text(60, 988, '2. FINISHED CALENDAR APP — runs on the user’s device', 25, True)
d.box(80,1030,330,'Calendar UI',['Month · Day details · Notes'],h=95)
d.box(520,1030,360,'Application modules',['Calculations · Notes · Search'],h=95)
d.box(980,1030,290,'Local data',['Notes and settings'],h=95)
d.edge([(410,1065),(520,1065)])
d.text(465,1048,'Taps',16,center=True)
d.edge([(880,1078),(980,1078)])
d.box(80,1210,440,'Optional Assistant Agent',['Understands requests; chooses tools'],h=100,fill='#f0eafa')
d.edge([(245,1125),(245,1210)])
d.text(265,1162,'Conversational request',17)
d.edge([(520,1240),(700,1240),(700,1125)])
d.text(720,1215,'Calls reviewed tools',17)
d.edge([(820,1125),(820,1280),(520,1280)],True)
d.text(840,1286,'Returns results',17)
d.text(60,1344,'Example request: “Find my travel notes from October.”',18)
d.text(40,1417,'AGENT = chooses actions toward a goal.     MODULE = executes a defined operation.',21,True)
d.text(40,1454,'Conceptual roles only: this diagram does not mean separate agents or the Assistant are currently running.',17)
d.save('calendar-agents-explained.svg')

d = Drawing(1440, 1430, 'Calendar: mobile-first and cross-device sync', 'Proposed first-release architecture. Each device has a React UI, deterministic calendar engines, local storage, and a durable sync queue. One shared service orders accepted changes. Changed records reach other devices. Replaced versions remain recoverable. Provider selection and implementation are pending.')
d.text(40, 52, 'Calendar — mobile-first, local-first, synchronized', 31, True)
d.text(40, 88, 'Updated proposal · 2026-11-16 · Basic cross-device sync is required in the first release', 20)

d.panel(30,120,1380,610,'#eaf5ef','#b3d2c1')
d.text(60,159,'FIRST RELEASE: preserve existing features and improve mobile usability',24,True)
for x, title in [(65,'DEVICE A — phone'),(945,'DEVICE B — tablet / computer')]:
    d.box(x,195,430,title,['React + TypeScript UI','Calendar · Notes · Shensha · Five languages'],h=115)
    d.box(x,355,430,'Local application services',['Deterministic calendar / GanZhi engines','Shensha rules · Notes · Settings'],h=110)
    d.box(x,510,430,'IndexedDB + durable sync queue',['Save locally immediately; work offline','Retry pending edits when connected'],h=110)
    d.edge([(x+215,310),(x+215,355)])
    d.edge([(x+215,465),(x+215,510)])
    d.text(x+215,665,'Saved locally ≠ synchronized',19,True,center=True)

d.box(550,365,340,'One shared sync service',['One verified provider first','Account isolation + revisions','Backend selection still pending'],h=145,fill='#fff2d8')
d.edge([(495,550),(525,550),(525,425),(550,425)])
d.edge([(890,425),(915,425),(915,550),(945,550)])
d.edge([(945,590),(900,590),(900,480),(890,480)])
d.edge([(550,480),(540,480),(540,590),(495,590)])
d.text(720,230,'Upload changed records',19,True,center=True)
d.text(720,261,'Download changes since last sync',18,center=True)
d.text(720,292,'Avoid repeated full-history transfers',17,center=True)
d.text(720,655,'Sync on edits, resume, reconnect,',17,center=True)
d.text(720,681,'manual request + measured refresh',17,center=True)

d.panel(30,765,1380,280,'#eaf1fb','#b9cbe2')
d.text(60,805,'LATEST SUCCESSFUL SYNC WINS — per record, using service-assigned order',23,True)
d.box(65,840,370,'1. Edit saved on device A',['Pending upload; safely stored locally'],h=95)
d.box(535,840,370,'2. Service accepts the edit',['Assigns a new authoritative revision'],h=95,fill='#fff2d8')
d.box(1005,840,370,'3. Device B receives it',['Both devices converge on that revision'],h=95)
d.edge([(435,888),(535,888)])
d.edge([(905,888),(1005,888)])
d.text(60,977,'An older offline edit accepted later can become the current version.',19,True)
d.text(60,1010,'Keep replaced versions for recovery. Deduplicate retries. Preserve unsaved drafts. Downloads do not create new edits.',18)

d.panel(30,1080,1380,225,'#f0eafa','#c8bde2')
d.text(60,1120,'DEVELOPMENT AGENTS — build and verify the app; outside the running product',23,True)
d.box(65,1150,285,'Coordinator + Architecture',['Scope · Interfaces · Integration'],h=95)
d.box(400,1150,285,'Implementation Agents',['Frontend · Logic · Storage / Sync'],h=95)
d.box(735,1150,285,'Testing + Review Agents',['Parity · Two-device · Recovery'],h=95)
d.box(1070,1150,305,'Release gate',['Evidence · Mobile checks'],h=95)
for x in [350,685,1020]:
    d.edge([(x,1198),(x+50,1198)])
d.text(40,1352,'LATER: additional provider choices, optional Assistant, and advanced integrations.',20,True)
d.text(40,1390,'Design proposal only. Existing Health Calendar remains unchanged. No replacement backend has been selected or verified.',17)
d.save('calendar-sync-first-architecture.svg')
