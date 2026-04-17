import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-analytics.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBUqe-XAbE1XkUh0i511LJ82emllR1AAFQ",
  authDomain: "tellmescret.firebaseapp.com",
  projectId: "tellmescret",
  storageBucket: "tellmescret.firebasestorage.app",
  messagingSenderId: "373304860236",
  appId: "1:373304860236:web:f70646ad6e4c0f68361ee9",
  measurementId: "G-V1V7P6L0RT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const secretsCollection = collection(db, "secrets");

// Pre-populated secrets to establish the mood (Base Data)
const dummySecrets = [
    // English
    { text: "The night you left, I sat on the floor until the sun came up. You told me you'd be back. Fifty-two months ago.", category: "To you", adult: false },
    { text: "I lied about why I quit my job. I didn't find a better opportunity. The truth is, I just couldn't handle the emptiness inside anymore.", category: "To everyone", adult: false },
    { text: "I wear the perfume you hated just to remind myself that we were never meant to be. But I still miss you.", category: "To someone", adult: false },
    { text: "Sometimes I type out long messages to you, agonizing over every word, only to delete them entirely. I am too afraid to disturb the silence.", category: "To you", adult: false },
    
    // Korean
    { text: "네가 쓰던 향수와 같은 향을 맡을 때면 하루종일 아무것도 할 수가 없어. 아직도 내 시간은 그때에 멈춰있나 봐.", category: "To you", adult: false },
    { text: "아직도 내 넷플릭스 프로필 네 이름 옆에 있어. 지울 수가 없어서 그냥 놔뒀어. 가끔 네가 로그인했나 확인해.", category: "To someone", adult: false },
    { text: "부모님껜 승진했다고 거짓말했어. 사실 어제 해고당했는데, 다 큰 자식이 우는 모습은 도저히 보여드릴 용기가 안 나.", category: "To everyone", adult: false },
    { text: "미안해. 그때 내가 널 잡지 않은 건, 네가 더 행복해지길 바라서가 아니라 오직 내 이기심 때문이었어.", category: "To you", adult: false },

    // Japanese
    { text: "携帯の番号、わざと消さずにいるの。もう二度とかけてこないって分かってるのに。", category: "To someone", adult: false },
    { text: "誰にも言えない秘密がある。本当は、すべてを捨てて遠くへ逃げ出したいってこと。毎朝、ホームから線路を見つめてしまう。", category: "To everyone", adult: false },
    { text: "あなたの匂いと似た人とすれ違うたび、心臓が止まりそうになる。振り返って違う人だと気づく時の絶望感。", category: "To you", adult: false },
    { text: "「大丈夫」って言うのは、これ以上誰かを信じて傷つきたくないからついた、ただの嘘だよ。", category: "To everyone", adult: false },

    // Spanish
    { text: "Todavía guardo la carta que me diste. A veces la leo en silencio para recordar qué se siente ser amado.", category: "To you", adult: false },
    { text: "Sonrío todo el día con mis amigos, pero en la noche, el silencio y la soledad me consumen por completo.", category: "To everyone", adult: false },
    { text: "Ayer te vi en la estación. Te veías tan feliz con ella que me dolió respirar, así que me di la vuelta antes de que me vieras.", category: "To someone", adult: false },
    { text: "Nadie sabe que lloro en mi auto antes de entrar a mi propia casa. Aparento que mi vida es perfecta, pero estoy roto por dentro.", category: "To everyone", adult: false },
    
    // Adult Only (19+) Themes
    { text: "We spent the whole night tangled in those cheap motel sheets, promising to leave our spouses. We both knew in the morning it was a lie.", category: "To someone", adult: true },
    { text: "술 취해서 네 방 문을 두드렸던 그날 밤, 넘지 말아야 할 선을 넘은 걸 후회하진 않아. 다만 아침에 짓던 네 차가운 표정만은 지우고 싶어.", category: "To you", adult: true },
    { text: "あなたの奥さんが隣で寝ているのに、ベッドの下で息を殺して朝を待っていた。優しくされるほど、自分が汚れていく気がするの。", category: "To everyone", adult: true },
    { text: "Te besé desesperadamente en la oscuridad, sabiendo que al encenderse las luces volverías a ser solo un extraño con anillo de casado.", category: "To someone", adult: true }
];

let basePostsRegistered = 24700; // Base thematic counter
let totalDisplayedCounter = basePostsRegistered;
let allSecrets = [...dummySecrets];
let currentDisplayed = [];

// DOM references
const secretsContainer = document.getElementById('secrets-container');
const secretCounter = document.getElementById('secret-counter');
const moreBtn = document.getElementById('more-btn');
const adModal = document.getElementById('ad-modal');
const closeModal = document.getElementById('close-modal');
const secretInput = document.getElementById('secret-input');
const categorySelect = document.getElementById('category-select');
const adultOnlyCheckbox = document.getElementById('adult-only');
const submitBtn = document.getElementById('submit-btn');
const filterAdultView = document.getElementById('filter-adult-view');

function init() {
    updateCounter();
    renderSecrets(); // Render immediately using local secrets
    setupFirebaseListener(); // Sync with real-time DB
}

