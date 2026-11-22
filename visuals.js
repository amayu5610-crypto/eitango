/* Visual renderer: per-word illustrations and AI-generated photo-scene assets.
   Generated SVG is an illustration/diagram, not a literal depiction for every abstract word. */
(() => {
  const escV = v => String(v ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // SVG symbols drawn for this project. Colors inherit via stroke/fill.
  const icons = {
    calendar:`<rect x="12" y="17" width="76" height="68" rx="10"/><path d="M12 37h76M33 10v17M67 10v17"/><path d="M30 52h10M50 52h10M30 68h10M50 68h10"/>`,
    paper:`<path d="M24 9h38l16 17v63H24z"/><path d="M62 9v20h16M34 44h34M34 57h34M34 70h23"/>`,
    box:`<path d="M12 30 50 12l38 18v43L50 92 12 73z"/><path d="M12 30l38 19 38-19M50 49v43M31 21l38 19"/>`,
    envelope:`<rect x="9" y="24" width="82" height="56" rx="7"/><path d="m10 29 40 28 40-28M11 76l28-27M89 76 61 49"/>`,
    handshake:`<path d="m13 37 19-15 20 10 14-9 21 17-22 26-16 17-11-8-10-10-15-10z"/><path d="m39 36 12-6M37 54l23 20M46 44l23 19M55 36l22 18"/>`,
    plane:`<path d="M6 53 90 17l-31 71-13-31-32 9z"/><path d="M46 57 90 17M46 57l-5 20"/>`,
    person:`<circle cx="50" cy="28" r="17"/><path d="M18 88V76c0-19 13-30 32-30S82 57 82 76v12z"/>`,
    chart:`<path d="M14 12v75h76"/><rect x="23" y="57" width="12" height="23" rx="2"/><rect x="44" y="42" width="12" height="38" rx="2"/><rect x="65" y="24" width="12" height="56" rx="2"/>`,
    check:`<circle cx="50" cy="50" r="39"/><path d="m28 51 14 14 29-31"/>`,
    clock:`<circle cx="50" cy="50" r="38"/><path d="M50 25v29l19 10"/>`,
    computer:`<rect x="9" y="15" width="82" height="60" rx="7"/><path d="M34 87h32M50 75v12M23 33h54M23 46h31"/>`,
    building:`<path d="M21 90V15h56v75M12 90h76"/><path d="M33 29h10M57 29h10M33 43h10M57 43h10M33 58h10M57 58h10M45 90V75h13v15"/>`,
    cart:`<path d="M7 18h13l12 50h44l13-34H24M35 54h47"/><circle cx="39" cy="80" r="5"/><circle cx="72" cy="80" r="5"/>`,
    shield:`<path d="M50 8 85 22v27c0 20-13 33-35 44-22-11-35-24-35-44V22z"/><path d="m33 49 12 12 24-25"/>`,
    lightbulb:`<path d="M32 67c-8-9-13-17-13-29a31 31 0 0 1 62 0c0 12-5 20-13 29H32zM33 76h35M38 86h25"/><path d="M50 18v7"/>`,
    gear:`<circle cx="50" cy="50" r="20"/><circle cx="50" cy="50" r="9"/><path d="M45 5h10l3 11 12 5 10-6 7 8-6 10 5 12 11 3v10l-11 3-5 12 6 10-8 7-10-6-12 5-3 11H45l-3-11-12-5-10 6-7-8 6-10-5-12-11-3V45l11-3 5-12-6-10 8-7 10 6 12-5z"/>`,
    arrow:`<path d="M12 50h72M60 25l25 25-25 25"/><path d="M14 26h24M14 74h24"/>`,
    scale:`<path d="M50 9v78M24 87h52M16 27h68"/><path d="M23 27 9 58h28L23 27zM77 27 63 58h28L77 27z"/>`,
    clipboard:`<rect x="20" y="15" width="60" height="76" rx="7"/><rect x="37" y="8" width="26" height="17" rx="5"/><path d="M35 46h30M35 59h30M35 72h20"/>`,
    home:`<path d="m8 45 42-35 42 35M18 40v48h64V40M41 88V60h18v28"/>`,
    phone:`<rect x="30" y="7" width="40" height="86" rx="9"/><path d="M43 18h14M44 81h12"/>`,
    book:`<path d="M50 25c-12-9-25-11-39-9v64c17-2 30 1 39 10 9-9 22-12 39-10V16c-14-2-27 0-39 9zM50 25v65M19 31c10 0 18 2 25 7M56 38c7-5 15-7 25-7"/>`
  };
  const categories = {
    calendar:'#16668c', paper:'#4973a4', box:'#c0863c', envelope:'#4477b7', handshake:'#4a897f', plane:'#4683af',
    person:'#7586ad', chart:'#31936e', check:'#34a36b', clock:'#a8738d', computer:'#6481b0', building:'#5d7292',
    cart:'#c49054', shield:'#6285a0', lightbulb:'#db9c36', gear:'#71929c', arrow:'#5c8aa9', scale:'#9c7997',
    clipboard:'#7194a4', home:'#a48071', phone:'#678dbb', book:'#7b83bc'
  };
  const fallbackByCategory={meeting:'calendar',email:'envelope',finance:'chart',hr:'person',travel:'plane',office:'building',sales:'cart',technology:'computer',contract:'paper',management:'lightbulb',operations:'gear',logistics:'box',retail:'cart',training:'book'};
  function visualFor(word, opts={}) {
    const v=word.visual || {}, caption=String(v.caption || word.meaning || '意味をイメージしよう');
    const icon = icons[v.icon] ? v.icon : fallbackByCategory[word.category] || 'book';
    const label=opts.hideMeaning ? `${word.text}の意味を考えるためのビジュアル` : `${word.text}の意味を表す${v.type==='photo'?'写真風ビジュアル':'説明イラスト'}：${caption}`;
    const hiddenClass=opts.hideMeaning ? ' caption-hidden' : '';
    if(v.type==='photo' && Number.isInteger(v.scene) && v.scene>=0 && v.scene<16) {
      return `<figure class="visual-card visual-photo${hiddenClass}"><img src="./assets/scene-photos/scene-${String(v.scene).padStart(2,'0')}.webp" alt="${escV(label)}" loading="${opts.eager?'eager':'lazy'}" decoding="async" /><figcaption>${escV(caption)}</figcaption></figure>`;
    }
    const primary=categories[icon] || '#4973a4', mark=icons[icon], aux=icons[fallbackByCategory[word.category]||'clipboard'];
    const step=word.partOfSpeech==='verb'?`<path d="M365 110h45m-12-12 12 12-12 12" stroke="#6f91b4" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`:'';
    const badge = word.partOfSpeech==='adjective' ? `<circle cx="321" cy="82" r="30" fill="#fff" opacity=".88"/><path d="m309 82 8 8 18-18" stroke="${primary}" stroke-width="6" fill="none" stroke-linecap="round"/>` : '';
    return `<figure class="visual-card visual-illustration${hiddenClass}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 285" role="img" aria-label="${escV(label)}" focusable="false"><defs>
      <linearGradient id="bgVisual" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0f6ff"/><stop offset="1" stop-color="#dcebf5"/></linearGradient>
      <filter id="softShadow"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#27445e" flood-opacity=".12"/></filter>
      </defs><rect width="480" height="285" fill="url(#bgVisual)"/><circle cx="431" cy="33" r="89" fill="${primary}" opacity=".07"/><circle cx="22" cy="257" r="93" fill="${primary}" opacity=".08"/>
      <path d="M25 225h430" stroke="#aec9df" stroke-width="2" stroke-dasharray="5 8"/>
      <rect x="121" y="27" width="238" height="194" rx="28" fill="#fff" filter="url(#softShadow)"/>
      <g transform="translate(169 59) scale(1.42)" fill="none" stroke="${primary}" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round">${mark}</g>
      <circle cx="99" cy="75" r="33" fill="#fff" opacity=".8"/><g transform="translate(76 52) scale(.46)" stroke="${primary}" stroke-width="6" fill="none" stroke-linejoin="round" stroke-linecap="round">${aux}</g>
      ${step}${badge}<circle cx="372" cy="208" r="10" fill="#34c759" opacity=".85"/><circle cx="396" cy="208" r="6" fill="#ffd166"/>
      </svg><figcaption>${escV(caption)}</figcaption></figure>`;
  }
  window.WordBoostVisual = {render:visualFor};
})();
