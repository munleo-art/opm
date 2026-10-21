// @ts-nocheck
// Văn phòng 2.5D kiểu pixel — toàn bộ hình vẽ là div + clip-path/box-shadow (không ảnh, không 3D CSS)
// để nhẹ và chạy ổn trên mọi trình duyệt/iPhone. Các hàm trả về chuỗi CSS, VanPhongTab đổi sang style React.
/* eslint-disable */
export const TC = { mkt: { c: '#E5679B', d: '#B8456F', t: '#FCE4EE', name: 'Ban Marketing' }, ttth: { c: '#F0A830', d: '#A86F0E', t: '#FDF1DC', name: 'Ban TTTH' }, st: { c: '#7B61FF', d: '#5A41D6', t: '#ECE8FF', name: 'Ban Sáng tạo' }, dung: { c: '#1FA9A0', d: '#137A73', t: '#DDF4F2', name: 'Team Dựng phim' } };
export const HAIR = ['#2B2B33', '#4A3426', '#1E1E24', '#6B4A2F', '#3A2A20'];
export const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997; return h; };
// Phép chiếu 2.5D (iso) thuần 2D: không dùng 3D CSS để chạy ổn trên mọi trình duyệt / iPhone
export const pr = (x, y, z) => [(x - y) * 0.7071, (x + y) * 0.3536 - (z || 0) * 0.866];
export const r1 = (v) => Math.round(v * 10) / 10;
export const mkPoly = (ox, oy) => (pts, bg, z, extra) => {
  const q = pts.map(p => pr(p[0], p[1], p[2]));
  const xs = q.map(p => p[0]), ys = q.map(p => p[1]);
  const mx = Math.min.apply(null, xs), my = Math.min.apply(null, ys);
  return { s: 'position:absolute;left:' + r1(mx - ox) + 'px;top:' + r1(my - oy) + 'px;width:' + r1(Math.max.apply(null, xs) - mx) + 'px;height:' + r1(Math.max.apply(null, ys) - my) + 'px;clip-path:polygon(' + q.map(p => r1(p[0] - mx) + 'px ' + r1(p[1] - my) + 'px').join(',') + ');background:' + bg + ';z-index:' + z + ';' + (extra || '') };
};
export const at = (ox, oy, x, y, z) => { const p = pr(x, y, z); return [p[0] - ox, p[1] - oy]; };
// Nhân vật pixel art (12 x 20 ô, mỗi ô 3px) vẽ bằng box-shadow: rất nhẹ, không cần ảnh
export const PX = 3;
export const HEADS = {
  short: ['...HHHHHH...', '..HHHHHHHH..', '..HSSSSSSH..', '..SSESSESS..', '..SSSSSSSS..', '..SSSMMSSS..', '...SSSSSS...', '....SSSS....'],
  long: ['...HHHHHH...', '.HHHHHHHHHH.', '.HHSSSSSSHH.', '.HSSESSESSH.', '.HSSSSSSSSH.', '.HSSSMMSSSH.', '.HHSSSSSSHH.', '.HH.SSSS.HH.'],
  curly: ['.HHHHHHHHHH.', 'HHHHHHHHHHHH', 'HHHSSSSSSHHH', 'HHSSESSESSHH', '.HSSSSSSSSH.', '..SSSMMSSS..', '...SSSSSS...', '....SSSS....'],
  cap: ['...CCCCCC...', '..CCCCCCCCCC', '..HSSSSSSH..', '..SSESSESS..', '..SSSSSSSS..', '..SSSMMSSS..', '...SSSSSS...', '....SSSS....'],
  beard: ['...HHHHHH...', '..HHHHHHHH..', '..HSSSSSSH..', '..SSESSESS..', '..SSSSSSSS..', '..SHHMMHHS..', '...HHHHHH...', '....SSSS....'],
  buns: ['HH.HHHHHH.HH', 'HHHHHHHHHHHH', '..HSSSSSSH..', '..SSESSESS..', '..SSSSSSSS..', '..SSSMMSSS..', '...SSSSSS...', '....SSSS....'],
  spiky: ['..H.HH.HH...', '..HHHHHHHH..', '..HHSSSSSH..', '..SSESSESS..', '..SSSSSSSS..', '..SSSMMSSS..', '...SSSSSS...', '....SSSS....'],
  bob: ['...HHHHHH...', '..HHHHHHHH..', '.HHHHHHHHHH.', '.HSSESSESSH.', '.HSSSSSSSSH.', '.HSSSMMSSSH.', '..HSSSSSSH..', '....SSSS....'],
  pony: ['...HHHHHH...', '..HHHHHHHHH.', '..HSSSSSSHHH', '..SSESSESSHH', '..SSSSSSSS.H', '..SSSMMSSS.H', '...SSSSSS...', '....SSSS....']
};
export const MALE_H = ['short', 'cap', 'beard', 'spiky'], FEMALE_H = ['long', 'buns', 'bob', 'pony'];
export const TORSO = { plain: ['...TTTTTT...', '..TTTTTTTT..', '...TTTTTT...', '...TTTTTT...', '...TTTTTT...', '...TTTTTT...', '...PPPPPP...'],
  stripe: ['...TTTTTT...', '..TTTTTTTT..', '...DDDDDD...', '...TTTTTT...', '...DDDDDD...', '...TTTTTT...', '...PPPPPP...'],
  jacket: ['...TTKKTT...', '..TTTKKTTT..', '...TTKKTT...', '...TTKKTT...', '...TTKKTT...', '...TTKKTT...', '...PPPPPP...'],
  dress: ['...TTTTTT...', '..TTTTTTTT..', '...TTTTTT...', '...DDDDDD...', '...TTTTTT...', '..TTTTTTTT..', '..TTTTTTTT..'] };
