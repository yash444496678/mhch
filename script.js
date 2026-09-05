// ================== SUPABASE (metadata database — free, no card) ==================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://puwvoucmdxxtbbamtnki.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_UI3GR0ORNhq-UvBrOKNC2Q_qfUfnZ9F";
const TABLE_NAME = "IVVV";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================== CLOUDINARY (file uploads — free, no card) ==================
const CLOUD_NAME = "dyvmd2ayb";
const UPLOAD_PRESET = "Image vault";
const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/auto/upload";

async function uploadToCloudinary(file){
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: formData });
  if(!res.ok){
    const errText = await res.text();
    throw new Error("Cloudinary upload failed: " + errText);
  }
  return res.json(); // contains secure_url, public_id, etc.
}

// ================== APP STATE ==================
(function(){
  const categories = [
    {id:'all', label:'All items', icon:'ti-layout-grid'},
    {id:'Images', label:'Images', icon:'ti-photo'},
    {id:'Documents', label:'Documents', icon:'ti-file-text'},
    {id:'Videos', label:'Videos', icon:'ti-video'},
    {id:'Other', label:'Other', icon:'ti-folder'},
  ];
  let currentCat = 'all';
  let items = [];
  let searchTerm = '';

  const navEl = document.getElementById('nav');
  const gridEl = document.getElementById('grid');
  const emptyEl = document.getElementById('empty');
  const searchEl = document.getElementById('search');
  const fileInput = document.getElementById('file-input');
  const overlay = document.getElementById('overlay');
  const modalBody = document.getElementById('modal-body');
  const sectionTitle = document.getElementById('section-title');
  const toastEl = document.getElementById('toast');
  const uploadBtn = document.getElementById('btn-upload');

  function showToast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=>toastEl.classList.remove('show'), 2500);
  }

  function categoryFor(type){
    if(type.startsWith('image/')) return 'Images';
    if(type.startsWith('video/')) return 'Videos';
    if(type.includes('pdf') || type.startsWith('text/') || type.includes('document') || type.includes('sheet') || type.includes('presentation')) return 'Documents';
    return 'Other';
  }
  function iconFor(type){
    if(type.includes('pdf')) return 'ti-file-type-pdf';
    if(type.startsWith('text/')) return 'ti-file-text';
    if(type.startsWith('video/')) return 'ti-video';
    if(type.startsWith('audio/')) return 'ti-file-music';
    return 'ti-file';
  }
  function fmtSize(b){
    if(b < 1024) return b + ' B';
    if(b < 1024*1024) return (b/1024).toFixed(1) + ' KB';
    return (b/(1024*1024)).toFixed(1) + ' MB';
  }

  function renderNav(){
    navEl.innerHTML = '';
    categories.forEach(c => {
      const count = c.id === 'all' ? items.length : items.filter(i => i.category === c.id).length;
      const div = document.createElement('div');
      div.className = 'nav-item' + (currentCat === c.id ? ' active' : '');
      div.innerHTML = '<i class="ti '+c.icon+'" aria-hidden="true"></i><span>'+c.label+'</span><span class="count">'+count+'</span>';
      div.onclick = () => { currentCat = c.id; sectionTitle.textContent = c.label; renderGrid(); renderNav(); };
      navEl.appendChild(div);
    });
  }

  function renderStats(){
    document.getElementById('stat-total').textContent = items.length;
    document.getElementById('stat-images').textContent = items.filter(i=>i.category==='Images').length;
    document.getElementById('stat-docs').textContent = items.filter(i=>i.category==='Documents').length;
    document.getElementById('stat-other').textContent = items.filter(i=>i.category==='Other'||i.category==='Videos').length;
    const total = items.reduce((a,i)=>a+(i.size||0),0);
    document.getElementById('storage-text').textContent = (total/(1024*1024)).toFixed(1) + ' MB';
    document.getElementById('storage-fill').style.width = Math.min(100,(total/(1024*1024*1024))*100) + '%';
  }

  function renderGrid(){
    let list = currentCat === 'all' ? items : items.filter(i => i.category === currentCat);
    if(searchTerm) list = list.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    gridEl.innerHTML = '';
    emptyEl.style.display = list.length === 0 ? 'flex' : 'none';
    gridEl.style.display = list.length === 0 ? 'none' : 'block';
    list.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at)).forEach(it => {
      const card = document.createElement('div');
      card.className = 'card';
      let thumb;
      if(it.category === 'Images'){
        thumb = '<div class="thumb"><img src="'+it.url+'" alt="" loading="lazy"/></div>';
      } else {
        thumb = '<div class="thumb icon"><i class="ti '+iconFor(it.type)+'" aria-hidden="true"></i></div>';
      }
      card.innerHTML = thumb + '<div class="meta"><div class="name">'+it.name+'</div><div class="sub">'+fmtSize(it.size)+'</div></div>';
      card.onclick = () => openPreview(it);
      gridEl.appendChild(card);
    });
  }

  function closeModal(){ overlay.style.display = 'none'; modalBody.innerHTML=''; }

  function openPreview(it){
    overlay.style.display = 'flex';
    let preview = it.category === 'Images'
      ? '<img src="'+it.url+'" alt=""/>'
      : '<div class="icon-preview"><i class="ti '+iconFor(it.type)+'" aria-hidden="true"></i></div>';
    modalBody.innerHTML = preview +
      '<h3>'+it.name+'</h3>' +
      '<div class="sub">'+fmtSize(it.size)+' &middot; '+it.category+'</div>' +
      '<div class="actions">' +
      '<button class="btn" id="m-download"><i class="ti ti-download" aria-hidden="true"></i>Download</button>' +
      '<button class="btn danger" id="m-delete"><i class="ti ti-trash" aria-hidden="true"></i>Delete</button>' +
      '<button class="btn" id="m-close"><i class="ti ti-x" aria-hidden="true"></i></button>' +
      '</div>';
    document.getElementById('m-close').onclick = closeModal;
    document.getElementById('m-download').onclick = () => {
      const a = document.createElement('a'); a.href = it.url; a.download = it.name; a.target = '_blank'; a.click();
    };
    document.getElementById('m-delete').onclick = async () => {
      // Note: unsigned Cloudinary uploads can't be deleted directly from the browser
      // (that needs a signed API call from a server) — file stays in Cloudinary storage,
      // which is fine on the free tier. We just remove the entry from the vault list.
      const { error } = await supabase.from(TABLE_NAME).delete().eq('id', it.id);
      if(error){ console.error(error); showToast('Delete failed'); return; }
      closeModal();
      showToast('Removed from vault');
    };
  }

  async function loadItems(){
    const { data, error } = await supabase.from(TABLE_NAME).select('*').order('created_at', { ascending: false });
    if(error){
      console.error(error);
      showToast('Failed to load — check Supabase table/policies');
      return;
    }
    items = data || [];
    renderNav(); renderGrid(); renderStats();
  }

  async function handleFiles(fileList){
    const files = Array.from(fileList);
    if(files.length === 0) return;
    uploadBtn.disabled = true;
    try{
      for(const file of files){
        try{
          showToast('Uploading ' + file.name + '...');
          const result = await uploadToCloudinary(file);
          const { error } = await supabase.from(TABLE_NAME).insert({
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            category: categoryFor(file.type || ''),
            url: result.secure_url,
            public_id: result.public_id
          });
          if(error) throw error;
        }catch(err){
          console.error(err);
          showToast('Failed to upload ' + file.name);
        }
      }
      showToast('Upload complete');
    } finally {
      // Chahe kuch bhi ho jaaye (success, fail, ya unexpected error),
      // button hamesha wapas enable ho jayega
      uploadBtn.disabled = false;
    }
  }

  document.getElementById('btn-upload').onclick = () => fileInput.click();
  fileInput.onchange = (e) => { handleFiles(e.target.files); fileInput.value=''; };
  searchEl.oninput = (e) => { searchTerm = e.target.value; renderGrid(); };

  const dropTarget = document.body;
  dropTarget.addEventListener('dragover', (e) => { e.preventDefault(); document.body.classList.add('dropzone-active'); });
  dropTarget.addEventListener('dragleave', (e) => { if(e.target === document.body) document.body.classList.remove('dropzone-active'); });
  dropTarget.addEventListener('drop', (e) => {
    e.preventDefault();
    document.body.classList.remove('dropzone-active');
    if(e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  });
  overlay.addEventListener('click', (e) => { if(e.target === overlay) closeModal(); });

  // ================== REAL-TIME SYNC ==================
  // Koi bhi device data add/delete kare, sabko live update mil jayega
  supabase
    .channel('vault-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => {
      loadItems();
    })
    .subscribe();

  loadItems();
})();
