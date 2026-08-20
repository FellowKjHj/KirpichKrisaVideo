const SUPABASE_URL = "https://wwvtvmiewhtlzfdkuikcn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_RQ8N8MoKX_nq1WY1Hu5WCA_Ki9UX13_";

const VIDEO_ENABLED = true;
const VIDEO_FILE = "profile-video.mp4";

const configured = !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");
const db = configured ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const dialog = document.getElementById("pollDialog");
const form = document.getElementById("pollForm");
const note = document.getElementById("formNote");
const notice = document.getElementById("backendNotice");
const submitButton = form.querySelector('button[type="submit"]');

document.getElementById("openPoll").onclick = () => {
  note.textContent = "";
  dialog.showModal();
};
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
  if(!rows.length){
    el.classList.add("muted");
    el.textContent="Пока нет данных";
    return;
  }
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
    notice.hidden = false;
    notice.textContent = "Статистика появится после подключения базы.";
    return;
  }

  const { data, error } = await db.from("votes").select("liked,age_bucket,gender");

  if(error){
    notice.hidden = false;
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
  note.textContent = "";

  if(!configured){
    note.textContent = "База пока не подключена.";
    return;
  }

  if(localStorage.getItem("poll_voted_v1")){
    note.textContent = "С этого браузера голос уже отправляли 💗";
    return;
  }

  const fd = new FormData(form);
  const age = fd.get("age");
  const gender = fd.get("gender");
  const likedRaw = fd.get("liked");

  if(likedRaw === null || !age || !gender){
    note.textContent = "Выбери ответ, возраст и пол.";
    return;
  }

  const payload = {
    liked: likedRaw === "true",
    age_bucket: age,
    gender
  };

  submitButton.disabled = true;
  submitButton.textContent = "Отправляем…";

  const { error } = await db.from("votes").insert(payload);

  submitButton.disabled = false;
  submitButton.textContent = "Отправить 💌";

  if(error){
    note.textContent = "Что-то пошло не так. Попробуй ещё раз.";
    console.error(error);
    return;
  }

  localStorage.setItem("poll_voted_v1","1");
  note.textContent = "Спасибо 💗";
  form.reset();
  await loadStats();
  setTimeout(() => dialog.close(), 700);
});

loadStats();