export const SKIN = ['#F6D3B3', '#EBB991', '#C98E63', '#8E5B3C'];
export const HAIRC = ['#1E1E24', '#4A2E1E', '#7A4A2A', '#E8B931', '#9C3B22'];
export const PANTS = ['#1F2A6B', '#2F3542', '#3D6FD6', '#24262B'];
export const SHOES = ['#141414', '#141414', '#E23B50', '#141414'];
export const pix = (rows, map) => {
  const out = [];
  rows.forEach((row, r) => { for (let c = 0; c < row.length; c++) { const col = map[row[c]]; if (col) out.push((c * PX + PX / 2) + 'px ' + (r * PX + PX / 2) + 'px 0 ' + (PX / 2 + 0.35) + 'px ' + col); } });
  return out.join(',');
};
// 2 sếp lớn: nhân vật vẽ riêng (da trắng, trang phục riêng, nhãn tên vàng gold)
export const BOSS = {
  linh: {
    head: ['...HHHHHH...', '.HHHHHHHHHH.', '.HHSSSSSSHH.', '.HOOObbOOOH.', '.HSOOSSOOSH.', '.HSSSLLSSSH.', '.HHSSSSSSHH.', '.HH.SSSS.HH.'],
    torso: ['.HHkkkkkkHH.', '.HkkkkkkkkH.', '..kkkkkkkk..', '..kkqkkkkk..', '...kkkkkk...', '..kkkkkkkk..', '..kkkkkkkk..'],
    arm: ['S', 'S', 'S', 'S'], leg: ['kkkk', 'kkkk', '.SS.', '.SS.', '.BB.'], legX: [2, 6], cigar: true,
    map: { H: '#0E0E10', S: '#FFE6D5', O: '#0B0B0D', b: '#3A3A40', L: '#B0102A', k: '#16161A', q: '#34343C', B: '#0B0B0D' }
  },
  binh: { gold: true,
    head: ['...HHHHHH...', '..HHHHHHHHH.', '..HHSSSSSHH.', '..HSESSESSH.', '..SpSSSSpS..', '.GSSSLLSSSG.', '...SSSSSS...', '....SSSS....'],
    torso: ['..SSSSSSSS..', '..RRRRRRRR..', '...RRRRRR...', '...RrrrrR...', '...RRRRRR...', '..RRRRRRRR..', '..RRRRRRRR..'],
    arm: ['S', 'S', 'S', 'S'], leg: ['RRRRRRRR', 'RRRRRRRR', 'RRRRRRRR', 'RRRRRRRR', '..BB..BB'], legR: [], legX: [2, 6],
    map: { H: '#2A1A14', S: '#FFE6D5', E: '#1E1E24', p: '#F6B3B3', R: '#D81E3A', r: '#A8102A', L: '#C8102E', G: '#E8C25A', B: '#C8102E' }
  },
  minh: { gold: true,
    head: ['...HHHHHH...', '.HHHHHHHHHH.', '.HHSSSSSSHH.', '.HSSESSESSH.', '.HSRSSSSRSH.', '.HSSSLLSSSH.', '.HHSSSSSSHH.', '.HH.SSSS.HH.'],
    torso: ['.HHVVWWVVHH.', '.HVVVWWVVVH.', '..VVVWWVVV..', '..VVVVVVVV..', '..VVVVGVVV..', '..VVVVVVVV..', '...PPPPPP...'],
    arm: ['V', 'V', 'V', 'S'], leg: ['PPP', 'PPP', 'PPP', 'PPP', 'BBB'], legX: [3, 6],
    map: { H: '#3A2418', S: '#FFE6D5', E: '#1E1E24', R: '#F4A7A7', L: '#C8102E', V: '#1F2A44', W: '#FFFFFF', G: '#E8C25A', P: '#2B2F3A', B: '#141414' }
  }
};
export const part = (left, top, extra) => 'position:absolute;left:' + left + 'px;top:' + top + 'px;width:0;height:0;' + (extra || '');
// mode: type | idle | pace | party | walk
export const chara = (person, x, y, s, mode, opts, zi) => {
  const o = opts || {}; const t = TC[person.team] || TC.st; const seed = hash(person.full || person.n);
  const stand = mode === 'pace' || mode === 'party' || mode === 'walk' || !!o.stand || !!o.still;
  const delay = '-' + ((seed % 10) / 10) + 's';
  const fem = person.g === 'f';
  const headK = (fem ? FEMALE_H : MALE_H)[seed % 4];
  const torsoK = fem && (seed >> 2) % 2 === 0 ? 'dress' : ['plain', 'stripe', 'jacket'][(seed >> 2) % 3];
  const map = { H: HAIRC[(seed >> 1) % HAIRC.length], S: SKIN[(seed >> 3) % SKIN.length], E: '#1E1E24', M: '#8A3B2E', C: t.d, T: t.c, D: t.d, K: '#FFFFFF', P: PANTS[(seed >> 4) % PANTS.length], B: SHOES[(seed >> 5) % SHOES.length] };
  const inner = 'position:absolute;left:32px;bottom:0;width:36px;height:60px;' + ({
    type: 'animation:oNod .6s steps(1) infinite;animation-delay:' + delay + ';',
    idle: 'animation:oIdleP 2.4s steps(1) infinite;animation-delay:' + delay + ';',
    pace: '--px:15px;--py:6px;animation:oPace 2.6s steps(8) infinite;animation-delay:' + delay + ';',
    party: 'animation:oJump .6s steps(3) infinite;animation-delay:' + delay + ';',
    walk: 'animation:oBob .4s steps(1) infinite;'
  })[mode];
  // Ngồi: hạ thân xuống 4 ô (chân khuất sau bàn)
  const dy = stand ? 0 : 4 * PX;
  const legAnim = (a) => (mode === 'pace' || mode === 'walk') ? 'animation:' + a + ' ' + (mode === 'walk' ? '.4s' : '.5s') + ' steps(1) infinite;' : '';
  const armAnim = (side) => mode === 'type' ? 'animation:oTypeP .26s steps(1) infinite;animation-delay:' + (side ? '-.13s' : '0s') + ';' : mode === 'party' ? 'transform:rotate(180deg);transform-origin:' + (side ? '0' : '3px') + ' 0;' : '';
  const boss = person.boss ? BOSS[person.boss] : null;
  const armRows = ['T', 'T', 'T', 'S'];
  const legRows = torsoK === 'dress' ? ['.S.', '.S.', '.S.', '.S.', 'BBB'] : ['PPP', 'PPP', 'PPP', 'PPP', 'BBB'];
  const bub = o.still || o.nobub || (boss && mode === 'pace') ? '' : { type: '', idle: '☕', pace: '⏳', party: '🎉', walk: '' }[mode];
  return {
    n: person.n,
    bb: 'position:absolute;left:' + r1(x - 50) + 'px;top:' + r1(y - 96) + 'px;width:100px;height:96px;transform-origin:50% 100%;transform:scale(' + s + ');pointer-events:none;z-index:' + (zi || 100) + ';',
    inner: o.still ? inner.replace(/animation:[^;]*;/g, '') : inner,
    head: part(0, dy, 'box-shadow:' + pix(boss ? boss.head : HEADS[headK], boss ? boss.map : map) + ';'),
    hair: 'display:none;', eyeL: 'display:none;', eyeR: 'display:none;',
    body: part(0, dy + 8 * PX, 'box-shadow:' + pix(boss ? boss.torso : TORSO[torsoK], boss ? boss.map : map) + ';'),
    armL: part((boss && boss.cigar ? 10 : 1) * PX, dy + 9 * PX, 'box-shadow:' + (boss ? pix(boss.arm, boss.map) : pix(armRows, { T: t.c, S: map.S })) + ';' + armAnim(0)),
    armR: boss && boss.cigar
      ? part(1 * PX, dy + 5 * PX, 'box-shadow:' + pix(['S', 'S', 'S', 'S', 'k', 'k'], boss.map) + ';')
      : part(10 * PX, dy + 9 * PX, 'box-shadow:' + (boss ? pix(boss.arm, boss.map) : pix(armRows, { T: t.c, S: map.S })) + ';' + armAnim(1)),
    legL: part((boss ? boss.legX[0] : 3) * PX, 15 * PX, 'display:' + (stand ? 'block' : 'none') + ';box-shadow:' + (boss ? pix(boss.leg, boss.map) : pix(legRows, map)) + ';' + (boss && boss.legR ? '' : legAnim('oLegA'))),
    legR: part((boss ? boss.legX[1] : 6) * PX, 15 * PX, 'display:' + (stand && !(boss && boss.legR) ? 'block' : 'none') + ';box-shadow:' + (boss ? pix(boss.leg, boss.map) : pix(legRows, map)) + ';' + legAnim('oLegB')),
    bub: 'position:absolute;top:' + ((o.tag ? -34 : -18) + dy) + 'px;left:28px;font-size:13px;display:' + (bub ? 'block' : 'none') + ';',
    bubT: bub,
    // xì gà trên tay phải + khói phì phèo (chỉ nhân vật có cigar)
    cig: 'position:absolute;left:-8px;top:1px;width:9px;height:3px;background:#6B3E1F;box-shadow:inset -2px 0 0 #8A5530;display:' + (boss && boss.cigar ? 'block' : 'none') + ';',
    ember: 'position:absolute;left:-10px;top:1px;width:2px;height:3px;background:#FF5A1F;box-shadow:0 0 4px 1px rgba(255,120,40,.85);animation:oEmber 1.6s steps(2) infinite;display:' + (boss && boss.cigar ? 'block' : 'none') + ';',
    sm1: 'position:absolute;left:-13px;top:-5px;width:5px;height:5px;border-radius:50%;background:rgba(210,214,220,.85);animation:oSmokeL 2.4s ease-out infinite;display:' + (boss && boss.cigar ? 'block' : 'none') + ';',
    sm2: 'position:absolute;left:-13px;top:-5px;width:5px;height:5px;border-radius:50%;background:rgba(210,214,220,.8);animation:oSmokeL 2.4s ease-out infinite;animation-delay:-.8s;display:' + (boss && boss.cigar ? 'block' : 'none') + ';',
    sm3: 'position:absolute;left:-13px;top:-5px;width:5px;height:5px;border-radius:50%;background:rgba(210,214,220,.75);animation:oSmokeL 2.4s ease-out infinite;animation-delay:-1.6s;display:' + (boss && boss.cigar ? 'block' : 'none') + ';',
    tag: 'position:absolute;top:' + (-16 + dy) + 'px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;background:' + (boss && boss.gold ? 'linear-gradient(180deg,#FFE58A,#E8B923)' : t.t) + ';color:' + (boss && boss.gold ? '#5A3E00' : t.d) + ';box-shadow:0 0 0 1.5px ' + (boss && boss.gold ? '#B8860B' : t.c) + ';display:' + (o.tag ? 'block' : 'none') + ';font-family:ui-monospace,Menlo,monospace;'
  };
};

