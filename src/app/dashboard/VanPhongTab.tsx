'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Project, Task, Brief, Department, Staff } from '../../lib/types';
import { buildRows } from '../../lib/workRows';
import { isDemoStaff } from '../../lib/permissions';
import { TC, room, buildFloors, fireworks } from '../../lib/office/scene';

// Tab VĂN PHÒNG — không gian 2.5D kiểu pixel, vui mắt, chỉ đọc dữ liệu OPM sẵn có (không gọi AI).
// Sàn = BĐS Miền Bắc / Trung / Nam / CORP · Phòng = dự án · Phòng làm việc = đầu việc (3 bàn: MKT/TTTH · ST · Dựng).
// Ai đang làm / ngồi chơi tính theo link brief + checklist:
//  A: chưa có link brief và Ban ST chưa tick bước nào → bàn MKT/TTTH gõ máy
//  B: đã có brief (hoặc ST đã tick) và chưa xong bước Duyệt kịch bản → Ban ST gõ máy, MKT/TTTH đi lại chờ
//  C: đã sang bước Check bản dựng TVC hoặc Dựng đã tick → ST + Dựng cùng gõ máy
//  done: bấm HOÀN THÀNH CÔNG VIỆC → mở phòng trong 3 ngày đầu thì cả phòng ăn mừng + bắn pháo hoa

type Team = 'mkt' | 'ttth' | 'st' | 'dung';
interface Person { n: string; full: string; team: Team; g: 'm' | 'f'; boss?: 'binh' | 'minh' | 'linh' }
interface Item {
  id: string;
  name: string;
  b: Person | null;
  st: Person | null;
  dg: Person | null;
  stage: 'A' | 'B' | 'C' | 'done';
  fresh: boolean;
  why: string;
  cl: [string, boolean][];
}
interface Proj { id: string; title: string; grp: string; items: Item[]; done: boolean }

