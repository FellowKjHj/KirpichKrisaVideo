const firebaseConfig = {
  apiKey: "AIzaSyAq5HPQR_2BbxxrNgUy0Qr3Psnek6TQSQM",
  authDomain: "kirpichkrisavideo.firebaseapp.com",
  projectId: "kirpichkrisavideo",
  storageBucket: "kirpichkrisavideo.firebasestorage.app",
  messagingSenderId: "504270225710",
  appId: "1:504270225710:web:a45767b93a1fc4db537abf"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

// Чуть надёжнее для встроенных мобильных браузеров и нестабильных сетей.
try {
  db.settings({ experimentalAutoDetectLongPolling: true });
} catch (e) {
  console.warn("Firestore settings:", e);
}

const VIDEO_ENABLED = true;
const VIDEO_FILE = "profile-video.mp4";

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

function pluralVotes(n) {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return `${n} голос`;
  if (a >= 2 && a <= 4 && !(b >= 12 && b <= 14)) return `${n} голоса`;
  return `${n} голосов`;
}

function renderChips(el, rows, key) {
  if (!rows.length) {
    el.classList.add("muted");
    el.textContent = "Пока нет данных";
    return;
  }

  const counts = {};
  rows.forEach((r) => {
    const value = r[key];
    if (value !== undefined && value !== null) {
      counts[value] = (counts[value] || 0) + 1;
    }
  });

  const total = rows.length;
  el.classList.remove("muted");
  el.innerHTML = Object.entries(counts)
    .map(([name, count]) => `<span class="chip">${name}: ${Math.round(count / total * 100)}%</span>`)
    .join("");
}

async function loadStats() {
  try {
    const snapshot = await db.collection("votes").get();
    const rows = snapshot.docs.map((doc) => doc.data());

    notice.hidden = true;

    const total = rows.length;
    const yes = rows.filter((r) => r.liked === true).length;
    const no = total - yes;
    const yp = total ? Math.round((yes / total) * 100) : 0;
    const np = total ? 100 - yp : 0;

    document.getElementById("totalVotes").textContent = pluralVotes(total);
    document.getElementById("yesPercent").textContent = `${yp}%`;
    document.getElementById("noPercent").textContent = `${np}%`;
    document.getElementById("yesBar").style.width = `${yp}%`;
    document.getElementById("noBar").style.width = `${np}%`;

    renderChips(document.getElementById("ageStats"), rows, "age");
    renderChips(document.getElementById("genderStats"), rows, "gender");
  } catch (error) {
    notice.hidden = false;
    notice.textContent = "Не удалось загрузить статистику.";
    console.error("Firestore stats error:", error);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  note.textContent = "";

  if (localStorage.getItem("poll_voted_v1")) {
    note.textContent = "С этого браузера голос уже отправляли 💗";
    return;
  }

  const fd = new FormData(form);
  const age = fd.get("age");
  const gender = fd.get("gender");
  const likedRaw = fd.get("liked");

  if (likedRaw === null || !age || !gender) {
    note.textContent = "Выбери ответ, возраст и пол.";
    return;
  }

  const payload = {
    liked: likedRaw === "true",
    age,
    gender,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  submitButton.disabled = true;
  submitButton.textContent = "Отправляем…";

  try {
    await db.collection("votes").add(payload);

    localStorage.setItem("poll_voted_v1", "1");
    note.textContent = "Спасибо 💗";
    form.reset();

    await loadStats();
    setTimeout(() => dialog.close(), 700);
  } catch (error) {
    const parts = [
      error.code,
      error.message
    ].filter(Boolean);

    note.textContent = "Ошибка Firebase: " + parts.join(" | ");
    console.error("Firestore insert error:", error);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Отправить 💌";
  }
});

loadStats();