// Cây chậu pixel (vẽ bằng box-shadow, chân giữa đặt tại điểm X,Y)
export const PLANTS = {
  snake: ['..G...G.', '..G..GG.', '.GG..G..', '.G.GGG.G', '.GGgGG.G', '..GGgGG.', '..GGGG..', '..gGGg..', '.KKKKKK.', '.KLLLLK.', '..KKKK..'],
  bush: ['..gggg..', '.gGGGGg.', 'gGGlGGGg', 'gGGGGlGg', 'gGlGGGGg', 'ggGGGGgg', '.gggggg.', '...tt...', '..KKKK..', '.KLLLLK.', '..KKKK..'],
  palm: ['G.G..G.G', '.GGGGGG.', 'GGgGGgGG', '..GggG..', '.G.gg.G.', '...tt...', '...tt...', '...tt...', '.KKKKKK.', '.KLLLLK.', '..KKKK..']
};
export const plant = (kind, X, Y, sc, z, dark) => {
  const mp = dark ? { G: '#2F4A3A', g: '#24382C', l: '#3A5A47', t: '#4A3A2C', K: '#3A3F48', L: '#454B55' } : { G: '#4CAF50', g: '#2E7D32', l: '#8BD48E', t: '#7A5230', K: '#2A8C8C', L: '#3FB3B3' };
  const rows = PLANTS[kind];
  return { s: 'position:absolute;left:' + r1(X - 12 * sc) + 'px;top:' + r1(Y - rows.length * 3 * sc) + 'px;width:0;height:0;transform:scale(' + sc + ');transform-origin:0 0;z-index:' + z + ';box-shadow:' + pix(rows, mp) + ';' };
};

