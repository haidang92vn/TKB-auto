document.documentElement.classList.add('js');

const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');

function syncHeader(){
  header?.classList.toggle('scrolled', window.scrollY > 8);
}

syncHeader();
window.addEventListener('scroll', syncHeader, {passive:true});

menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});

nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));

if('serviceWorker' in navigator){
  window.addEventListener('load', async () => {
    try{
      const registrations=await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(item=>item.unregister()));
    }catch(error){ console.warn('Không thể dọn service worker cũ:',error); }
  });
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveals = document.querySelectorAll('.reveal');

if(reduceMotion || !('IntersectionObserver' in window)){
  reveals.forEach(item => item.classList.add('visible'));
}else{
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {threshold:.12});
  reveals.forEach(item => observer.observe(item));
}

const year = document.getElementById('year');
if(year) year.textContent = String(new Date().getFullYear());

let installerDownloadRunning=false;
async function downloadDesktopInstaller(event){
  event.preventDefault();
  if(installerDownloadRunning) return;
  installerDownloadRunning=true;
  const links=[...document.querySelectorAll('[data-desktop-download]')];
  const originalLabels=links.map(link=>link.innerHTML);
  links.forEach(link=>{link.setAttribute('aria-disabled','true');link.innerHTML='Đang tải bộ cài…';});
  try{
    const manifestResponse=await fetch('./downloads/TKB-auto-Setup.manifest.json',{cache:'no-store'});
    if(!manifestResponse.ok) throw new Error('Không đọc được danh sách tệp bộ cài.');
    const manifest=await manifestResponse.json();
    if(!manifest||!Array.isArray(manifest.parts)||!manifest.parts.length) throw new Error('Danh sách tệp bộ cài không hợp lệ.');
    const chunks=[]; let received=0;
    for(let index=0;index<manifest.parts.length;index++){
      links.forEach(link=>{link.innerHTML=`Đang tải ${index+1}/${manifest.parts.length}…`;});
      const response=await fetch(`./downloads/${manifest.parts[index].file}`,{cache:'no-store'});
      if(!response.ok) throw new Error(`Thiếu phần ${index+1} của bộ cài.`);
      const chunk=await response.arrayBuffer();
      if(chunk.byteLength!==manifest.parts[index].bytes) throw new Error(`Phần ${index+1} tải chưa đủ.`);
      chunks.push(chunk); received+=chunk.byteLength;
    }
    if(received!==manifest.bytes) throw new Error('Bộ cài tải chưa đủ dung lượng.');
    const blob=new Blob(chunks,{type:'application/vnd.microsoft.portable-executable'});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');
    anchor.href=url; anchor.download=manifest.fileName||'TKB-auto-Setup.exe';
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(error){
    console.error(error);
    alert('Không tải được trọn bộ cài TKB auto. Vui lòng kiểm tra mạng rồi thử lại.\n\n'+(error&&error.message?error.message:String(error)));
  }finally{
    installerDownloadRunning=false;
    links.forEach((link,index)=>{link.removeAttribute('aria-disabled');link.innerHTML=originalLabels[index];});
  }
}
document.querySelectorAll('[data-desktop-download]').forEach(link=>link.addEventListener('click',downloadDesktopInstaller));
