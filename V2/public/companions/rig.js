/* Neuroditto.ai companion rig — one builder for every companion, view, expression and action.
   Works in the browser (window.NDRig) and in Node (module.exports). Canvas 200 x 240. */
(function (root) {
  const EYE = "#2B2F36";
  const PIV = { head: [100, 158], armL: [66, 182], armR: [134, 182], all: [100, 230], handR: [145, 214], handL: [55, 214] };
  const shade = 'url(#nd-shade)';
  const DEFS = '<defs><linearGradient id="nd-shade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/><\/linearGradient>' +
    '<radialGradient id="nd-gold" cx=".38" cy=".32" r=".7"><stop offset="0" stop-color="#FFF4B8"/><stop offset=".35" stop-color="#F7D16C"/><stop offset=".75" stop-color="#D99A2E"/><stop offset="1" stop-color="#98560B"/><\/radialGradient><\/defs>';
  const el = (cx, cy, rx, ry, f, x = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${x}/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${shade}" ${x}/>`;
  const st = (d, c = EYE, w = 2.6, x = '') => `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${x}/>`;

  /* ---------- face parts ---------- */
  function eyes(kind, skin, one) {
    const xs = one ? [117] : [83, 117];
    return xs.map((x, i) => {
      const sgn = one ? 1 : (i === 0 ? -1 : 1); // -1 left eye, +1 right eye
      switch (kind) {
        case 'soft': return `<ellipse cx="${x}" cy="119" rx="6" ry="5.4" fill="${EYE}"/><circle cx="${x - 1.8}" cy="117.6" r="1.7" fill="#fff"/>` + st(`M${x - 7} 116.5 Q${x} 112.5 ${x + 7} 116.5`, EYE, 2.4);
        case 'sleepy': return st(`M${x - 7} 118 Q${x} 124 ${x + 7} 118`, EYE, 2.8);
        case 'happy': return st(`M${x - 7} 121 Q${x} 112 ${x + 7} 121`, EYE, 3);
        case 'wide': return `<ellipse cx="${x}" cy="117" rx="7.2" ry="9" fill="${EYE}"/><circle cx="${x - 2.4}" cy="113.5" r="2.6" fill="#fff"/><circle cx="${x + 2.4}" cy="121" r="1.2" fill="#fff" opacity=".6"/>`;
        case 'look': return `<ellipse cx="${x + 2}" cy="115.5" rx="6.2" ry="7.6" fill="${EYE}"/><circle cx="${x + 2.5}" cy="111.8" r="2.1" fill="#fff"/>`;
        case 'down': return `<ellipse cx="${x}" cy="121" rx="6" ry="5" fill="${EYE}"/><circle cx="${x - 1.8}" cy="120" r="1.6" fill="#fff"/>` + st(`M${x - 7} 118.5 Q${x} 116 ${x + 7} 118.5`, EYE, 2.4);
        case 'sad': {
          const lid = sgn < 0 ? `M${x - 8} 117 L${x + 8} 110 L${x + 8} 104 L${x - 8} 104 Z` : `M${x + 8} 117 L${x - 8} 110 L${x - 8} 104 L${x + 8} 104 Z`;
          return `<ellipse cx="${x}" cy="119" rx="6.2" ry="7.4" fill="${EYE}"/><circle cx="${x - 2}" cy="117" r="2" fill="#fff"/><path d="${lid}" fill="${skin}"/>`;
        }
        default: return `<ellipse cx="${x}" cy="118" rx="6.2" ry="7.6" fill="${EYE}"/><circle cx="${x - 2}" cy="115" r="2.1" fill="#fff"/><circle cx="${x + 2.2}" cy="121.5" r="1" fill="#fff" opacity=".6"/>`;
      }
    }).join('');
  }
  function brows(kind, color, one) {
    const B = {
      raise: ['M76 105 Q83 102 90 105', 'M110 100 Q117 95 124 100'],
      up: ['M76 101 Q83 97 90 101', 'M110 101 Q117 97 124 101'],
      sad: ['M76 107 Q84 105 90 101', 'M110 101 Q116 105 124 107'],
      worry: ['M76 106 Q83 103 90 102', 'M110 102 Q117 103 124 106'],
      proud: ['M76 103 Q83 100 90 103', 'M110 103 Q117 100 124 103'],
    }[kind];
    if (!B) return '';
    return (one ? [B[1]] : B).map(d => st(d, color, 3, 'opacity=".85"')).join('');
  }
  function mouth(kind, dx = 0, dy = 0) {
    const t = `transform="translate(${dx} ${dy})"`;
    const M = {
      smile: st('M93 134 Q100 140.5 107 134'),
      small: st('M96 135 Q100 138 104 135', EYE, 2.4),
      grin: '<path d="M92 132.5 Q100 145 108 132.5 Z" fill="#6E3A3A"/><path d="M95 138 Q100 142 105 138 Z" fill="#E98C8C"/>',
      laugh: '<path d="M90 131 Q100 150 110 131 Z" fill="#6E3A3A"/><path d="M94 139 Q100 146 106 139 Z" fill="#E98C8C"/>',
      o: '<ellipse cx="100" cy="136" rx="4.2" ry="5.2" fill="#6E3A3A"/>',
      frown: st('M94 138 Q100 132.5 106 138', EYE, 2.4),
      flat: st('M95 136 L105 136', EYE, 2.4),
      wavy: st('M92 136 Q95.5 133 99 136 Q102.5 139 106 136', EYE, 2.2),
      smug: st('M93 134 Q102 140 108 132', EYE, 2.6),
    };
    return `<g class="nd-mouth" ${t}><g class="nd-mouthi">${M[kind] || M.smile}<\/g><\/g>`;
  }
  const cheeks = (op = .3, one) => (one ? '' : `<ellipse cx="72" cy="131" rx="7" ry="4.5" fill="#FF8F8F" opacity="${op}"/>`) + `<ellipse cx="128" cy="131" rx="7" ry="4.5" fill="#FF8F8F" opacity="${op}"/>`;

  /* ---------- arms ---------- */
  function arm(side, c, hand) {
    const L = side === 'l';
    const x = L ? 60 : 140, r = L ? 18 : -18, hx = L ? 55 : 145;
    return el(x, 198, 10, 18, c, `transform="rotate(${r} ${x} 198)"`) + (hand ? el(hx, 214, 7, 7, hand) : '');
  }

  /* ---------- props ---------- */
  const zz = (x, y, s) => st(`M${x} ${y} h${s} l${-s} ${s * 1.1} h${s}`, '#7C8AA0', Math.max(2, s / 4));
  const spk = (x, y, r, c = '#F2BE4E') => `<path d="M${x} ${y - r} Q${x + r * .2} ${y - r * .2} ${x + r} ${y} Q${x + r * .2} ${y + r * .2} ${x} ${y + r} Q${x - r * .2} ${y + r * .2} ${x - r} ${y} Q${x - r * .2} ${y - r * .2} ${x} ${y - r} Z" fill="${c}"/>`;
  const note = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="10" rx="5" ry="4" fill="#7C8AA0" transform="rotate(-20 0 10)"/><path d="M4 9 V-8 L13 -11 V-3" stroke="#7C8AA0" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><\/g>`;
  const PROPS = {
    phone: '<g class="nd-p-phone"><rect x="84" y="196" width="32" height="24" rx="5" fill="#2B2F36"/><rect x="87" y="199" width="26" height="18" rx="3" fill="#8EC5DE"/><rect x="87" y="199" width="26" height="18" rx="3" fill="#fff" opacity=".25" class="nd-glow"/><\/g>',
    book: '<g class="nd-p-book"><path d="M100 200 C90 194 80 194 72 197 L72 220 C80 217 90 217 100 223 Z" fill="#FFFDF8"/><path d="M100 200 C110 194 120 194 128 197 L128 220 C120 217 110 217 100 223 Z" fill="#F4EFE4"/><path d="M100 200 V223" stroke="#C9B89A" stroke-width="1.6"/>' +
      [204, 209, 214].map(y => `<path d="M77 ${y} H95 M105 ${y} H123" stroke="#C9D2DC" stroke-width="1.6" stroke-linecap="round"/>`).join('') + '<rect x="70" y="219" width="60" height="6" rx="3" fill="#A64B2A"/><\/g>',
    notebook: '<g class="nd-p-notebook"><rect x="78" y="200" width="44" height="26" rx="4" fill="#FFF8E7"/>' + [207, 212, 217].map(y => `<path d="M83 ${y} H117" stroke="#E2D6BC" stroke-width="1.4"/>`).join('') + '<path d="M84 207 Q90 204 96 207 T108 207" stroke="#7C8AA0" stroke-width="1.6" fill="none" class="nd-scribble"/><\/g>',
    laptop: '<g class="nd-p-laptop"><rect x="70" y="186" width="60" height="38" rx="6" fill="#C9D2DC"/><rect x="70" y="186" width="60" height="38" rx="6" fill="url(#nd-shade)"/><circle cx="100" cy="205" r="4" fill="#F2BE4E"/><rect x="62" y="222" width="76" height="6" rx="3" fill="#AEB8C4"/><\/g>',
    laptopGlow: '<ellipse class="nd-p-screenglow" cx="100" cy="125" rx="44" ry="30" fill="#8EC5DE" opacity=".16"/>',
    heart: '<g class="nd-p-heart"><path d="M100 186 C94 176 80 180 82 190 C84 198 100 208 100 208 C100 208 116 198 118 190 C120 180 106 176 100 186 Z" fill="#F28C9A"/><path d="M90 184 C87 184 86 187 87 189" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/><\/g>',
    notes: '<g class="nd-p-notes">' + note(150, 66) + note(166, 96, .8) + note(36, 84, .7) + '<\/g>',
    zzz: '<g class="nd-p-zzz">' + zz(140, 70, 9) + zz(154, 52, 12) + zz(170, 30, 15) + '<\/g>',
    thought: '<g class="nd-p-thought"><circle class="nd-d1" cx="146" cy="80" r="4" fill="#C9D2DC"/><circle class="nd-d2" cx="156" cy="64" r="6" fill="#C9D2DC"/><circle class="nd-d3" cx="170" cy="44" r="9" fill="#C9D2DC"/><\/g>',
    sparkles: '<g class="nd-p-sparkles">' + [[30, 70, 8], [168, 60, 10], [40, 150, 6], [172, 138, 7], [100, 22, 7]].map(([x, y, r], i) => `<g class="nd-s${i}">${spk(x, y, r)}<\/g>`).join('') + '<\/g>',
    sound: '<g class="nd-p-sound">' + st('M38 108 Q32 118 38 128', '#D99A2E', 3, 'opacity=".8"') + st('M30 102 Q21 118 30 134', '#D99A2E', 3, 'opacity=".5"') + '<\/g>',
    aha: '<g class="nd-p-aha"><path class="nd-thread" d="M64 64 C80 40 92 72 100 52 C108 32 122 62 136 40" stroke="#D99A2E" stroke-width="3" fill="none" stroke-linecap="round"/><circle class="nd-orb-glow" cx="100" cy="26" r="22" fill="#F7D16C" opacity=".28"/><circle class="nd-orb" cx="100" cy="26" r="12" fill="url(#nd-gold)"/><\/g>',
    talkdots: '',
  };
  // props that live in the right hand (move with arm, counter-rotated to stay upright)
  const HANDPROPS = {
    cup: '<g class="nd-p-cup"><rect x="136" y="204" width="18" height="18" rx="5" fill="#F3E9DC"/><rect x="136" y="204" width="18" height="18" rx="5" fill="url(#nd-shade)"/><path d="M154 208 q7 0 7 6 q0 6 -7 6" stroke="#E6D6C2" stroke-width="3" fill="none"/><ellipse cx="145" cy="205" rx="8" ry="2.4" fill="#8B5A3C"/><\/g>',
    pencil: '<g class="nd-p-pencil"><path d="M143 220 L158 196" stroke="#F2BE4E" stroke-width="5" stroke-linecap="round"/><path d="M143 220 L145.5 216" stroke="#2B2F36" stroke-width="5" stroke-linecap="round"/><\/g>',
  };

  /* ---------- actions: static key pose + animation ---------- */
  // la/ra = arm rotation (deg), head = head tilt, front = arms drawn in front of body
  const ACTIONS = {
    idle:        { label: 'Idle',        pose: {}, face: {}, props: [], anim: ['breathe', 'blink'] },
    talking:     { label: 'Talking',     pose: { ra: -45, head: 2 }, face: { mouth: 'o', brows: 'raise' }, props: [], anim: ['breathe', 'blink', 'talk', 'gesture'] },
    listening:   { label: 'Listening',   pose: { head: -8 }, face: { eyes: 'soft', mouth: 'smile', brows: 'raise' }, props: ['sound'], anim: ['breathe', 'blink', 'nod', 'sound'] },
    thinking:    { label: 'Thinking',    pose: { ra: 160, head: -6, front: 1 }, face: { eyes: 'look', mouth: 'flat', brows: 'raise' }, props: ['thought'], anim: ['breathe', 'think'] },
    typing:      { label: 'Typing',      pose: { la: -45, ra: 45, head: 4, front: 1 }, face: { eyes: 'down', mouth: 'small' }, props: ['phone'], anim: ['breathe', 'type', 'glow'] },
    writing:     { label: 'Writing',     pose: { la: -45, ra: 38, head: 6, front: 1 }, face: { eyes: 'down', mouth: 'small' }, props: ['notebook'], hand: ['pencil'], anim: ['breathe', 'write', 'scribble'] },
    reading:     { label: 'Reading',     pose: { la: -45, ra: 45, head: 5, front: 1 }, face: { eyes: 'down', mouth: 'smile' }, props: ['book'], anim: ['breathe', 'read', 'blink'] },
    watching:    { label: 'Watching',    pose: { la: -30, ra: 30, front: 1 }, face: { eyes: 'open', mouth: 'o' }, props: ['laptop', 'laptopGlow'], anim: ['breathe', 'blink', 'screen'] },
    drinking:    { label: 'Drinking tea', pose: { ra: 150, head: -4, front: 1 }, face: { eyes: 'happy', mouth: 'small' }, props: [], hand: ['cup'], anim: ['sip'] },
    waving:      { label: 'Waving',      pose: { ra: -105 }, face: { eyes: 'happy', mouth: 'grin' }, props: [], anim: ['breathe', 'wave'] },
    dancing:     { label: 'Dancing',     pose: { la: 80, ra: -40 }, face: { eyes: 'happy', mouth: 'grin' }, props: ['notes'], anim: ['dance', 'notes'] },
    singing:     { label: 'Singing',     pose: { ra: -75, head: -6 }, face: { eyes: 'happy', mouth: 'o' }, props: ['notes'], anim: ['sway', 'notes', 'sing'] },
    celebrating: { label: 'Celebrating', pose: { la: 105, ra: -105 }, face: { eyes: 'happy', mouth: 'laugh', cheekOp: .45 }, props: ['sparkles'], anim: ['hop', 'cheer', 'sparkle'] },
    hugging:     { label: 'Hugging',     pose: { la: -60, ra: 60, head: 6, front: 1 }, face: { eyes: 'happy', mouth: 'smile', cheekOp: .45 }, props: ['heart'], anim: ['squeeze', 'heart'] },
    sleeping:    { label: 'Sleeping',    pose: { head: 12 }, face: { eyes: 'sleepy', mouth: 'small' }, props: ['zzz'], anim: ['sleepbreathe', 'zzz'] },
    discovering: { label: 'Discovering a pattern', pose: { la: 60, ra: -60, head: -3 }, face: { eyes: 'wide', mouth: 'o', brows: 'up' }, props: ['aha'], anim: ['aha', 'blink'] },
  };
  const EXPRESSIONS = {
    happy:     { eyes: 'happy', mouth: 'grin' },
    calm:      { eyes: 'soft', mouth: 'smile' },
    curious:   { eyes: 'open', mouth: 'o', brows: 'raise', head: -8 },
    thinking:  { eyes: 'look', mouth: 'flat', brows: 'raise', head: -4 },
    empathetic:{ eyes: 'sad', mouth: 'frown', brows: 'sad', head: 6 },
    surprised: { eyes: 'wide', mouth: 'o', brows: 'up' },
    laughing:  { eyes: 'happy', mouth: 'laugh', cheekOp: .45, head: -4 },
    sleepy:    { eyes: 'sleepy', mouth: 'small', head: 8 },
    proud:     { eyes: 'happy', mouth: 'smug', brows: 'proud', cheekOp: .4, head: -5 },
    concerned: { eyes: 'open', mouth: 'wavy', brows: 'worry' },
  };
  const EXP_LABEL = { happy: 'Happy', calm: 'Calm', curious: 'Curious', thinking: 'Thinking', empathetic: 'Sad / empathetic', surprised: 'Surprised', laughing: 'Laughing', sleepy: 'Sleepy', proud: 'Proud', concerned: 'Concerned' };

  /* ---------- CSS animations (shared, class-based) ---------- */
  const E1 = 'cubic-bezier(.45,0,.55,1)', ES = 'cubic-bezier(.22,1,.36,1)';
  const tb = 'transform-box:view-box;';
  const at = (p, t) => `translate(${PIV[p][0]}px,${PIV[p][1]}px) ${t} translate(${-PIV[p][0]}px,${-PIV[p][1]}px)`;
  let CUR = 'armR';
  function rot(base, d) { return `rotate(${base + d}deg)`; }
  function css() {
    let c = `.nd .nd-eyes{${tb}transform-origin:100px 118px}.nd .nd-mouthi{${tb}transform-origin:100px 136px}
@keyframes nd-breathe{0%,100%{transform:${at('all','scale(1,1)')}}50%{transform:${at('all','scale(1.012,1.022)')}}}
@keyframes nd-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}
@keyframes nd-fadeup{0%{opacity:0;transform:translateY(6px)}30%,70%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-10px)}}
@keyframes nd-pulse{0%,100%{opacity:.35}50%{opacity:1}}
@media (prefers-reduced-motion: reduce){.nd *{animation:none!important}}
`;
    return c;
  }
  // per-action keyframes, built from the pose so animated and still versions match
  function actionCSS(name) {
    const a = ACTIONS[name], p = a.pose, la = p.la || 0, ra = p.ra || 0, hd = p.head || 0;
    const sel = `.nd.act-${name}`;
    let c = '';
    const piv = { '.nd-arm-l': 'armL', '.nd-arm-r': 'armR', '.nd-head': 'head', '.nd-all': 'all', '.nd-hp': 'handR' };
    const add = (part, kf, dur, ease = E1, extra = 'infinite') => {
      CUR = piv[part] || 'all';
      if (piv[part]) kf = kf.replace(/transform:([^}]*)}/g, (m, t) => `transform:${at(CUR, t)}}`);
      const k = `nd-${name}-${part.replace(/[^a-z]/g, '')}`;
      c += `@keyframes ${k}{${kf}}${sel} ${part}{animation:${k} ${dur} ${ease} ${extra}}`;
    };
    const A = new Set(a.anim);
    if (A.has('breathe')) c += `${sel} .nd-all{animation:nd-breathe 4s ${E1} infinite}`;
    if (A.has('blink')) c += `${sel} .nd-eyes{animation:nd-blink 4.6s linear infinite}`;
    if (A.has('talk')) add('.nd-mouthi', '0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}', '.36s', E1, 'infinite');
    if (A.has('gesture')) add('.nd-arm-r', `0%,100%{transform:${rot(ra, 0)}}50%{transform:${rot(ra, -18)}}`, '1.8s');
    if (A.has('nod')) { add('.nd-head', `0%,100%{transform:${rot(hd, 0)}}50%{transform:${rot(hd, 4)} translateY(1.5px)}`, '2.4s'); c += `${sel} .nd-hb{animation:nd-${name}-ndhead 2.4s ${E1} infinite}`; }
    if (A.has('sound')) add('.nd-p-sound', '0%,100%{opacity:.25}50%{opacity:1}', '1.6s');
    if (A.has('think')) { add('.nd-head', `0%,100%{transform:${rot(hd, 0)}}50%{transform:${rot(hd, -3)}}`, '3.2s'); c += `${sel} .nd-hb{animation:nd-${name}-ndhead 3.2s ${E1} infinite}`; [1, 2, 3].forEach(i => c += `${sel} .nd-d${i}{animation:nd-pulse 1.5s ${E1} ${i * .25}s infinite}`); }
    if (A.has('type')) { add('.nd-arm-l', `0%,100%{transform:${rot(la, 0)}}50%{transform:${rot(la, -4)}}`, '.32s'); add('.nd-arm-r', `0%,100%{transform:${rot(ra, -3)}}50%{transform:${rot(ra, 3)}}`, '.28s'); }
    if (A.has('glow')) add('.nd-glow', '0%,100%{opacity:.1}50%{opacity:.4}', '1.4s');
    if (A.has('write')) add('.nd-arm-r', `0%,100%{transform:${rot(ra, 0)}}25%{transform:${rot(ra, 4)}}50%{transform:${rot(ra, -2)}}75%{transform:${rot(ra, 5)}}`, '1.1s');
    if (A.has('scribble')) c += `${sel} .nd-scribble{stroke-dasharray:40;animation:nd-${name}-scr 2.2s linear infinite}@keyframes nd-${name}-scr{from{stroke-dashoffset:40}to{stroke-dashoffset:0}}`;
    if (A.has('read')) { add('.nd-head', `0%,100%{transform:${rot(hd, 0)}}50%{transform:${rot(hd, -3)} translateX(1px)}`, '3.6s'); c += `${sel} .nd-hb{animation:nd-${name}-ndhead 3.6s ${E1} infinite}`; }
    if (A.has('screen')) add('.nd-p-screenglow', '0%,100%{opacity:.08}40%{opacity:.22}70%{opacity:.12}', '2.6s');
    if (A.has('sip')) {
      add('.nd-arm-r', `0%,15%{transform:${rot(0, 0)}}40%,65%{transform:${rot(ra, 0)}}90%,100%{transform:${rot(0, 0)}}`, '3.6s', ES);
      add('.nd-hp', `0%,15%{transform:rotate(0deg)}40%,65%{transform:rotate(${-ra}deg)}90%,100%{transform:rotate(0deg)}`, '3.6s', ES);
      add('.nd-head', `0%,30%{transform:${rot(0, 0)}}45%,62%{transform:${rot(hd, 0)}}80%,100%{transform:${rot(0, 0)}}`, '3.6s', ES);
      c += `${sel} .nd-hb{animation:nd-${name}-ndhead 3.6s ${ES} infinite}`;
    }
    if (A.has('wave')) add('.nd-arm-r', `0%,100%{transform:${rot(ra, 0)}}25%{transform:${rot(ra, -22)}}75%{transform:${rot(ra, 18)}}`, '1.2s');
    if (A.has('dance')) {
      add('.nd-all', '0%,100%{transform:rotate(-6deg) translateY(0)}25%{transform:rotate(0) translateY(-6px)}50%{transform:rotate(6deg) translateY(0)}75%{transform:rotate(0) translateY(-6px)}', '1.6s');
      add('.nd-arm-l', `0%,100%{transform:${rot(la, 0)}}50%{transform:${rot(-30, 0)}}`, '1.6s');
      add('.nd-arm-r', `0%,100%{transform:${rot(ra, 0)}}50%{transform:${rot(-85, 0)}}`, '1.6s');
    }
    if (A.has('notes')) [0, 1, 2].forEach(i => c += `${sel} .nd-p-notes > g:nth-child(${i + 1}){animation:nd-fadeup 2.4s ${E1} ${i * .7}s infinite}`);
    if (A.has('sway')) add('.nd-all', '0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}', '2.4s');
    if (A.has('sing')) add('.nd-mouthi', '0%,100%{transform:scale(1,1)}50%{transform:scale(1.15,1.35)}', '1.2s');
    if (A.has('hop')) add('.nd-all', '0%,100%{transform:translateY(0) scale(1,1)}15%{transform:translateY(0) scale(1.04,.94)}40%{transform:translateY(-14px) scale(.98,1.03)}65%{transform:translateY(0) scale(1.03,.96)}', '1.3s', ES);
    if (A.has('cheer')) { add('.nd-arm-l', `0%,100%{transform:${rot(la, 0)}}50%{transform:${rot(la, 20)}}`, '.65s'); add('.nd-arm-r', `0%,100%{transform:${rot(ra, 0)}}50%{transform:${rot(ra, -20)}}`, '.65s'); }
    if (A.has('sparkle')) [0, 1, 2, 3, 4].forEach(i => c += `${sel} .nd-s${i}{transform-box:fill-box;transform-origin:center;animation:nd-${name}-sp 1.6s ${ES} ${i * .22}s infinite}`) , (c += `@keyframes nd-${name}-sp{0%{opacity:0;transform:scale(.2)}35%{opacity:1;transform:scale(1.1)}100%{opacity:0;transform:scale(.6)}}`);
    if (A.has('squeeze')) { add('.nd-all', '0%,100%{transform:scale(1,1)}50%{transform:scale(1.04,.97)}', '2s'); add('.nd-arm-l', `0%,100%{transform:${rot(la, 0)}}50%{transform:${rot(la, -8)}}`, '2s'); add('.nd-arm-r', `0%,100%{transform:${rot(ra, 0)}}50%{transform:${rot(ra, 8)}}`, '2s'); }
    if (A.has('heart')) c += `${sel} .nd-p-heart{transform-box:fill-box;transform-origin:center;animation:nd-${name}-hb 2s ${E1} infinite}@keyframes nd-${name}-hb{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}`;
    if (A.has('sleepbreathe')) { add('.nd-all', '0%,100%{transform:scale(1,1)}50%{transform:scale(1.02,1.035)}', '5s'); }
    if (A.has('zzz')) [0, 1, 2].forEach(i => c += `${sel} .nd-p-zzz > path:nth-child(${i + 1}){animation:nd-fadeup 3s ${E1} ${i * .8}s infinite}`);
    if (A.has('aha')) {
      c += `${sel} .nd-thread{stroke-dasharray:120;animation:nd-${name}-th 3.2s ${ES} infinite}@keyframes nd-${name}-th{0%,10%{stroke-dashoffset:120}55%,100%{stroke-dashoffset:0}}`;
      c += `${sel} .nd-orb,${sel} .nd-orb-glow{transform-box:fill-box;transform-origin:center;animation:nd-${name}-orb 3.2s ${ES} infinite}@keyframes nd-${name}-orb{0%,35%{opacity:0;transform:translateY(14px) scale(.4)}60%{opacity:1;transform:translateY(0) scale(1.1)}75%,100%{opacity:1;transform:translateY(0) scale(1)}}`;
      add('.nd-all', '0%,40%{transform:translateY(0)}55%{transform:translateY(-6px)}70%,100%{transform:translateY(0)}', '3.2s', ES);
    }
    return c;
  }
  function allCSS() { return css() + Object.keys(ACTIONS).map(actionCSS).join('\n'); }

  /* ---------- builder ---------- */
  // opts: {view:'front'|'3q'|'side'|'back', action, expression, eyes, mouth, brows, head, cheekOp, id, still, size}
  function build(ch, opts = {}) {
    const view = opts.view || 'front';
    const act = opts.action ? ACTIONS[opts.action] : null;
    const ex = opts.expression ? EXPRESSIONS[opts.expression] : {};
    const face = Object.assign({ eyes: ch.eyes, mouth: ch.mouth, brows: '', cheekOp: .3 }, act ? act.face : {}, ex, opts);
    const pose = Object.assign({ la: 0, ra: 0, head: 0, front: 0 }, act ? act.pose : {}, ex.head != null ? { head: ex.head } : {});
    if (ch.noArms) { pose.la = 0; pose.ra = 0; }
    const back = view === 'back', side = view === 'side', q3 = view === '3q';
    const one = side;
    // view transforms
    const faceT = q3 ? 'translate(11 0) translate(111 118) scale(.9 1) translate(-111 -118)' : side ? 'translate(16 0)' : '';
    const frontT = q3 ? 'translate(8 0)' : side ? 'translate(118 0) scale(.72 1) translate(-118 0) translate(14 0)' : '';
    const topT = q3 ? 'translate(4 0)' : side ? 'translate(7 0)' : '';
    const behindT = q3 ? 'translate(-4 0)' : side ? 'translate(-8 0)' : '';
    const bodyT = q3 ? 'translate(100 0) scale(.95 1) translate(-100 0)' : side ? 'translate(100 0) scale(.84 1) translate(-100 0)' : '';
    const g = (cls, inner, t = '') => inner ? `<g class="${cls}"${t ? ` transform="${t}"` : ''}>${inner}<\/g>` : '';
    const handProps = (act && act.hand ? act.hand.map(h => HANDPROPS[h]).join('') : '');
    const armL = ch.noArms || side ? '' : `<g class="nd-arm-l" transform="rotate(${pose.la} ${PIV.armL[0]} ${PIV.armL[1]})">${arm('l', ch.armColor, ch.handColor)}<\/g>`;
    const armR = ch.noArms ? '' : `<g class="nd-arm-r" transform="rotate(${pose.ra} ${PIV.armR[0]} ${PIV.armR[1]})">${arm('r', ch.armColor, ch.handColor)}${handProps ? `<g class="nd-hp" transform="rotate(${-pose.ra} ${PIV.handR[0]} ${PIV.handR[1]})">${handProps}<\/g>` : ''}<\/g>`;
    const arms = `<g class="nd-arms"${q3 ? ' transform="translate(2 0)"' : ''}>${armL}${armR}<\/g>`;
    const body = g('nd-body', ch.bodyCustom + ch.bodyBoth + (back ? '' : ch.bodyFront), bodyT);
    const ht = `rotate(${pose.head} ${PIV.head[0]} ${PIV.head[1]})`;
    const faceSvg = back ? '' : `<g class="nd-face"${faceT ? ` transform="${faceT}"` : ''}>${brows(face.brows, ch.brow, one)}<g class="nd-eyes">${eyes(face.eyes, ch.skin, one)}<\/g>${mouth(face.mouth, ch.mouthDx, ch.mouthDy)}${ch.cheeks ? cheeks(face.cheekOp, one) : ''}<\/g>`;
    const head = `<g class="nd-head" transform="${ht}">` +
      g('nd-hbehind', ch.headBehind, behindT) +
      (back ? ch.headBaseBack : `<g class="nd-hbase"${q3 || side ? ` transform="${q3 ? 'translate(100 112) scale(.97 1) translate(-100 -112)' : 'translate(100 112) scale(.92 1) translate(-100 -112)'}"` : ''}>${ch.headBase}<\/g>`) +
      (back ? '' : g('nd-hfront', ch.headFront, frontT)) +
      g('nd-htop', ch.headTop, topT) + faceSvg +
      (back ? '' : g('nd-over', ch.overFace, frontT)) + (ch.topmost || '') +
      (back && ch.back ? `<g class="nd-hb-cover">${ch.back}<\/g>` : '') + '<\/g>';
    const hb = !back && ch.back ? `<g class="nd-hb" transform="${ht}">${g('', ch.back, behindT)}<\/g>` : '';
    const props = act ? act.props.filter(p => !(ch.noArms && ['phone', 'book', 'notebook'].includes(p))).map(p => PROPS[p]).join('') : '';
    const front = pose.front && !back;
    const order = back ?
      g('nd-tailf', '') + arms + body + head + (ch.tail ? `<g class="nd-tail">${ch.tail}<\/g>` : '') :
      (ch.tail ? `<g class="nd-tail">${ch.tail}<\/g>` : '') + hb + (front ? '' : arms) + body + head + (front ? arms : '');
    const cls = 'nd' + (opts.action && !opts.still ? ` act-${opts.action}` : '');
    const style = opts.css ? `<style>${opts.css}<\/style>` : '';
    const size = opts.size ? ` width="${opts.size}" height="${opts.size * 1.2}"` : '';
    const label = `${ch.name}${opts.action ? ' — ' + ACTIONS[opts.action].label : ''}${opts.expression ? ' — ' + EXP_LABEL[opts.expression] : ''}${view !== 'front' ? ' — ' + view : ''}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240"${size} class="${cls}" role="img" aria-label="${label}"><title>${label}<\/title>${DEFS}${style}` +
      `<ellipse cx="100" cy="230" rx="50" ry="7" fill="#000" opacity=".12"/><g class="nd-all">${order}${props}<\/g><\/svg>`;
  }

  const API = { build, ACTIONS, EXPRESSIONS, EXP_LABEL, allCSS, actionCSS, baseCSS: css, PIV, VIEWS: ['front', '3q', 'side', 'back'] };
  if (typeof module !== 'undefined') module.exports = API; else root.NDRig = API;
})(this);