// Phòng làm việc kiểu pixel: sàn gỗ, tường xanh, 3 bàn (MKT/TTTH · Ban Sáng tạo · Team Dựng)
export const W = 240, WH = 70;
export const room = (it, k, dark, opt) => {
  const big = !!(opt && opt.big);
  const stg = it.stage;
  const ox = 0, oy = ((W * 2 * 0.3536) - WH * 0.866) / 2;
  const poly = mkPoly(ox, oy);
  const AT = (x, y, z) => at(ox, oy, x, y, z);
  const C = dark
    ? { floor: '#4A4540', plank: '#423D38', edgeA: '#2A2522', edgeB: '#221E1B', wL: '#3B4049', wR: '#333944', base: '#2C3038', line: '#1E2126', win: '#262A31', frame: '#4A4F5A', wood: '#4E4438', woodD: '#3F372D', woodT: '#5A4E40', leg: '#3A322A', lap: '#2A2D33', chair: '#1E2126', paper: '#4A4F5A', ink: '#3A3F48', art: '#3A4450', cork: '#5A4A3A', books: ['#4A3A3A', '#3A4A5A', '#4A4A3A'] }
    : { floor: '#F4C68C', plank: '#EDB678', edgeA: '#8A6446', edgeB: '#6E4F37', wL: '#EAF4F8', wR: '#A9BEDD', base: '#D6E3EA', line: '#3A3F4A', win: '#BFE3F5', frame: '#FFFFFF', wood: '#8B5A3C', woodD: '#6E432C', woodT: '#A06A47', leg: '#6E432C', lap: '#AEB6C0', chair: '#2B2F36', paper: '#FFFFFF', ink: '#3A3F4A', art: '#2A9D9D', cork: '#E07A3F', books: ['#E23B50', '#3D6FD6', '#F0A830', '#2E7D32', '#7B61FF'] };
  const polys = [
    // sàn + viền dày phía trước
    poly([[0, W, 0], [W, W, 0], [W, W, -7], [0, W, -7]], C.edgeA, 0),
    poly([[W, 0, 0], [W, W, 0], [W, W, -7], [W, 0, -7]], C.edgeB, 0),
    poly([[0, 0, 0], [W, 0, 0], [W, W, 0], [0, W, 0]], C.floor, 1)
  ];
  for (let i = 0; i < 12; i += 2) polys.push(poly([[0, i * 20 + 10, 0], [W, i * 20 + 10, 0], [W, i * 20 + 20, 0], [0, i * 20 + 20, 0]], C.plank, 1));
  // tường trái (x=0) và tường phải (y=0), chân tường, viền đậm
  polys.push(poly([[0, 0, 0], [0, W, 0], [0, W, WH], [0, 0, WH]], C.wL, 2));
  polys.push(poly([[0, 0, 0], [W, 0, 0], [W, 0, WH], [0, 0, WH]], C.wR, 2));
  polys.push(poly([[0, 0, 0], [0, W, 0], [0, W, 4], [0, 0, 4]], C.base, 3));
  polys.push(poly([[0, 0, 0], [W, 0, 0], [W, 0, 4], [0, 0, 4]], C.base, 3));
  polys.push(poly([[0, 0, WH], [0, W, WH], [-6, W, WH], [-6, -6, WH], [W, -6, WH], [W, 0, WH]], C.line, 4));
  polys.push(poly([[-6, W, -7], [0, W, -7], [0, W, WH], [-6, W, WH]], C.line, 4));
  polys.push(poly([[W, -6, -7], [W, 0, -7], [W, 0, WH], [W, -6, WH]], C.line, 4));
  polys.push(poly([[0, 0, 0], [0, 0, WH], [0, 1.5, WH], [0, 1.5, 0]], C.line, 4));
  // tường trái: lịch, tranh biểu đồ, bảng ghim
  const onL = (y1, y2, z1, z2, c, zi) => poly([[0, y1, z1], [0, y2, z1], [0, y2, z2], [0, y1, z2]], c, zi || 5);
  polys.push(onL(34, 58, 20, 54, C.ink), onL(35.5, 56.5, 21.5, 52.5, C.paper, 6));
  [26, 32, 38, 44].forEach(zz => polys.push(onL(38, 54, zz, zz + 2.5, C.ink, 7)));
  polys.push(onL(76, 108, 32, 54, C.art), onL(79, 105, 35, 51, '#7FD3E0', 6), onL(84, 88, 36, 44, '#3D6FD6', 7), onL(91, 95, 36, 48, '#3D6FD6', 7), onL(98, 102, 36, 41, '#3D6FD6', 7));
  polys.push(onL(128, 166, 26, 58, C.cork));
  [[132, 142, 44, 54], [148, 158, 46, 55], [136, 146, 30, 40], [152, 162, 31, 41]].forEach(n => polys.push(onL(n[0], n[1], n[2], n[3], C.paper, 6)));
  // tường phải: cửa sổ, tranh
  const onR = (x1, x2, z1, z2, c, zi) => poly([[x1, 0, z1], [x2, 0, z1], [x2, 0, z2], [x1, 0, z2]], c, zi || 5);
  polys.push(onR(118, 178, 20, 60, C.frame), onR(121, 147, 23, 57, C.win, 6), onR(150, 175, 23, 57, C.win, 6));
  if (!dark) polys.push(poly([[124, 0, 30], [130, 0, 30], [140, 0, 50], [134, 0, 50]], '#FFFFFF', 7), poly([[154, 0, 28], [158, 0, 28], [168, 0, 48], [164, 0, 48]], '#FFFFFF', 7));
  polys.push(onR(192, 222, 30, 50, '#C0392B'), onR(195, 219, 33, 47, '#F6D58E', 6), onR(199, 211, 35, 41, '#E07A3F', 7));
  // tủ sách sát tường phải
  const bx = 28, bw = 44, bd = 16, bh = 62, zb = 100 + bx + bw + bd;
  polys.push(poly([[bx + bw, 0, 0], [bx + bw, bd, 0], [bx + bw, bd, bh], [bx + bw, 0, bh]], C.woodD, zb));
  polys.push(poly([[bx, bd, 0], [bx + bw, bd, 0], [bx + bw, bd, bh], [bx, bd, bh]], C.wood, zb));
  polys.push(poly([[bx, 0, bh], [bx + bw, 0, bh], [bx + bw, bd, bh], [bx, bd, bh]], C.woodT, zb));
  [[34, 58], [6, 30]].forEach(([z1, z2], si) => {
    polys.push(poly([[bx + 3, bd, z1], [bx + bw - 3, bd, z1], [bx + bw - 3, bd, z2], [bx + 3, bd, z2]], C.woodD, zb + 1));
    for (let b = 0; b < 6; b++) { const x1 = bx + 5 + b * 6, ht = z2 - 4 - (b % 3) * 3; polys.push(poly([[x1, bd, z1], [x1 + 4.5, bd, z1], [x1 + 4.5, bd, ht], [x1, bd, ht]], C.books[(b + si) % C.books.length], zb + 2)); }
  });
  // cây chậu
  const p1 = AT(20, W - 22, 0), p2 = AT(W - 20, 22, 0), p3 = AT(104, 14, 0);
  polys.push(plant('snake', p1[0], p1[1], 1.2, 100 + 20 + W - 22, dark));
  polys.push(plant('palm', p2[0], p2[1], 1.2, 100 + W, dark));
  polys.push(plant('bush', p3[0], p3[1], 1, 100 + 120, dark));

  const modeOf = (role) => {
    if (opt && opt.modes) return opt.modes[role];
    if (stg === 'done') return big && it.fresh ? 'party' : 'idle';
    if (role === 'b') return stg === 'A' ? 'type' : 'pace';
    if (role === 'st') return stg === 'B' || stg === 'C' ? 'type' : 'idle';
    return stg === 'C' ? 'type' : 'idle';
  };
  const chars = [], desks = [];
  [['b', it.b, 18], ['st', it.st, 94], ['dg', it.dg, 170]].forEach(([role, person, x0]) => {
    const y0 = 124, dw = 52, dd = 28, h = 22, th = 3;
    const mode = person ? modeOf(role) : null;
    const stand = mode === 'pace' || mode === 'party';
    const zd = 100 + Math.round(x0 + dw + y0 + dd);
    // chân bàn
    [[x0 + 2, y0 + dd - 2], [x0 + dw - 2, y0 + dd - 2], [x0 + dw - 2, y0 + 2]].forEach(([lx, ly], li) => {
      polys.push(poly([[lx - 2, ly, 0], [lx + 1, ly, 0], [lx + 1, ly, h], [lx - 2, ly, h]], C.leg, zd - (li === 2 ? 2 : 0)));
    });
    // tấm che chân phía trước + mặt bàn dày
    polys.push(poly([[x0 + 3, y0 + dd - 3, 8], [x0 + dw - 3, y0 + dd - 3, 8], [x0 + dw - 3, y0 + dd - 3, h], [x0 + 3, y0 + dd - 3, h]], C.woodD, zd - 1));
    polys.push(poly([[x0, y0 + dd, h - th], [x0 + dw, y0 + dd, h - th], [x0 + dw, y0 + dd, h], [x0, y0 + dd, h]], C.woodD, zd));
    polys.push(poly([[x0 + dw, y0, h - th], [x0 + dw, y0 + dd, h - th], [x0 + dw, y0 + dd, h], [x0 + dw, y0, h]], C.leg, zd));
    polys.push(poly([[x0, y0, h], [x0 + dw, y0, h], [x0 + dw, y0 + dd, h], [x0, y0 + dd, h]], C.woodT, zd));
    // máy tính để bàn (pixel) ở góc phải bàn, bàn phím + chuột trước mặt, cốc bút + cốc nước, tủ ngăn kéo
    const typing = mode === 'type';
    const MON = typing
      ? ['.FFFFFFFFF.', 'FSSSSSSSSSF', 'FSLLLLS.SSF', 'FSSLLLLLSSF', 'FSLLLSSSSSF', 'FSSLLLLSSSF', 'FSSSSSSSSSF', '.FFFFFFFFF.', '....fff....', '...fffff...']
      : ['.FFFFFFFFF.', 'FDDDDDDDDDF', 'FDDDDDDDDDF', 'FDDDDDDDDDF', 'FDDDDDDDDDF', 'FDDDDDDDDDF', 'FDDDDDDDDDF', '.FFFFFFFFF.', '....fff....', '...fffff...'];
    const monMap = dark ? { F: '#4A4F5A', f: '#3A3F48', S: '#1A1E24', L: '#2A3340', D: '#15181D' } : { F: '#E9E2CC', f: '#BDB49A', S: '#2D6CC0', L: '#BFE3FF', D: '#1E2A3A' };
    const mp = AT(x0 + dw - 3, y0 + 2, h);
    polys.push({ s: 'position:absolute;left:' + r1(mp[0] - 11.5) + 'px;top:' + r1(mp[1] - 22) + 'px;width:0;height:0;transform:scale(.7);transform-origin:0 0;z-index:' + (zd + 1) + ';box-shadow:' + pix(MON, monMap) + ';' + (typing ? 'animation:oGlow 1.4s steps(2) infinite;' : '') });
    polys.push(poly([[x0 + 6, y0 + 13, h], [x0 + 24, y0 + 13, h], [x0 + 24, y0 + 21, h], [x0 + 6, y0 + 21, h]], dark ? '#3A3F48' : '#D9D4C4', zd + 1));
    polys.push(poly([[x0 + 7, y0 + 14, h], [x0 + 23, y0 + 14, h], [x0 + 23, y0 + 17, h], [x0 + 7, y0 + 17, h]], dark ? '#30343C' : '#BDB49A', zd + 1));
    polys.push(poly([[x0 + 28, y0 + 16, h], [x0 + 32, y0 + 16, h], [x0 + 32, y0 + 21, h], [x0 + 28, y0 + 21, h]], dark ? '#3A3F48' : '#E9E2CC', zd + 1));
    const pc = AT(x0 + dw - 16, y0 + dd - 6, h);
    polys.push({ s: 'position:absolute;left:' + r1(pc[0] - 3) + 'px;top:' + r1(pc[1] - 8) + 'px;width:6px;height:8px;background:' + (dark ? '#4A3A3A' : '#C0392B') + ';box-shadow:-1px -3px 0 -1px #F0A830,2px -4px 0 -1px #3D6FD6;z-index:' + (zd + 1) + ';' });
    const cp = AT(x0 + 8, y0 + dd - 6, h);
    polys.push({ s: 'position:absolute;left:' + r1(cp[0] - 3) + 'px;top:' + r1(cp[1] - 7) + 'px;width:6px;height:7px;background:#FFFFFF;box-shadow:inset 0 2px 0 #7A4A2A;z-index:' + (zd + 1) + ';' });
    // tủ ngăn kéo dưới bàn bên phải
    const dx0 = x0 + dw - 18;
    polys.push(poly([[dx0, y0 + dd - 1, 0], [x0 + dw - 1, y0 + dd - 1, 0], [x0 + dw - 1, y0 + dd - 1, h - 3], [dx0, y0 + dd - 1, h - 3]], C.wood, zd));
    polys.push(poly([[x0 + dw - 1, y0 + 3, 0], [x0 + dw - 1, y0 + dd - 1, 0], [x0 + dw - 1, y0 + dd - 1, h - 3], [x0 + dw - 1, y0 + 3, h - 3]], C.woodD, zd));
    [3, 9, 15].forEach(z1 => {
      polys.push(poly([[dx0 + 1.5, y0 + dd - 1, z1 + 4.5], [x0 + dw - 2.5, y0 + dd - 1, z1 + 4.5], [x0 + dw - 2.5, y0 + dd - 1, z1 + 5.5], [dx0 + 1.5, y0 + dd - 1, z1 + 5.5]], C.woodD, zd + 1));
      polys.push(poly([[dx0 + 7, y0 + dd - 1, z1 + 2], [dx0 + 10, y0 + dd - 1, z1 + 2], [dx0 + 10, y0 + dd - 1, z1 + 3.2], [dx0 + 7, y0 + dd - 1, z1 + 3.2]], '#E9E2CC', zd + 1));
    });
    // ghế văn phòng phía sau bàn
    const sp = AT(x0 + dw / 2 - 12, y0 - 10, 0), zc = 100 + Math.round(x0 + dw / 2 - 12 + y0 - 12);
    if (!person || stand) {
      polys.push({ s: 'position:absolute;left:' + r1(sp[0] - 10) + 'px;top:' + r1(sp[1] - 30) + 'px;width:20px;height:17px;border-radius:5px 5px 2px 2px;background:' + C.chair + ';z-index:' + zc + ';' });
      polys.push({ s: 'position:absolute;left:' + r1(sp[0] - 11) + 'px;top:' + r1(sp[1] - 14) + 'px;width:22px;height:5px;border-radius:2px;background:' + C.chair + ';z-index:' + zc + ';' });
      polys.push({ s: 'position:absolute;left:' + r1(sp[0] - 1.5) + 'px;top:' + r1(sp[1] - 9) + 'px;width:3px;height:7px;background:' + C.chair + ';z-index:' + zc + ';' });
      polys.push({ s: 'position:absolute;left:' + r1(sp[0] - 9) + 'px;top:' + r1(sp[1] - 3) + 'px;width:18px;height:3px;border-radius:2px;background:' + C.chair + ';z-index:' + zc + ';' });
    } else {
      polys.push({ s: 'position:absolute;left:' + r1(sp[0] - 13) + 'px;top:' + r1(sp[1] - 44) + 'px;width:26px;height:24px;border-radius:6px 6px 2px 2px;background:' + C.chair + ';z-index:' + (zc - 1) + ';' });
    }
    if (person) {
      const px = stand ? x0 + dw / 2 + 22 : x0 + dw / 2 - 12, py = stand ? y0 + dd + 26 : y0 - 6;
      const p2 = AT(px, py, 0);
      chars.push(chara(person, p2[0], p2[1], big ? 1.1 : 1, mode, { tag: big }, 100 + Math.round(px + py)));
    }
    desks.push({ mode });
  });
  // Lãnh đạo ghé phòng: đi qua đi lại ở khoảng sàn trống phía trước các bàn
  ((opt && opt.visitors) || []).forEach((v, vi) => {
    const VP = [[60, 222], [212, 186], [140, 228], [226, 220]];
    const vx = VP[vi % 4][0], vy = VP[vi % 4][1];
    const pv = AT(vx, vy, 0);
    chars.push(chara(v, pv[0], pv[1], big ? 1.1 : 1, 'pace', { tag: big, nobub: true }, 100 + Math.round(vx + vy)));
  });
  return {
    stage: 'position:absolute;inset:0;',
    wrap: 'position:absolute;left:50%;top:' + (big ? '50%' : '52%') + ';width:0;height:0;transform:scale(' + k + ');',
    polys, chars, desks
  };
};


