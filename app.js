/* Word Boost - offline-first mobile web edition; records are local to this browser. */
(() => {
  'use strict';
  const KEY = 'wordboost-pwa-progress-v1';
  const MAIN = document.getElementById('main-content');
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dateAfter = (n, basis = new Date()) => { const d = new Date(basis); d.setHours(12,0,0,0); d.setDate(d.getDate() + n); return localDay(d); };
  const plural = (v,unit='語') => `${v}${unit}`;
  const shuffle = list => { const a=[...list]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; };
  let allWords = [];
  let data = load();
  let ui = { screen: 'home', tab: 'home', filter: 'all', search: '', selectedId: null, reveal: false, queue: [], pos: 0, sessionStarted: 0, answers: [], quiz: [], quizPos: 0, quizAnswers: [], quizFeedback: null, quizStarted: 0 };
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      return { records: saved.records || {}, custom: Array.isArray(saved.custom) ? saved.custom : [], sessions: Array.isArray(saved.sessions) ? saved.sessions : [], settings: {targetScore: 600, voice: 'en-US', ...saved.settings} };
    } catch { return { records:{},custom:[],sessions:[],settings:{targetScore:600,voice:'en-US'} }; }
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { toast('保存できません。ブラウザの空き容量・設定を確認してください。'); } }
  function usableWords() { return allWords.filter(w => w.source === 'user' || Number(w.level) <= data.settings.targetScore); }
  function byId(id) { return allWords.find(w => w.id === id); }
  function record(id) { return data.records[id] || null; }
  function ensureRecord(id) { return data.records[id] ||= {interval:1,easeFactor:2.5,nextReviewAt:null,correctCount:0,wrongCount:0,forgetStreak:0,isFavorite:false,seen:false,lastAnswer:null}; }
  function dueWords() { const today=localDay(); return usableWords().filter(w=>record(w.id)?.seen && (record(w.id).nextReviewAt||today)<=today).sort((a,b)=>{
    const ar=record(a.id),br=record(b.id);return (br.forgetStreak-ar.forgetStreak)||String(ar.nextReviewAt).localeCompare(String(br.nextReviewAt));
  }); }
  function newWords() { return usableWords().filter(w => !record(w.id)?.seen); }
  function mission() { const due=dueWords().slice(0,10); const fresh=newWords().slice(0,Math.min(10,15-due.length)); return {due,fresh,queue:shuffle([...due,...fresh])}; }
  function dailySessions() { return data.sessions.filter(s=>s.date===localDay()); }
  function todaySeconds() { return dailySessions().reduce((sum,s)=>sum+(s.duration||0),0); }
  function streak() { const days=new Set(data.sessions.map(s=>s.date)); let day=localDay(); if(!days.has(day))day=dateAfter(-1); let count=0;while(days.has(day)){count++;day=dateAfter(-(count+(!days.has(localDay())?1:0)));}return count; }
  function mastered() { return usableWords().filter(w => {const r=record(w.id);return r?.correctCount>=2 && r.interval>=7;}).length; }
  function head(title,sub='') {return `<h1 class="headline">${esc(title)}</h1>${sub?`<p class="subtitle">${esc(sub)}</p>`:''}`;}
  function btn(text,action,kind='',attrs='') {return `<button class="btn ${kind}" data-action="${action}" ${attrs}>${text}</button>`;}
  function home() {
    const m=mission(), total=usableWords().length, learned=mastered(), pct=total?Math.round(learned/total*100):0;
    return `${head('今日も、3分から。','単語を少しずつ、確実に。')}
      <section class="card mission"><div class="topline"><span class="eyebrow">✦ 今日のミッション</span><span class="pill">約3分</span></div>
      <h2>新規${m.fresh.length}語 + 復習${m.due.length}語</h2><p>今日やることは、これだけ。</p>
      ${btn(m.queue.length?'▶ 学習をはじめる':'✓ 今日の学習は完了！','start-mission','light',m.queue.length?'':'disabled')}</section>
      <div class="grid2"><section class="card stat"><span class="eyebrow">🔥 連続学習</span><div class="number mono">${streak()}日</div></section>
      <section class="card stat"><span class="eyebrow">◷ 今日の学習</span><div class="number mono">${Math.round(todaySeconds()/60)}分</div></section></div>
      <section class="card"><div class="topline"><strong>${data.settings.targetScore}点向けの単語</strong><span class="small muted">${learned} / ${total}語</span></div>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="習得進捗"><div style="width:${pct}%"></div></div>
      <p class="small muted" style="margin-bottom:0">習得率 ${pct}%（試験スコアの予測ではありません）</p></section>
      <h2 class="section-title">学び方</h2><div class="callout">① 単語を見て思い出す → ② 意味・例文を確認 → ③「完璧 / あいまい / 忘れた」を選択。忘れる前にまた出題します。</div>`;
  }
  function wordRows() {
    const q=ui.search.toLowerCase().trim();
    const words=usableWords().filter(w => (!q || `${w.text} ${w.meaning} ${w.category}`.toLowerCase().includes(q)) && (
      ui.filter==='all'||(ui.filter==='favorite'&&record(w.id)?.isFavorite)||(ui.filter==='weak'&&record(w.id)?.wrongCount>0)||(ui.filter==='user'&&w.source==='user')
    )).slice(0,100);
    if(!words.length)return `<div class="empty">該当する単語がありません。<br>検索条件を変えてみてください。</div>`;
    return words.map(w=>`<button class="word-row" data-action="detail" data-id="${esc(w.id)}"><div class="row-main"><div class="en">${esc(w.text)} ${record(w.id)?.isFavorite?'★':''}</div><div class="ja">${esc(w.meaning)}</div></div><span class="pill">${w.source==='user'?'自作':w.level+'点'}</span><span class="arrow">›</span></button>`).join('');
  }
  function wordsView() {
    return `${head('単語帳','500語と、自分で追加した単語を学べます。')}
      <div class="topline" style="margin:0 0 15px"><strong>${usableWords().length}語の単語帳</strong>${btn('＋ 単語を追加','add-word','small')}</div>
      <input class="search" id="word-search" type="search" placeholder="英単語・日本語訳で検索" value="${esc(ui.search)}" aria-label="単語を検索" />
      <div class="tag-row" style="margin:13px 0 17px">${[['all','すべて'],['favorite','お気に入り'],['weak','苦手'],['user','マイ単語']].map(([k,t])=>`<button class="tag ${ui.filter===k?'active':''}" data-action="filter" data-filter="${k}">${t}</button>`).join('')}</div>
      <div id="word-list">${wordRows()}</div><p class="small muted center">一覧は最大100語を表示します。検索して絞り込めます。</p>`;
  }
  function wordDetail() {
    const w=byId(ui.selectedId); if(!w)return home(); const r=record(w.id);
    return `<button class="back" data-action="back-words">‹ 単語帳へ戻る</button>
      <section class="card word-card"><span class="eyebrow">${esc(w.source==='user'?'マイ単語':w.level+'点向け')} · ${esc(w.partOfSpeech||'')}</span>
      <div class="detail-word">${esc(w.text)}</div><div class="small muted">${esc(w.pronunciation||'')}</div>
      <button class="audio-btn" data-action="speak" data-id="${esc(w.id)}" aria-label="発音を聞く">🔊</button>
      <div class="translation">${esc(w.meaning)}</div>
      ${w.exampleEn?`<div class="example">${esc(w.exampleEn)}</div><div class="example-ja">${esc(w.exampleJa)}</div>`:''}</section>
      <div class="grid2">${btn(r?.isFavorite?'★ お気に入り解除':'☆ お気に入り','favorite','secondary')}${btn('カードで学習','study-one')}</div>
      ${w.synonyms?.length?`<section class="card spaced"><span class="eyebrow">類義語</span><p>${esc(w.synonyms.join(' / '))}</p></section>`:''}
      ${w.derivatives?.length?`<section class="card"><span class="eyebrow">派生語</span><p>${esc(w.derivatives.join(' / '))}</p></section>`:''}
      ${w.source==='user'?`<div style="margin-top:15px">${btn('この単語を削除','delete-word','outline')}</div>`:''}`;
  }
  function addWord() {
    return `<button class="back" data-action="back-words">‹ 単語帳へ戻る</button>${head('マイ単語を追加','英単語と意味だけでも登録できます。')}
      <form id="add-form" class="card">
      <label class="field-label" for="add-en">英単語（必須）</label><input id="add-en" name="text" class="input" required maxlength="80" autocomplete="off" placeholder="negotiate" />
      <label class="field-label" for="add-ja">日本語の意味（必須）</label><input id="add-ja" name="meaning" class="input" required maxlength="160" placeholder="交渉する" />
      <label class="field-label" for="add-ex">英語例文（任意）</label><input id="add-ex" name="exampleEn" class="input" maxlength="240" placeholder="We will negotiate the contract." />
      <label class="field-label" for="add-ex-ja">例文の日本語訳（任意）</label><input id="add-ex-ja" name="exampleJa" class="input" maxlength="240" />
      <div style="margin-top:20px"><button class="btn" type="submit">マイ単語帳に追加する</button></div>
      </form><p class="small muted">追加した単語も、今日の復習に自動で組み込まれます。</p>`;
  }
  function flash() {
    const w=byId(ui.queue[ui.pos]); if(!w){finishSession();return result();}
    const progress=Math.round(ui.pos/ui.queue.length*100);
    return `<button class="back" data-action="finish-session">× 学習を終了</button><div class="topline"><strong>今日の学習</strong><span class="small muted">${ui.pos+1} / ${ui.queue.length}語</span></div>
      <div class="progress" style="margin:13px 0 18px"><div style="width:${progress}%"></div></div>
      <section class="card word-card ${ui.reveal?'revealed':''}"><span class="eyebrow">${w.source==='user'?'マイ単語':w.level+'点向け'} · ${esc(w.partOfSpeech||'')}</span>
      <div class="flash-word">${esc(w.text)}</div><div class="small muted">${esc(w.pronunciation||'')}</div>
      <button class="audio-btn" data-action="speak" data-id="${esc(w.id)}" aria-label="発音を聞く">🔊</button>
      ${ui.reveal?`<div class="translation">${esc(w.meaning)}</div>${w.exampleEn?`<div class="example">${esc(w.exampleEn)}</div><div class="example-ja">${esc(w.exampleJa)}</div>`:''}${record(w.id)?.forgetStreak>=3?'<div class="pill" style="margin-top:12px">例文付き特別復習</div>':''}`:'<p class="small muted" style="margin-top:16px">意味を思い出してから確認しましょう</p>'}</section>
      ${ui.reveal?`<p class="small muted center">覚えていた度合いを選んでください</p><div class="rating-grid">
      ${btn('忘れた','rate','danger','data-rating="forgot"')}${btn('あいまい','rate','muted','data-rating="vague"')}${btn('完璧','rate','success','data-rating="perfect"')}
      </div>`:btn('意味と例文を見る','reveal')}`;
  }
  function result() {
    const n=ui.answers.length, perfect=ui.answers.filter(a=>a.rating==='perfect').length, sec=Math.max(0,Math.round((Date.now()-ui.sessionStarted)/1000));
    return `<section class="card center" style="padding:30px 20px"><div style="font-size:48px">🎉</div>
      <h1 class="headline">今日もよく頑張りました！</h1><p class="subtitle">少しずつ続けることが、力になります。</p>
      <div class="grid2" style="margin-bottom:17px"><div class="card stat"><span class="eyebrow">回答した単語</span><div class="number">${plural(n)}</div></div><div class="card stat"><span class="eyebrow">完璧</span><div class="number">${plural(perfect)}</div></div></div>
      <p class="small muted">復習の予定は自動で保存しました。</p>${btn('ホームに戻る','go-home')}</section>`;
  }
  function testView() {
    return `${head('4択テスト','意味を選んで、覚えた単語をチェック。')}
      <section class="card" style="text-align:center;padding:26px 22px"><div style="font-size:39px">📝</div><h2>ミニテスト 10問</h2><p class="small muted" style="line-height:1.7">選択肢から正しい日本語訳を選びます。結果は復習スケジュールにも反映されます。</p>${btn('10問テストを開始','start-quiz')}</section>
      <div class="callout">スペル入力・リスニング問題は、今後追加予定です。</div>`;
  }
  function quizView() {
    const w=byId(ui.quiz[ui.quizPos]?.wordId);if(!w)return quizResult();
    const row=ui.quiz[ui.quizPos],fb=ui.quizFeedback;
    return `<button class="back" data-action="stop-quiz">× テストを終了</button><div class="topline"><strong>4択クイズ</strong><span class="small muted">${ui.quizPos+1} / ${ui.quiz.length}問</span></div>
      <div class="progress" style="margin:12px 0 18px"><div style="width:${Math.round(ui.quizPos/ui.quiz.length*100)}%"></div></div>
      <section class="card word-card" style="min-height:180px"><span class="eyebrow">次の英単語の意味は？</span><div class="flash-word">${esc(w.text)}</div><button class="audio-btn" data-action="speak" data-id="${esc(w.id)}" aria-label="発音を聞く">🔊</button></section>
      ${row.choices.map((choice,i)=>`<button class="word-row choice ${fb?(choice===w.meaning?'correct':fb.selected===choice?'wrong':''):''}" data-action="choose" data-index="${i}" ${fb?'disabled':''}>
      <span class="badge-letter">${'ABCD'[i]}</span><span>${esc(choice)}</span></button>`).join('')}
      ${fb?`<div class="feedback ${fb.correct?'':'wrong'}">${fb.correct?'✓ 正解！':'× 不正解'}　正解：<strong>${esc(w.meaning)}</strong><div class="small" style="margin-top:4px">${esc(w.exampleEn||'')}</div></div><div style="margin-top:14px">${btn(ui.quizPos===ui.quiz.length-1?'結果を見る':'次の問題へ','next-quiz')}</div>`:''}`;
  }
  function quizResult() {
    const n=ui.quizAnswers.length, correct=ui.quizAnswers.filter(a=>a.correct).length, rate=n?Math.round(correct/n*100):0;
    return `<section class="card center" style="padding:32px 20px"><div style="font-size:48px">🏅</div><h1 class="headline">テスト結果</h1><div class="detail-word">${rate}%</div>
      <p class="muted">${n}問中 ${correct}問正解</p><p class="small muted">正解・不正解を復習予定に反映しました。</p>${btn('テストメニューに戻る','back-test')}</section>`;
  }
  function recordView() {
    const n=data.sessions.reduce((sum,s)=>sum+s.answers,0),correct=data.sessions.reduce((sum,s)=>sum+s.correct,0),rate=n?Math.round(correct/n*100):0;
    const days=Array.from({length:7},(_,i)=>dateAfter(i-6));const counts=days.map(day=>data.sessions.filter(s=>s.date===day).reduce((sum,s)=>sum+s.answers,0));const top=Math.max(1,...counts);
    const weak=usableWords().filter(w=>record(w.id)?.wrongCount>0).sort((a,b)=>record(b.id).wrongCount-record(a.id).wrongCount).slice(0,5);
    return `${head('学習の記録','今日の一歩も、しっかり積み重なっています。')}
      <div class="grid2"><section class="card stat"><span class="eyebrow">習得語数</span><div class="number">${mastered()}語</div></section><section class="card stat"><span class="eyebrow">連続学習</span><div class="number">${streak()}日</div></section></div>
      <section class="card"><div class="topline"><strong>最近7日間の学習語数</strong><span class="small muted">回答回数</span></div><div class="bar-strip spaced">${counts.map((c,i)=>`<div class="bar-day"><div class="small mono">${c||''}</div><div class="bar" style="height:${Math.max(4,Math.round(c/top*76))}px"></div><span>${Number(days[i].slice(8))}日</span></div>`).join('')}</div></section>
      <section class="card"><div class="topline"><strong>回答の記録</strong><strong>${rate}%</strong></div><p class="small muted">完璧とテスト正解の割合（${n}回答）</p><div class="progress"><div style="width:${rate}%"></div></div></section>
      <h2 class="section-title">苦手な単語</h2>${weak.length?weak.map(w=>`<button class="word-row" data-action="detail" data-id="${esc(w.id)}"><div class="row-main"><div class="en">${esc(w.text)}</div><div class="ja">${esc(w.meaning)}</div></div><span class="pill">忘れた ${record(w.id).wrongCount}回</span></button>`).join(''):'<div class="empty">まだ苦手単語はありません。学習を始めましょう。</div>'}
      <h2 class="section-title">バッジ</h2><section class="card"><strong>${streak()>=7?'🏆':'🔒'} 7日連続学習</strong><p class="small muted" style="margin-bottom:0">${streak()>=7?'達成！':'7日続けると解放されます'}</p></section>`;
  }
  function settingsView() {
    return `<button class="back" data-action="go-home">‹ 戻る</button>${head('設定','目標や読み上げ音声を変更できます。')}
      <form id="settings-form" class="card">
      <label class="field-label" for="target-score">学習するスコア帯</label><select id="target-score" class="input" name="targetScore">
      ${[600,730,860].map(n=>`<option value="${n}" ${data.settings.targetScore===n?'selected':''}>${n}点を目指す（${n===600?'600':n===730?'600・730':'600・730・860'}点向け）</option>`).join('')}</select>
      <label class="field-label" for="voice-type">英語の発音</label><select id="voice-type" class="input" name="voice"><option value="en-US" ${data.settings.voice==='en-US'?'selected':''}>アメリカ英語</option><option value="en-GB" ${data.settings.voice==='en-GB'?'selected':''}>イギリス英語</option></select>
      <div style="margin-top:20px"><button class="btn" type="submit">設定を保存</button></div></form>
      <div class="callout"><strong>データの保存について</strong><br>学習履歴はこの端末のブラウザ内に保存されます。Safariの履歴・Webサイトデータを消すと、学習履歴も消える場合があります。別端末との同期はありません。</div>`;
  }
  function render() {
    const views={home,words:wordsView,detail:wordDetail,add:addWord,flash,result,test:testView,quiz:quizView,quizresult:quizResult,record:recordView,settings:settingsView};
    MAIN.innerHTML=(views[ui.screen]||home)();
    document.querySelectorAll('[data-tab]').forEach(button=>{
      const active=button.dataset.tab===ui.tab;button.classList.toggle('selected',active);button.setAttribute('aria-current',active?'page':'false');
    });
    document.getElementById('settings-button').hidden=ui.screen==='settings';
  }
  function navigate(screen,tab=null) {ui.screen=screen;if(tab)ui.tab=tab;render();window.scrollTo({top:0,behavior:'instant'});}
  function toast(message) { const el=$('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2500); }
  function speak(id) {
    const w=byId(id);if(!w)return;
    if(!('speechSynthesis' in window)){toast('このブラウザは音声読み上げに対応していません');return;}
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(w.text);u.lang=data.settings.voice;u.rate=.82;
    const voice=speechSynthesis.getVoices().find(v=>v.lang===u.lang);if(voice)u.voice=voice;
    speechSynthesis.speak(u);
  }
  function updateReview(id,rating) {
    const r=ensureRecord(id);const original=record(id)?.seen;
    if(rating==='perfect') {r.interval=original?Math.max(1,Math.round(r.interval*2.5)):1;r.correctCount++;r.forgetStreak=0;r.easeFactor=Math.min(2.8,(r.easeFactor||2.5)+.05);}
    else if(rating==='vague'){r.interval=Math.max(1,r.interval||1);r.forgetStreak=0;r.easeFactor=Math.max(1.3,(r.easeFactor||2.5)-.05);}
    else {r.interval=1;r.wrongCount++;r.forgetStreak=(r.forgetStreak||0)+1;r.easeFactor=Math.max(1.3,(r.easeFactor||2.5)-.2);}
    r.seen=true;r.lastAnswer=rating;r.lastReviewedAt=localDay();r.nextReviewAt=dateAfter(r.interval);
    persist();
  }
  function startMission(ids=null) {
    const words=ids?ids:mission().queue.map(w=>w.id);if(!words.length){toast('復習対象の単語がありません');return;}
    ui.queue=words;ui.pos=0;ui.reveal=false;ui.answers=[];ui.sessionStarted=Date.now();navigate('flash','home');
  }
  function finishSession() {
    if(ui.answers.length){const correct=ui.answers.filter(a=>a.rating==='perfect').length;data.sessions.push({date:localDay(),duration:Math.max(1,Math.round((Date.now()-ui.sessionStarted)/1000)),answers:ui.answers.length,correct,kind:'flash'});persist();}
    navigate('result','home');
  }
  function startQuiz() {
    const pool=shuffle(usableWords());if(pool.length<4){toast('単語が足りません');return;}
    const selected=pool.slice(0,10),meanings=[...new Set(pool.map(w=>w.meaning))];
    ui.quiz=selected.map(w=>({wordId:w.id,choices:shuffle([w.meaning,...shuffle(meanings.filter(m=>m!==w.meaning)).slice(0,3)])}));
    ui.quizPos=0;ui.quizFeedback=null;ui.quizAnswers=[];ui.quizStarted=Date.now();navigate('quiz','test');
  }
  function finishQuiz() {
    if(ui.quizAnswers.length){data.sessions.push({date:localDay(),duration:Math.max(1,Math.round((Date.now()-ui.quizStarted)/1000)),answers:ui.quizAnswers.length,correct:ui.quizAnswers.filter(a=>a.correct).length,kind:'quiz'});persist();}
    navigate('quizresult','test');
  }
  document.addEventListener('click',e=>{
    const tab=e.target.closest('[data-tab]');if(tab){ui.filter='all';ui.search='';navigate(tab.dataset.tab,tab.dataset.tab);return;}
    const b=e.target.closest('[data-action]');if(!b)return;const action=b.dataset.action;
    switch(action){
      case 'settings':navigate('settings');break;
      case 'go-home':navigate('home','home');break;
      case 'back-words':navigate('words','words');break;
      case 'filter':ui.filter=b.dataset.filter;render();break;
      case 'detail':ui.selectedId=b.dataset.id;navigate('detail','words');break;
      case 'add-word':navigate('add','words');break;
      case 'speak':speak(b.dataset.id);break;
      case 'favorite':{const r=ensureRecord(ui.selectedId);r.isFavorite=!r.isFavorite;persist();render();toast(r.isFavorite?'お気に入りに登録しました':'お気に入りを解除しました');break;}
      case 'delete-word':{const w=byId(ui.selectedId);if(w?.source==='user'&&confirm(`「${w.text}」を削除しますか？`)){data.custom=data.custom.filter(x=>x.id!==w.id);delete data.records[w.id];allWords=allWords.filter(x=>x.id!==w.id);persist();navigate('words','words');}break;}
      case 'study-one':startMission([ui.selectedId]);break;
      case 'start-mission':startMission();break;
      case 'reveal':ui.reveal=true;render();break;
      case 'rate':{const id=ui.queue[ui.pos],rating=b.dataset.rating;updateReview(id,rating);ui.answers.push({id,rating});ui.pos++;ui.reveal=false;if(ui.pos>=ui.queue.length)finishSession();else render();break;}
      case 'finish-session':finishSession();break;
      case 'start-quiz':startQuiz();break;
      case 'choose':{if(ui.quizFeedback)return;const row=ui.quiz[ui.quizPos],w=byId(row.wordId),selected=row.choices[Number(b.dataset.index)],correct=selected===w.meaning;
        ui.quizFeedback={correct,selected};ui.quizAnswers.push({id:w.id,correct});updateReview(w.id,correct?'perfect':'forgot');render();break;}
      case 'next-quiz':ui.quizPos++;ui.quizFeedback=null;if(ui.quizPos>=ui.quiz.length)finishQuiz();else render();break;
      case 'stop-quiz':finishQuiz();break;
      case 'back-test':navigate('test','test');break;
    }
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='word-search'){ui.search=e.target.value;const list=$('word-list');if(list)list.innerHTML=wordRows();}
  });
  document.addEventListener('submit',e=>{
    if(e.target.id==='add-form'){
      e.preventDefault();const fd=new FormData(e.target),text=String(fd.get('text')||'').trim(),meaning=String(fd.get('meaning')||'').trim();
      if(!text||!meaning){toast('英単語と意味を入力してください');return;}
      if(allWords.some(w=>w.text.toLowerCase()===text.toLowerCase())){toast('その単語はすでに登録されています');return;}
      const id='user-'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.floor(Math.random()*1e6));
      const word={id,text,meaning,exampleEn:String(fd.get('exampleEn')||'').trim(),exampleJa:String(fd.get('exampleJa')||'').trim(),partOfSpeech:'',pronunciation:'',level:null,category:'my-words',synonyms:[],derivatives:[],source:'user',contentVersion:1};
      data.custom.push(word);allWords.push(word);persist();ui.filter='user';ui.search='';navigate('words','words');toast('マイ単語帳に追加しました');
    }
    if(e.target.id==='settings-form'){
      e.preventDefault();const fd=new FormData(e.target);data.settings.targetScore=Number(fd.get('targetScore'));data.settings.voice=String(fd.get('voice'));persist();navigate('home','home');toast('設定を保存しました');
    }
  });
  async function init() {
    try {
      const files=await Promise.all([600,730,860].map(n=>fetch(`./data/words_${n}.json`).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();})));
      allWords=[...files.flat(),...data.custom];render();
      if('serviceWorker' in navigator && location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
    } catch (err) {
      MAIN.innerHTML=`${head('読み込みに失敗しました','GitHubのファイル一覧ではなく、GitHub PagesのURLから開いてください。')}
        <div class="callout">JSONファイルを読み込めませんでした。GitHub Pagesで公開したURLを開き直すか、通信状態を確認してください。</div>
        <p class="small muted">エラー：${esc(err.message)}</p>`;
    }
  }
  init();
})();
