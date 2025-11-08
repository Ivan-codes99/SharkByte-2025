// Student Roadmap Builder - vanilla JS
// Stores profile and roadmap in localStorage. Provides templates for common majors

const STORAGE_PROFILE = 'studentProfile:v1';
const STORAGE_ROADMAP = 'studentRoadmap:v1';

const templates = {
  'Computer Science': [
    {title: 'Build foundations: Data Structures & Algorithms', when: 'This semester', detail: 'Core CS courses, practice coding problems'},
    {title: 'Build projects', when: 'Next 6 months', detail: 'Portfolio projects, GitHub, personal website'},
    {title: 'Internship applications', when: 'Next semester', detail: 'Apply to internships, prepare interviews'},
    {title: 'Learn systems & networking', when: '1 year', detail: 'Operating systems, networks, cloud basics'},
    {title: 'Consider specialization', when: 'Long term', detail: 'AI, Security, Web, Mobile, Data'}
  ],
  'Business': [
    {title: 'Core business courses', when: 'This semester', detail: 'Accounting, finance, marketing basics'},
    {title: 'Join a student org', when: 'Next semester', detail: 'Case teams, entrepreneurship clubs'},
    {title: 'Gain experience', when: '6 months', detail: 'Internships or part-time roles'},
    {title: 'Network & mentorship', when: '1 year', detail: 'Faculty and alumni connections'},
    {title: 'Explore certifications', when: 'Long term', detail: 'Google Analytics, CFA (if applicable)'}
  ],
  'Biology': [
    {title: 'Core science courses', when: 'This semester', detail: 'Genetics, lab methods, statistics'},
    {title: 'Lab experience', when: 'Next semester', detail: 'Assist in labs, volunteer for research projects'},
    {title: 'Field/work experience', when: '6 months', detail: 'Internships at clinics, research centers'},
    {title: 'Consider grad-school pathway', when: '1 year', detail: 'Prepare for GRE/subject tests, research experience'},
    {title: 'Publish or present', when: 'Long term', detail: 'Contribute to papers, conferences'}
  ],
  'Art & Design': [
    {title: 'Build a portfolio', when: 'This semester', detail: 'Curate best work, create case studies'},
    {title: 'Learn industry tools', when: 'Next semester', detail: 'Figma, Adobe Suite, Blender'},
    {title: 'Freelance or internships', when: '6 months', detail: 'Small projects to gain clients'},
    {title: 'Showcase work', when: '1 year', detail: 'Website, Behance, Dribbble'},
    {title: 'Network', when: 'Long term', detail: 'Meetups, design communities'}
  ],
  'Engineering': [
    {title: 'Core engineering courses', when: 'This semester', detail: 'Statics, circuits, materials, math'},
    {title: 'Hands-on labs', when: 'Next semester', detail: 'Design projects, maker labs'},
    {title: 'Internships/co-ops', when: '6 months', detail: 'Industry experience is high value'},
    {title: 'Certifications & tools', when: '1 year', detail: 'CAD, MATLAB, PLCs depending on field'},
    {title: 'Prepare for PE/grad', when: 'Long term', detail: 'Licensing or advanced degrees'}
  ]
};

let profile = null;
let roadmap = [];

function $(sel){return document.querySelector(sel)}
function $all(sel){return Array.from(document.querySelectorAll(sel))}