const TEAM_BY_DEPT: Record<string, Team> = { 'Ban Marketing': 'mkt', 'Ban TTTH': 'ttth', 'Ban Sáng tạo': 'st', 'Team Dựng phim': 'dung' };
const THREE_DAYS = 3 * 24 * 3600 * 1000;
// 2 sếp lớn: nhân vật vẽ riêng + nhãn tên vàng gold
// + nhân vật riêng của chị Thảo Linh (váy đen, kính râm, xì gà có khói) — nhãn tên theo màu ban như mọi người
const BOSSES: Record<string, { key: 'binh' | 'minh' | 'linh'; label: string }> = {
  'Hoàng Thị Mỹ Bình': { key: 'binh', label: 'Lam Bình' },
  'Nguyễn Thị Ngọc Minh': { key: 'minh', label: 'Minh Nguyễn' },
  'Lê Thảo Linh': { key: 'linh', label: 'Thảo Linh' }
};
// Lãnh đạo ghé ngẫu nhiên: đổi danh sách mỗi 30 giây
const VISIT_EVERY = 30000;
function rand01(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Chuỗi CSS → style React (có cache vì nhiều chuỗi lặp lại)
const sxCache: Record<string, CSSProperties> = {};
function sx(s: string): CSSProperties {
  const hit = sxCache[s];
  if (hit) return hit;
  const o: Record<string, string> = {};
  s.split(';').forEach((d) => {
    const i = d.indexOf(':');
    if (i < 0) return;
    const k = d.slice(0, i).trim();
    if (!k) return;
    const key = k.indexOf('--') === 0 ? k : k.replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
    o[key] = d.slice(i + 1).trim();
  });
  sxCache[s] = o as CSSProperties;
  return o as CSSProperties;
}

const KEYFRAMES = `
@keyframes oNod{0%,100%{transform:translateY(0)}50%{transform:translateY(1px)}}
@keyframes oTypeP{0%{transform:translateY(0)}50%{transform:translateY(3px)}}
@keyframes oIdleP{0%,60%{transform:translateY(0)}70%,100%{transform:translateY(3px)}}
@keyframes oPace{0%,100%{transform:translate(calc(-1*var(--px)),calc(-1*var(--py)))}50%{transform:translate(var(--px),var(--py))}}
@keyframes oJump{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes oBob{0%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes oLegA{0%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes oLegB{0%{transform:translateY(-3px)}50%{transform:translateY(0)}}
@keyframes oSmokeL{0%{transform:translate(0,0) scale(.5);opacity:0}15%{opacity:.9}100%{transform:translate(-7px,-22px) scale(1.9);opacity:0}}
@keyframes oEmber{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes oGlow{0%,100%{opacity:.75}50%{opacity:1}}
@keyframes oWalk{from{transform:translate(0,0)}to{transform:translate(var(--dx),var(--dy))}}
@keyframes oFw{0%{transform:translate(0,0) scale(1.2);opacity:0}8%{opacity:1}75%{opacity:1}100%{transform:translate(var(--dx),calc(var(--dy) + 30px)) scale(.3);opacity:0}}
`;

/* eslint-disable @typescript-eslint/no-explicit-any */
function Chara({ c }: { c: any }) {
  return (
    <div style={sx(c.bb)}>
      <div style={sx(c.inner)}>
        <div style={sx(c.legL)} />
        <div style={sx(c.legR)} />
        <div style={sx(c.body)} />
        <div style={sx(c.armL)} />
        <div style={sx(c.armR)}>
          <div style={sx(c.cig)} />
          <div style={sx(c.ember)} />
          <div style={sx(c.sm1)} />
          <div style={sx(c.sm2)} />
          <div style={sx(c.sm3)} />
        </div>
        <div style={sx(c.head)} />
        <div style={sx(c.bub)}>{c.bubT}</div>
        <div style={sx(c.tag)}>{c.n}</div>
      </div>
    </div>
  );
}

function Scene({ r, stageStyle }: { r: any; stageStyle?: string }) {
  return (
    <div style={sx(stageStyle || r.stage)}>
      <div style={sx(r.wrap)}>
        {r.polys.map((g: any, i: number) => (
          <div key={i} style={sx(g.s)} />
        ))}
        {r.chars.map((c: any, i: number) => (
          <Chara key={'c' + i} c={c} />
        ))}
      </div>
    </div>
  );
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(1000);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const upd = () => setW(el.clientWidth || 1000);
    upd();
    const RO = (window as any).ResizeObserver;
    if (!RO) {
      window.addEventListener('resize', upd);
      return () => window.removeEventListener('resize', upd);
    }
    const ro = new RO(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

export default function VanPhongTab({
  projects,
  tasks,
  briefs,
  departments,
  allStaff
}: {
  projects: Project[];
  tasks: Task[];
  briefs: Brief[];
  departments: Department[];
  allStaff: Staff[];
}) {
  const [pid, setPid] = useState<string | null>(null);
  const [tid, setTid] = useState<string | null>(null);
  const [tick, setTick] = useState(() => Math.floor(Date.now() / VISIT_EVERY));
  useEffect(() => {
    const t = setInterval(() => setTick(Math.floor(Date.now() / VISIT_EVERY)), 5000);
    return () => clearInterval(t);
  }, []);
  const { ref, w } = useWidth();

  const { P, WK, LEADERS } = useMemo(() => {
    const deptName = (s: Staff) => s.department?.name || departments.find((d) => d.id === s.department_id)?.name || '';
    const lastCount: Record<string, number> = {};
    allStaff.forEach((s) => {
      const parts = s.name.trim().split(/\s+/);
      const l = parts[parts.length - 1];
      lastCount[l] = (lastCount[l] || 0) + 1;
    });
    const short = (name: string) => {
      const parts = name.trim().split(/\s+/);
      const l = parts[parts.length - 1];
      return lastCount[l] > 1 ? parts.slice(-2).join(' ') : l;
    };
    const ok = (s: Staff | null | undefined) =>
      !!s && (s as Staff & { is_active?: boolean }).is_active !== false && !isDemoStaff(s);
    const person = (s: Staff | null | undefined, fallback: Team): Person | null => {
      if (!ok(s)) return null;
      const st = s as Staff & { gender?: string | null };
      const bs = BOSSES[st.name];
      return { n: bs ? bs.label : short(st.name), full: st.name, team: TEAM_BY_DEPT[deptName(st)] || fallback, g: st.gender === 'Nữ' ? 'f' : 'm', boss: bs ? bs.key : undefined };
    };

    const now = Date.now();
    const rows = buildRows(projects, tasks, briefs, departments);
    const byProj: Record<string, Proj> = {};
    const order: string[] = [];
    rows.forEach((r) => {
      const stT = r.stTasks[0];
      const dgT = r.dungTasks[0];
      const b = person(r.mktStaff, 'mkt') || person(r.ttthStaff, 'ttth');
      const st = person(stT ? stT.st_assignee ?? stT.assignee : null, 'st');
      const dg = person(dgT ? dgT.dung_assignee ?? dgT.assignee : null, 'dung');
      // Checklist của mọi task đứng sau dòng này (không trùng)
      const seenT: Record<string, boolean> = {};
      const rowTasks: Task[] = [];
      [r.stTasks, r.dungTasks, r.backingTask ? [r.backingTask] : []].forEach((list) =>
        list.forEach((t) => {
          if (t && !seenT[t.id]) {
            seenT[t.id] = true;
            rowTasks.push(t);
          }
        })
      );
      const items = rowTasks
        .map((t) => (t.checklist_items || []).slice().sort((a, c) => a.sort_order - c.sort_order))
        .reduce((acc, l) => acc.concat(l), [] as NonNullable<Task['checklist_items']>);
      const anyChecked = (groups: string[]) => items.some((i) => i.checked && groups.indexOf(i.item_group) >= 0);
      const script = items.filter((i) => i.item_group === 'script');
      const started = anyChecked(['start', 'script', 'build', 'dung']);
      const toC = (script.length > 0 && script.every((i) => i.checked)) || anyChecked(['build', 'dung']);
      const hasBrief =
        !!r.brief || rowTasks.some((t) => !!t.brief_link) || !!(r.ttthTask && r.ttthTask.ttth_link) || !!(r.primaryTask && r.primaryTask.brief_link);
      const briefSent = hasBrief || started;
      let stage: Item['stage'];
      if (r.completed) stage = 'done';
      else if (b && !briefSent) stage = 'A';
      else if (toC) stage = 'C';
      else stage = 'B';
      const doneAt = (r.brief as (Brief & { completed_at?: string | null }) | null)?.completed_at ?? (r.backingTask as (Task & { completed_at?: string | null }) | null)?.completed_at ?? null;
      const fresh = stage === 'done' && !!doneAt && now - new Date(doneAt).getTime() <= THREE_DAYS;
      const why =
        stage === 'done'
          ? 'Đã bấm HOÀN THÀNH CÔNG VIỆC' + (fresh ? ' (trong 3 ngày gần đây)' : '')
          : stage === 'A'
            ? 'Chưa có link brief, Ban Sáng tạo chưa tick bước nào'
            : stage === 'B'
              ? (hasBrief ? 'Đã có link brief' : 'Chưa có link brief nhưng Ban Sáng tạo đã tick checklist') + ' · chưa xong bước Duyệt kịch bản'
              : 'Đã sang bước Check bản dựng TVC' + (anyChecked(['dung']) ? ' / Dựng đã tick' : '');
      const p = r.project;
      if (!byProj[p.id]) {
        byProj[p.id] = { id: p.id, title: p.title, grp: p.group_name || '', items: [], done: false };
        order.push(p.id);
      }
      byProj[p.id].items.push({
        id: r.key,
        name: r.headline || '(Chưa đặt tên)',
        b,
        st,
        dg,
        stage,
        fresh,
        why,
        cl: items.map((i) => [i.label, i.checked] as [string, boolean])
      });
    });
    const P = order
      .map((id) => byProj[id])
      .map((p) => {
        p.items.sort((a, c) => (a.stage === 'done' ? 1 : 0) - (c.stage === 'done' ? 1 : 0) || a.name.localeCompare(c.name, 'vi'));
        p.done = p.items.every((i) => i.stage === 'done');
        return p;
      })
      .sort((a, c) => a.title.localeCompare(c.title, 'vi'));

    // Người đi lại trong hành lang: nhân sự thật của 4 team, xen kẽ team
    const pools: Record<Team, Person[]> = { st: [], mkt: [], dung: [], ttth: [] };
    allStaff
      .filter((s) => ok(s) && !(s as Staff & { resigned?: boolean }).resigned)
      .slice()
      .sort((a, c) => a.name.localeCompare(c.name, 'vi'))
      .forEach((s) => {
        const t = TEAM_BY_DEPT[deptName(s)];
        if (t) pools[t].push(person(s, t)!);
      });
    const WK: Person[] = [];
    for (let i = 0; i < 4 && WK.length < 12; i++) {
      (['st', 'mkt', 'dung', 'ttth'] as Team[]).forEach((t) => {
        if (pools[t][i] && WK.length < 12) WK.push(pools[t][i]);
      });
    }
    if (!WK.length) WK.push({ n: '', full: '', team: 'st', g: 'm' });
    // Lãnh đạo rảnh (Cấp lãnh đạo, không có tên trong đầu việc nào đang làm) → đi lại ngẫu nhiên.
    // Lãnh đạo đang có việc thì ngồi bàn như bình thường, không đi lại.
    const busy: Record<string, boolean> = {};
    P.forEach((p) => p.items.forEach((it) => {
      if (it.stage === 'done') return;
      [it.b, it.st, it.dg].forEach((pp) => { if (pp) busy[pp.full] = true; });
    }));
    const LEADERS: Person[] = allStaff
      .filter((s) => ok(s) && !(s as Staff & { resigned?: boolean }).resigned && s.permission === 'Cấp lãnh đạo' && !busy[s.name] && (!!TEAM_BY_DEPT[deptName(s)] || deptName(s) === 'Ban Lãnh đạo'))
      .map((s) => person(s, 'st')!)
      .sort((a, c) => a.full.localeCompare(c.full, 'vi'));
    return { P, WK, LEADERS };
  }, [projects, tasks, briefs, departments, allStaff]);

  const proj = P.find((p) => p.id === pid) || null;
  const item = proj ? proj.items.find((i) => i.id === tid) || null : null;
  const view: 'map' | 'proj' | 'room' = item ? 'room' : proj ? 'proj' : 'map';

  // Chọn ngẫu nhiên lãnh đạo ghé 1 chỗ: thường 0–2 người, đôi khi cả nhóm
  const visitorsFor = (key: string, cap: number): Person[] => {
    if (!LEADERS.length) return [];
    const r = rand01(key + '|' + tick);
    const n = r < 0.3 ? 0 : r < 0.65 ? 1 : r < 0.9 ? 2 : LEADERS.length;
    return LEADERS.map((p, i) => ({ p, k: rand01(key + '|' + tick + '|' + i) }))
      .sort((a, b) => a.k - b.k)
      .slice(0, Math.min(n, cap))
      .map((x) => x.p);
  };
  const floors = useMemo(
    () => (view === 'map' ? buildFloors(P, WK, (id: string) => { setPid(id); setTid(null); }, w, (fi: number) => visitorsFor('floor' + fi, 6)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, P, WK, w, LEADERS, tick]
  );
  const cards = useMemo(
    () => (proj && view === 'proj' ? proj.items.map((it) => ({ it, r: room(it, 0.68, false, { visitors: visitorsFor('room' + it.id, 4) }) })) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [proj, view, LEADERS, tick]
  );
  const roomScale = Math.min(1.5, Math.max(0.6, (Math.min(w, 760) - 24) / 380));
  const roomV = useMemo(
    () => (item ? room(item, roomScale, false, { big: true, visitors: visitorsFor('room' + item.id, 4) }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item, roomScale, LEADERS, tick]
  );
  const party = !!item && item.stage === 'done' && item.fresh;
  const fw = useMemo(() => (party ? fireworks() : []), [party]);

  const STAT = (it: Item) =>
    it.stage === 'A'
      ? (it.b ? TC[it.b.team].name : 'Ban MKT/TTTH') + ' đang làm brief'
      : it.stage === 'B'
        ? 'Đã gửi brief · Ban Sáng tạo đang làm'
        : it.stage === 'C'
          ? it.dg
            ? 'Ban Sáng tạo + Team Dựng đang làm'
            : 'Ban Sáng tạo đang check bản dựng'
          : 'Hoàn thành';
  const CHIP: Record<string, [string, string]> = { A: ['#FCE4EE', '#B8456F'], B: ['#ECE8FF', '#5A41D6'], C: ['#DDF4F2', '#137A73'], done: ['#E6F2E7', '#256628'] };
  const chip = (stg: string): CSSProperties => ({ alignSelf: 'flex-start', fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: CHIP[stg][0], color: CHIP[stg][1] });
  const dot = (team: Team): CSSProperties => ({ width: 9, height: 9, borderRadius: '50%', flex: '0 0 auto', background: TC[team].c });
  const crumbBtn = (on: boolean): CSSProperties => ({ border: 'none', background: 'transparent', padding: 0, fontFamily: 'inherit', fontSize: 13, cursor: on ? 'pointer' : 'default', color: on ? 'var(--accent-ink, var(--accent))' : 'var(--text)', fontWeight: on ? 500 : 600 });
  const openCount = P.filter((p) => !p.done).length;
  const deskName: Record<string, string> = { b: 'Bàn brief', st: 'Bàn Sáng tạo', dg: 'Bàn Dựng' };
  const actName: Record<string, string> = { type: 'đang gõ máy', idle: 'ngồi chơi', pace: 'đi lại chờ', party: 'ăn mừng' };

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      <style>{KEYFRAMES}</style>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted)' }}>
            <button onClick={() => { setPid(null); setTid(null); }} style={crumbBtn(view !== 'map')}>Văn phòng</button>
            {proj && (
              <>
                <span>›</span>
                <button onClick={() => setTid(null)} style={crumbBtn(view === 'room')}>{proj.title}</button>
              </>
            )}
            {item && (
              <>
                <span>›</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{item.name}</span>
              </>
            )}
          </div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3, color: 'var(--text)' }}>{item ? item.name : proj ? proj.title : 'Văn phòng'}</h2>
          <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>
            {item
              ? 'Phòng làm việc · 3 bàn: MKT/TTTH · Ban Sáng tạo · Team Dựng'
              : proj
                ? proj.items.length + ' phòng làm việc (mỗi đầu việc 1 phòng) · bấm vào 1 phòng để xem chi tiết'
                : openCount + ' dự án đang có việc · ' + (P.length - openCount) + ' dự án đã xong (tắt đèn)'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--muted)' }}>
          {(['mkt', 'ttth', 'st', 'dung'] as Team[]).map((k) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={dot(k)} />
              {TC[k].name}
            </span>
          ))}
        </div>
      </div>

      {view === 'map' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {floors.map((fl: any, fi: number) => (
            <section key={fi} style={{ borderRadius: 16, border: '1px solid var(--border)', background: 'radial-gradient(ellipse at 50% 45%, #FFFFFF 0%, #EEF0F3 75%)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', padding: '14px 18px 0' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#FFFFFF', background: '#1B1F24', padding: '3px 9px', borderRadius: 6, letterSpacing: 0.4 }}>{fl.no}</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#1B1F24' }}>{fl.t}</span>
                <span style={{ fontSize: 12.5, color: '#5B6470' }}>{fl.count}</span>
              </div>
              <div style={sx(fl.stage)}>
                <div style={sx(fl.wrap)}>
                  {fl.polys.map((g: any, i: number) => <div key={'p' + i} style={sx(g.s)} />)}
                  {fl.tiles.map((t: any, i: number) => <div key={'t' + i} onClick={t.open} style={sx(t.s)} />)}
                  {fl.chars.map((c: any, i: number) => <Chara key={'c' + i} c={c} />)}
                  {fl.walkers.map((wk: any, i: number) => (
                    <div key={'w' + i} style={sx(wk.track)}>
                      <Chara c={wk.ch} />
                    </div>
                  ))}
                  {fl.plates.map((m: any, i: number) => (
                    <div key={'m' + i} onClick={m.open} style={sx(m.box)}>
                      <div style={sx(m.plate)}>
                        <div style={sx(m.pTitle)}>{m.title}</div>
                        <div style={sx(m.pSub)}>{m.sub}</div>
                      </div>
                    </div>
                  ))}
                  {fl.empty && (
                    <div style={{ position: 'absolute', left: -120, top: -14, width: 240, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#8A9099', zIndex: 9000 }}>Chưa có dự án</div>
                  )}
                </div>
              </div>
            </section>
          ))}
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            Mỗi sàn là 1 khối BĐS / CORP · mỗi phòng là 1 dự án · bấm vào phòng để xem các phòng làm việc · phòng tối = dự án đã xong hết việc
          </span>
        </div>
      )}

      {view === 'proj' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
          {cards.map(({ it, r }) => (
            <button
              key={it.id}
              onClick={() => setTid(it.id)}
              style={{ display: 'flex', flexDirection: 'column', padding: 0, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontFamily: 'inherit', overflow: 'hidden', textAlign: 'left' }}
            >
              <Scene r={r} stageStyle={'position:relative;height:178px;width:100%;background:' + (it.stage === 'done' ? '#F2F7F2' : '#F6F7F9') + ';overflow:hidden;'} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px 12px' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{it.name}</span>
                <span style={chip(it.stage)}>{STAT(it)}</span>
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', fontSize: 12, color: 'var(--muted)' }}>
                  {[it.b, it.st, it.dg].filter(Boolean).map((pp, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={dot(pp!.team)} />
                      {pp!.n}
                    </span>
                  ))}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {view === 'room' && item && roomV && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div
            style={{
              position: 'relative',
              flex: '1 1 520px',
              minWidth: 0,
              height: Math.round(360 * roomScale / 1.5 + 160),
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid var(--border)',
              background: party ? 'radial-gradient(ellipse at 50% 30%, #2B3350 0%, #151A2B 80%)' : 'radial-gradient(ellipse at 50% 40%, #FFFFFF 0%, #EEF0F3 75%)'
            }}
          >
            <Scene r={roomV} />
            {fw.map((s, i) => <div key={'f' + i} style={sx(s)} />)}
            {party && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: 18, textAlign: 'center', fontSize: 20, fontWeight: 800, color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.35)' }}>
                🎉 Hoàn thành công việc!
              </div>
            )}
          </div>
          <div style={{ flex: '1 1 280px', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, color: 'var(--text)' }}>
            <span style={chip(item.stage)}>{STAT(item)}</span>
            <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>Vì sao: {item.why}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([['b', item.b], ['st', item.st], ['dg', item.dg]] as [string, Person | null][])
                .filter((x) => x[1])
                .map(([rk, pp]) => {
                  const d = roomV.desks[rk === 'b' ? 0 : rk === 'st' ? 1 : 2];
                  return (
                    <div key={rk} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, flexWrap: 'wrap' }}>
                      <span style={dot(pp!.team)} />
                      <span style={{ fontWeight: 600 }}>{pp!.full}</span>
                      <span style={{ color: 'var(--muted)' }}>
                        · {deskName[rk]} · {actName[d.mode] || ''}
                      </span>
                    </div>
                  );
                })}
            </div>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.4 }}>CHECKLIST TRÊN OPM</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {item.cl.length === 0 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>Chưa có checklist</span>}
              {item.cl.map(([l, c], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      flex: '0 0 auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                      color: '#FFFFFF',
                      background: c ? '#2E7D32' : 'transparent',
                      boxShadow: c ? 'none' : 'inset 0 0 0 1.5px var(--border)'
                    }}
                  >
                    {c ? '✓' : ''}
                  </span>
                  <span style={{ color: c ? 'var(--text)' : 'var(--muted)' }}>{l}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setTid(null)}
              style={{ height: 36, borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit' }}
            >
              ← Về phòng dự án
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