// ---------- Không gian tổng: mỗi khối BĐS Miền Bắc/Trung/Nam/CORP = 1 sàn, mỗi dự án = 1 căn phòng ----------
export const FLOORS = [['BĐS Miền Bắc', ['BĐS Miền Bắc']], ['BĐS Miền Trung', ['BĐS Miền Trung']], ['BĐS Miền Nam', ['BĐS Miền Nam']], ['CORP', ['SSG', 'SCG', 'KLB']]];
export const buildFloors = (P, WK, onOpen, maxW, floorVisitors) => {
const T = 150, GAP = 90, COLS = 4, MH = 34, SLAB = 16;
let wi = 0;
return FLOORS.map(([name, grps], fi) => {
  const list0 = P.filter(p => grps.indexOf(p.grp) >= 0 || (name === 'CORP' && ['BĐS Miền Bắc', 'BĐS Miền Trung', 'BĐS Miền Nam'].indexOf(p.grp) < 0 && grps.indexOf(p.grp) < 0));
  const list = list0.filter(p => !p.done).concat(list0.filter(p => p.done));
  const nRows = Math.max(1, Math.ceil(list.length / COLS));
  const nCols = Math.max(2, Math.min(COLS, list.length));
  const FW = list.length ? GAP + nCols * (T + GAP) : 420, FD = list.length ? GAP + nRows * (T + GAP) : 200;
  const ox = (FW - FD) * 0.7071 / 2, oy = ((FW + FD) * 0.3536 - MH * 0.866 + SLAB) / 2;
  const poly = mkPoly(ox, oy);
  const A = (x, y, z) => at(ox, oy, x, y, z);
  const polys = [
    poly([[0, FD, 0], [FW, FD, 0], [FW, FD, -SLAB], [0, FD, -SLAB]], '#C3C9D1', 0),
    poly([[FW, 0, 0], [FW, FD, 0], [FW, FD, -SLAB], [FW, 0, -SLAB]], '#AEB5BF', 0),
    poly([[0, 0, 0], [FW, 0, 0], [FW, FD, 0], [0, FD, 0]], '#E6E9ED', 0)
  ];
  const tiles = [], chars = [], plates = [];
  list.forEach((p, i) => {
    const r = Math.floor(i / COLS), c = i % COLS;
    const x = GAP + c * (T + GAP), y = GAP + r * (T + GAP);
    const open = p.items.filter(i => i.stage !== 'done');
    const dark = p.done;
    const zw = 100 + Math.round(x + y + T * 0.5);
    // phòng pixel: sàn gỗ có viền dày, tường trái nhạt + tường phải xanh, viền tường đậm
    polys.push(poly([[x, y + T, 0], [x + T, y + T, 0], [x + T, y + T, -6], [x, y + T, -6]], dark ? '#2A2522' : '#8A6446', 1));
    polys.push(poly([[x + T, y, 0], [x + T, y + T, 0], [x + T, y + T, -6], [x + T, y, -6]], dark ? '#221E1B' : '#6E4F37', 1));
    tiles.push({ open: () => onOpen(p.id), s: poly([[x, y, 0], [x + T, y, 0], [x + T, y + T, 0], [x, y + T, 0]], dark ? '#4A4540' : '#F4C68C', 1, 'cursor:pointer;').s });
    for (let k2 = 0; k2 < 5; k2++) polys.push(poly([[x, y + k2 * 30 + 15, 0], [x + T, y + k2 * 30 + 15, 0], [x + T, y + k2 * 30 + 30, 0], [x, y + k2 * 30 + 30, 0]], dark ? '#423D38' : '#EDB678', 2, 'pointer-events:none;'));
    polys.push(poly([[x, y, 0], [x, y + T, 0], [x, y + T, MH], [x, y, MH]], dark ? '#3B4049' : '#EAF4F8', zw));
    polys.push(poly([[x, y, 0], [x + T, y, 0], [x + T, y, MH], [x, y, MH]], dark ? '#333944' : '#A9BEDD', zw));
    polys.push(poly([[x, y, MH], [x, y + T, MH], [x - 5, y + T, MH], [x - 5, y - 5, MH], [x + T, y - 5, MH], [x + T, y, MH]], dark ? '#1E2126' : '#3A3F4A', zw + 1));
    polys.push(poly([[x - 5, y + T, -6], [x, y + T, -6], [x, y + T, MH], [x - 5, y + T, MH]], dark ? '#1E2126' : '#3A3F4A', zw + 1));
    polys.push(poly([[x + T, y - 5, -6], [x + T, y, -6], [x + T, y, MH], [x + T, y - 5, MH]], dark ? '#1E2126' : '#3A3F4A', zw + 1));
    polys.push(poly([[x, y + 30, 9], [x, y + 70, 9], [x, y + 70, 25], [x, y + 30, 25]], dark ? '#4A4F5A' : '#E07A3F', zw + 1));
    polys.push(poly([[x + 80, y, 9], [x + 125, y, 9], [x + 125, y, 27], [x + 80, y, 27]], dark ? '#4A4F5A' : '#FFFFFF', zw + 1));
    polys.push(poly([[x + 82, y, 11], [x + 101, y, 11], [x + 101, y, 25], [x + 82, y, 25]], dark ? '#24272D' : '#BFE3F5', zw + 2));
    polys.push(poly([[x + 104, y, 11], [x + 123, y, 11], [x + 123, y, 25], [x + 104, y, 25]], dark ? '#24272D' : '#BFE3F5', zw + 2));
    const pp1 = A(x + T - 16, y + 16, 0);
    polys.push(plant(['palm', 'bush', 'snake'][i % 3], pp1[0], pp1[1], 1.1, 100 + Math.round(x + y + T), dark));
    const busy = [];
    open.forEach(it => {
      const add = (pp) => { if (pp && busy.length < 3 && !busy.find(z => z.n === pp.n)) busy.push(pp); };
      if (it.stage === 'A') add(it.b); else { add(it.st); if (it.stage === 'C') add(it.dg); }
    });
    busy.forEach((pp, j) => { const cx = x + 36 + j * 40, cy = y + 62 + j * 16; const q = A(cx, cy, 0); chars.push(chara(pp, q[0], q[1], .85, 'type', { stand: true }, 100 + Math.round(cx + cy))); });
    const pc = A(x + T, y + T, 0);
    plates.push({
      open: () => onOpen(p.id),
      box: 'position:absolute;left:' + r1(pc[0] - 75) + 'px;top:' + r1(pc[1] - 16) + 'px;width:150px;display:flex;justify-content:center;z-index:9000;cursor:pointer;',
      plate: 'max-width:144px;padding:5px 10px;border-radius:9px;text-align:center;background:' + (dark ? 'rgba(46,50,58,.95)' : 'rgba(255,255,255,.97)') + ';box-shadow:0 2px 6px rgba(0,0,0,.15);border:1px solid ' + (dark ? '#4A4F5A' : '#E3E6EA') + ';',
      pTitle: 'font-size:12.5px;font-weight:700;line-height:1.25;color:' + (dark ? '#C9CED5' : '#1B1F24') + ';',
      pSub: 'font-size:11px;margin-top:2px;color:' + (dark ? '#8A9099' : '#5B6470') + ';',
      title: p.title,
      sub: dark ? 'Đã xong · tắt đèn' : open.length + ' việc đang làm'
    });
  });
  // Người đi lại trong hành lang của sàn (hành lang ngang và dọc giữa các phòng)
  let walkers = list.length ? [0, 1, 2].map(j => {
    const w = WK[(wi++) % WK.length];
    const horiz = j !== 1;
    const lane = horiz ? (j === 0 ? 0 : nRows) : Math.min(1, nCols);
    const fixed = lane * (T + GAP) + GAP / 2;
    const len = (horiz ? FW : FD) - 60;
    const st = horiz ? A(30, fixed, 0) : A(fixed, 30, 0);
    const dx = horiz ? len * 0.7071 : -len * 0.7071, dy = len * 0.3536;
    const dur = 14 + ((fi * 3 + j) * 4) % 9;
    return {
      track: 'position:absolute;left:' + r1(st[0]) + 'px;top:' + r1(st[1]) + 'px;width:0;height:0;z-index:5000;--dx:' + r1(dx) + 'px;--dy:' + r1(dy) + 'px;animation:oWalk ' + dur + 's linear infinite alternate;animation-delay:-' + ((fi * 3 + j) * 5) + 's;',
      ch: chara(w, 0, 0, .9, 'walk')
    };
  }) : [];
  // Lãnh đạo ghé sàn (ngẫu nhiên): đi lại dọc các hành lang
  ((floorVisitors && floorVisitors(fi)) || []).forEach((v, j) => {
    const horiz = j % 2 === 0;
    const lane = horiz ? (j / 2) % (nRows + 1) : (Math.floor(j / 2) + 1) % (nCols + 1);
    const fixed = lane * (T + GAP) + GAP / 2;
    const len = (horiz ? FW : FD) - 60;
    const st = horiz ? A(30, fixed, 0) : A(fixed, 30, 0);
    const dx = horiz ? len * 0.7071 : -len * 0.7071, dy = len * 0.3536;
    const dur = 16 + (j * 5) % 9;
    walkers.push({
      track: 'position:absolute;left:' + r1(st[0]) + 'px;top:' + r1(st[1]) + 'px;width:0;height:0;z-index:5001;--dx:' + r1(dx) + 'px;--dy:' + r1(dy) + 'px;animation:oWalk ' + dur + 's linear infinite alternate;animation-delay:-' + (j * 7 + 3) + 's;',
      ch: chara(v, 0, 0, .95, 'walk', { tag: true })
    });
  });
  const KF = Math.min(.8, Math.max(.3, (maxW - 16) / ((FW + FD) * 0.7071 + 40)));
  const H = ((FW + FD) * 0.3536 + MH * 0.866 + SLAB) * KF + 70;
  const openN = list.filter(p => !p.done).length;
  return {
    no: 'SÀN ' + (fi + 1), t: name,
    count: list.length ? list.length + ' dự án · ' + openN + ' đang có việc' + (list.length - openN ? ' · ' + (list.length - openN) + ' đã xong' : '') : 'chưa có dự án nào',
    stage: 'position:relative;height:' + Math.round(H) + 'px;',
    wrap: 'position:absolute;left:50%;top:50%;width:0;height:0;transform:scale(' + KF + ');',
    polys, tiles, chars, walkers, plates, empty: list.length === 0
  };
});
};

// Pháo hoa: 4 chùm, mỗi chùm 18 hạt (CSS animation oFw)
export const fireworks = () => {
  const fw = [];
  const cols = ['#FFD54A', '#FF6B8B', '#7B61FF', '#1FA9A0', '#F0A830', '#FFFFFF'];
  [[22, 26, 0], [52, 14, .55], [78, 30, 1.1], [38, 40, 1.6]].forEach(([cx, cy, dl], b) => {
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2, r = 70 + (i % 3) * 18;
      fw.push('position:absolute;left:' + cx + '%;top:' + cy + '%;width:6px;height:6px;border-radius:50%;background:' + cols[(i + b) % cols.length] + ';box-shadow:0 0 6px ' + cols[(i + b) % cols.length] + ';--dx:' + Math.round(Math.cos(a) * r) + 'px;--dy:' + Math.round(Math.sin(a) * r) + 'px;animation:oFw 2.2s ease-out infinite;animation-delay:' + dl + 's;opacity:0;');
    }
  });
  return fw;
};