function setupFirebaseListener() {
    // Query recently added secrets
    const q = query(secretsCollection, orderBy("createdAt", "desc"), limit(150));
    
    // Real-time listener
    onSnapshot(q, (snapshot) => {
        const fetchedSecrets = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            fetchedSecrets.push({
                text: data.text,
                category: data.category,
                adult: data.adult || false
            });
        });

        // Combine DB secrets and dummy secrets to guarantee a good pool
        allSecrets = [...fetchedSecrets, ...dummySecrets];
        
        // Exact real-time counter! Base + number of actual secrets in DB
        totalDisplayedCounter = basePostsRegistered + snapshot.size;
        updateCounter();

        // Initial render if empty
        if (currentDisplayed.length === 0) {
            renderSecrets();
        }
    });
}

function updateCounter() {
    secretCounter.textContent = totalDisplayedCounter.toLocaleString();
}

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function renderSecrets() {
    secretsContainer.innerHTML = '';
    
    // Filter target secrets based on the Adult Only toggle
    let targetSecrets = filterAdultView.checked ? 
                        allSecrets.filter(s => s.adult === true) : 
                        allSecrets;

    if (targetSecrets.length === 0) {
        currentDisplayed = [];
        secretsContainer.innerHTML = `
            <div class="secret-card glass" style="justify-content: center; align-items: center; text-align: center; max-height: 200px; margin: auto;">
                <i class="fas fa-ghost" style="font-size: 2.5rem; color: var(--text-dim); margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="color: var(--text-dim); font-style: italic;">No adult secrets discovered yet...</p>
            </div>
        `;
        return;
    }

    // Pick 3 random secrets that are completely new from target pool
    let available = targetSecrets.filter(s => {
        return !currentDisplayed.some(cd => cd.text === s.text);
    });
    
    if (available.length < 3) {
        available = [...targetSecrets];
    }
    
    const shuffled = shuffle(available);
    currentDisplayed = shuffled.slice(0, 3);
    
    currentDisplayed.forEach(secret => {
        const cardNode = document.createElement('div');
        cardNode.className = 'secret-card glass';
        
        let label = secret.category;
        if (secret.adult) {
            label += " (Adult only)";
        }
        
        let visualLength = 0;
        for (let i = 0; i < secret.text.length; i++) {
            visualLength += secret.text.charCodeAt(i) > 255 ? 2.2 : 1;
        }

        const linesCount = secret.text.split('\n').length;
        const needsMore = linesCount > 2 || visualLength > 70;
        
        const safeText = secret.text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');

        cardNode.innerHTML = `
            <div class="category-tag">${label}</div>
            <div class="secret-text">${safeText}</div>
            ${needsMore ? '<button class="btn-more">more...</button>' : ''}
        `;
        
        secretsContainer.appendChild(cardNode);
    });

    const expandBtns = document.querySelectorAll('.btn-more');
    expandBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const textEl = this.previousElementSibling;
            if (textEl.classList.contains('expanded')) {
                textEl.classList.remove('expanded');
                this.textContent = 'more...';
            } else {
                textEl.classList.add('expanded');
                this.textContent = 'less';
            }
        });
    });
}

// Modal
moreBtn.addEventListener('click', () => {
    adModal.classList.remove('hidden');
});

closeModal.addEventListener('click', () => {
    adModal.classList.add('hidden');
    secretsContainer.style.opacity = '0';
    setTimeout(() => {
        renderSecrets();
        secretsContainer.style.opacity = '1';
        secretsContainer.style.transition = 'opacity 0.4s ease';
    }, 400);
});

// Max 5 lines
secretInput.addEventListener('input', function() {
    const lines = this.value.split('\n');
    if (lines.length > 5) {
        this.value = lines.slice(0, 5).join('\n');
    }
});

// Submit to Database
submitBtn.addEventListener('click', async () => {
    const text = secretInput.value.trim();
    if (!text) return;
    
    const lines = text.split('\n');
    if (lines.length > 5) {
        alert("Please limit your secret to 5 lines maximum.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Whispering...';

    const newSecret = {
        text: text,
        category: categorySelect.value,
        adult: adultOnlyCheckbox.checked,
        createdAt: serverTimestamp()
    };
    
    try {
        await addDoc(secretsCollection, newSecret);
        
        // Reset input form
        secretInput.value = '';
        adultOnlyCheckbox.checked = false;
        categorySelect.value = 'To someone';
        
        // Show new secrets view visually
        secretsContainer.style.opacity = '0';
        setTimeout(() => {
            // Because onSnapshot is real-time, the data is already updated in allSecrets!
            renderSecrets();
            secretsContainer.style.opacity = '1';
        }, 400);
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Sorry, your secret couldn't be whispered... Try later.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Leave Secret';
    }
});

// Toggle adult view filter
filterAdultView.addEventListener('change', () => {
    secretsContainer.style.opacity = '0';
    setTimeout(() => {
        renderSecrets();
        secretsContainer.style.opacity = '1';
    }, 400);
});

init();