function init(){
  // elements
  const form = $('#profileForm');
  const nameEl = $('#name');
  const majorEl = $('#major');
  const yearEl = $('#year');
  const goalEl = $('#goal');
  const btnClear = $('#btnClear');
  const btnExport = $('#btnExport');
  const btnPrint = $('#btnPrint');
  const btnAdd = $('#btnAddStep');
  const newStepText = $('#newStepText');
  const newStepWhen = $('#newStepWhen');

  // load saved
  const savedProfile = localStorage.getItem(STORAGE_PROFILE);
  if(savedProfile){
    profile = JSON.parse(savedProfile);
    nameEl.value = profile.name || '';
    majorEl.value = profile.major || '';
    yearEl.value = profile.year || '1';
    goalEl.value = profile.goal || '';
  }
  const savedRoad = localStorage.getItem(STORAGE_ROADMAP);
  if(savedRoad){ roadmap = JSON.parse(savedRoad); }

  form.addEventListener('submit', e => {
    e.preventDefault();
    profile = {name: nameEl.value.trim(), major: majorEl.value.trim(), year: yearEl.value, goal: goalEl.value.trim()};
    localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
    // generate suggestions based on major
    generateFromMajor(profile.major);
    renderSuggestions();
    renderRoadmap();
  });

  btnClear.addEventListener('click', ()=>{
    if(confirm('Clear saved profile and roadmap?')){
      localStorage.removeItem(STORAGE_PROFILE);
      localStorage.removeItem(STORAGE_ROADMAP);
      profile = null; roadmap = [];
      $('#profileForm').reset(); renderRoadmap(); renderSuggestions();
    }
  });

  btnAdd.addEventListener('click', ()=>{
    const text = newStepText.value.trim();
    if(!text) return;
    const when = newStepWhen.value;
    addStep({title: text, when, detail: ''});
    newStepText.value = '';
  });

  btnExport.addEventListener('click', ()=>{
    const payload = {profile, roadmap};
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'roadmap.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  btnPrint.addEventListener('click', ()=>{ window.print(); });

  // initial render
  renderRoadmap();
  renderSuggestions();
}

function generateFromMajor(major){
  if(!major) return;
  const t = templates[major];
  if(t){
    // only add suggestions that are not already present
    roadmap = roadmap.concat(t.map(s => ({...s, suggested:true}))).slice(0,50);
    saveRoadmap();
  }
}

function saveRoadmap(){ localStorage.setItem(STORAGE_ROADMAP, JSON.stringify(roadmap)); }

function renderRoadmap(){
  const ul = $('#roadmap'); ul.innerHTML = '';
  if(roadmap.length===0){
    ul.innerHTML = '<li class="muted">No steps yet — generate a roadmap or add steps.</li>';
    return;
  }
  roadmap.forEach((item, idx)=>{
    const li = document.createElement('li'); li.draggable = true; li.dataset.index = idx;
    const handle = document.createElement('div'); handle.className='handle'; handle.title='Drag to reorder';
    const content = document.createElement('div'); content.className='content';
    const title = document.createElement('div'); title.className='title'; title.textContent = item.title;
    const meta = document.createElement('div'); meta.className='meta'; meta.textContent = item.when + (item.detail? ' — '+item.detail:'');
    content.appendChild(title); content.appendChild(meta);

    const controls = document.createElement('div'); controls.className='controls';
    const chk = document.createElement('input'); chk.type='checkbox'; chk.title='Mark done'; chk.checked = !!item.done;
    chk.addEventListener('change', ()=>{ item.done = chk.checked; saveRoadmap(); renderRoadmap(); });

    const del = document.createElement('button'); del.className='btn ghost'; del.textContent='Remove';
    del.addEventListener('click', ()=>{ if(confirm('Remove this step?')){ roadmap.splice(idx,1); saveRoadmap(); renderRoadmap(); }});

    controls.appendChild(chk); controls.appendChild(del);

    li.appendChild(handle); li.appendChild(content); li.appendChild(controls);

    // drag events
    li.addEventListener('dragstart', (e)=>{ e.dataTransfer.setData('text/plain', idx); li.style.opacity=0.6; });
    li.addEventListener('dragend', ()=>{ li.style.opacity=1; });
    li.addEventListener('dragover', (e)=>{ e.preventDefault(); li.classList.add('drag-over'); });
    li.addEventListener('dragleave', ()=>{ li.classList.remove('drag-over'); });
    li.addEventListener('drop', (e)=>{
      e.preventDefault(); li.classList.remove('drag-over');
      const from = Number(e.dataTransfer.getData('text/plain'));
      const to = Number(li.dataset.index);
      reorder(from,to);
    });

    ul.appendChild(li);
  });
}

function reorder(from, to){
  if(from===to) return; const item = roadmap.splice(from,1)[0]; roadmap.splice(to,0,item); saveRoadmap(); renderRoadmap(); }

function addStep(step){ roadmap.push({...step, done:false}); saveRoadmap(); renderRoadmap(); }

function renderSuggestions(){
  const container = $('#suggestions'); container.innerHTML='';
  if(!profile || !profile.major){
    container.innerHTML = '<div class="suggestion muted">Enter your major and goal, then click "Generate roadmap" for tailored steps.</div>';
    return;
  }
  const major = profile.major;
  const list = templates[major] || [];
  if(list.length===0){ container.innerHTML = '<div class="suggestion muted">No template found for this major. Add custom steps below.</div>'; return; }
  list.forEach(s=>{
    const el = document.createElement('div'); el.className='suggestion';
    const title = document.createElement('div'); title.style.fontWeight='600'; title.textContent = s.title;
    const meta = document.createElement('div'); meta.className='meta'; meta.textContent = s.when + ' — ' + s.detail;
    const use = document.createElement('button'); use.className='btn'; use.textContent='Use';
    use.addEventListener('click', ()=>{ addStep({...s, suggested:false}); });
    el.appendChild(title); el.appendChild(meta); el.appendChild(use);
    container.appendChild(el);
  });
}

document.addEventListener('DOMContentLoaded', init);

/* Tilt behavior for feature cards (vanilla JS approximation of the React motion example) */
function attachTiltToCards(selector = '.feature-card', opts = {}){
  const cards = document.querySelectorAll(selector);
  const defaultOpts = {
    rotateAmplitude: opts.rotateAmplitude || 12,
    scaleOnHover: opts.scaleOnHover || 1.06,
    smoothing: opts.smoothing || 0.12
  };

  // disable on touch devices
  if(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

  cards.forEach(card => {
  // apply transforms to the whole card so the entire box (background + text) tilts
  const inner = card; // previously targeted .tilt-inner which only tilted inner contents
    let rect = null;
    let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
    let targetScale = 1, currentScale = 1;
    let raf = null;

    function update(){
      currentX += (targetX - currentX) * defaultOpts.smoothing;
      currentY += (targetY - currentY) * defaultOpts.smoothing;
      currentScale += (targetScale - currentScale) * defaultOpts.smoothing;
      inner.style.transform = `rotateX(${currentX}deg) rotateY(${currentY}deg) scale(${currentScale})`;
      raf = requestAnimationFrame(update);
    }

    function handleMove(e){
      if(!rect) rect = card.getBoundingClientRect();
      const offsetX = e.clientX - rect.left - rect.width/2;
      const offsetY = e.clientY - rect.top - rect.height/2;
      const rotationX = (offsetY / (rect.height/2)) * -defaultOpts.rotateAmplitude;
      const rotationY = (offsetX / (rect.width/2)) * defaultOpts.rotateAmplitude;
      targetX = rotationX;
      targetY = rotationY;
    }

    function enter(){
      rect = card.getBoundingClientRect();
      targetScale = defaultOpts.scaleOnHover;
      if(!raf) update();
    }

    function leave(){
      targetScale = 1;
      targetX = 0; targetY = 0;
      // let the smoothing bring values to 0, then cancel
      setTimeout(()=>{ if(raf){ cancelAnimationFrame(raf); raf = null; } }, 300);
    }

    card.addEventListener('mousemove', handleMove);
    card.addEventListener('mouseenter', enter);
    card.addEventListener('mouseleave', leave);
  });
}

// initialize tilt after init() runs
document.addEventListener('DOMContentLoaded', ()=>{ attachTiltToCards('.feature-card', {rotateAmplitude:12, scaleOnHover:1.08, smoothing:0.14}); });
