const SUPABASE_URL = "PASTE_SUPABASE_URL";
const SUPABASE_ANON_KEY = "PASTE_SUPABASE_ANON_KEY";

const VIDEO_ENABLED = false;
const VIDEO_FILE = "profile-video.mp4";

const configured = !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");
const db = configured ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const dialog = document.getElementById("pollDialog");
const form = document.getElementById("pollForm");
const note = document.getElementById("formNote");
const notice = document.getElementById("backendNotice");

document.getElementById("openPoll").onclick = () => dialog.showModal();
document.getElementById("closePoll").onclick = () => dialog.close();

if (VIDEO_ENABLED) {
  const video = document.getElementById("profileVideo");
  video.src = VIDEO_FILE;
  video.hidden = false;
  document.getElementById("videoPlaceholder").hidden = true;
}

function pluralVotes(n){
  const a=n%10,b=n%100;
  if(a===1 && b!==11) return `${n} голос`;
  if(a>=2 && a<=4 && !(b>=12&&b<=14)) return `${n} голоса`;
  return `${n} голосов`;
}

function renderChips(el, rows, key){
  if(!rows.length){ el.textContent="Пока нет данных"; return; }
  const counts = {};
  rows.forEach(r => counts[r[key]] = (counts[r[key]] || 0) + 1);
  const total = rows.length;
  el.classList.remove("muted");
  el.innerHTML = Object.entries(counts)
    .map(([name,count]) => `<span class="chip">${name}: ${Math.round(count/total*100)}%</span>`)
    .join("");
}

async function loadStats(){
  if(!configured){
    notice.textContent = "Статистика появится после подключения базы.";
    return;
  }

  const { data, error } = await db.from("votes").select("liked,age_bucket,gender");

  if(error){
    notice.textContent = "Не удалось загрузить статистику.";
    console.error(error);
    return;
  }

  notice.hidden = true;
  const rows = data || [];
  const total = rows.length;
  const yes = rows.filter(r => r.liked === true).length;
  const no = total - yes;
  const yp = total ? Math.round(yes/total*100) : 0;
  const np = total ? 100-yp : 0;

  document.getElementById("totalVotes").textContent = pluralVotes(total);
  document.getElementById("yesPercent").textContent = `${yp}%`;
  document.getElementById("noPercent").textContent = `${np}%`;
  document.getElementById("yesBar").style.width = `${yp}%`;
  document.getElementById("noBar").style.width = `${np}%`;
  renderChips(document.getElementById("ageStats"), rows, "age_bucket");
  renderChips(document.getElementById("genderStats"), rows, "gender");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if(!configured){
    note.textContent = "Сначала нужно подключить базу — я помогу это сделать.";
    return;
  }

  if(localStorage.getItem("poll_voted_v1")){
    note.textContent = "С этого браузера голос уже отправляли 💗";
    return;
  }

  const fd = new FormData(form);
  const payload = {
    liked: fd.get("liked") === "true",
    age_bucket: fd.get("age"),
    gender: fd.get("gender")
  };

  const { error } = await db.from("votes").insert(payload);

  if(error){
    note.textContent = "Что-то пошло не так. Попробуй ещё раз.";
    console.error(error);
    return;
  }

  localStorage.setItem("poll_voted_v1","1");
  note.textContent = "Спасибо 💗";
  await loadStats();
  setTimeout(() => dialog.close(), 650);
});

loadStats();
