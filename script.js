import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-analytics.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, limit, getDocs, deleteDoc, doc, increment
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

let basePostsRegistered = 2400; // Base thematic counter
let totalDisplayedCounter = "...";
let allSecrets = [...dummySecrets];
let currentDisplayed = [];
let availableUnlocks = 0;

// DOM references
const secretsContainer = document.getElementById('secrets-container');
const secretCounter = document.getElementById('secret-counter');
const moreBtn = document.getElementById('more-btn');
const adModal = document.getElementById('ad-modal');
const closeModal = document.getElementById('close-modal');
const secretInput = document.getElementById('secret-input');
const recipientSelect = document.getElementById('recipient-select');
const categorySelect = document.getElementById('category-select');
const adultOnlyCheckbox = document.getElementById('adult-only');
const submitBtn = document.getElementById('submit-btn');
const filterAdultView = document.getElementById('filter-adult-view');

// Admin DOM
const adminDashboard = document.getElementById('admin-dashboard');
const exitAdminBtn = document.getElementById('exit-admin-btn');
const adminLoading = document.getElementById('admin-loading');
const adminContent = document.getElementById('admin-content');
const adminTotalPosts = document.getElementById('admin-total-posts');
const statPersonal = document.getElementById('stat-personal');
const statSociety = document.getElementById('stat-society');
const statCompany = document.getElementById('stat-company');
const adminDailyChart = document.getElementById('admin-daily-chart');
const moderationList = document.getElementById('moderation-list');

let currentLang = 'en';
const langEnBtn = document.getElementById('lang-en');
const langKoBtn = document.getElementById('lang-ko');

const placeholderPrompts = {
    en: [
        "What was the hardest part of your day?",
        "What made your heart flutter today?",
        "Leave behind the memories you want to forget today.",
        "Share a secret only you know.",
        "Leave a confession for him (her)."
    ],
    ko: [
        "오늘 당신을 가장 힘들게 만든건 무엇인가요?",
        "오늘은 어떤 설레임이었나요?",
        "당신의 잊고 싶은 기억을 오늘 털어버리세요",
        "당신만 알고 있는 소식을 알려주세요",
        "그(그녀)에게 고백의 글을 남겨봐요"
    ]
};

function updateLanguageUI() {
    // Dropdowns
    if (currentLang === 'ko') {
        recipientSelect.options[0].text = "누군가에게";
        recipientSelect.options[1].text = "당신에게";
        categorySelect.options[0].text = "개인";
        categorySelect.options[1].text = "사회";
        categorySelect.options[2].text = "회사";
    } else {
        recipientSelect.options[0].text = "To someone";
        recipientSelect.options[1].text = "To you";
        categorySelect.options[0].text = "Personal";
        categorySelect.options[1].text = "Society";
        categorySelect.options[2].text = "Company";
    }
    
    // Placeholder
    const prompts = placeholderPrompts[currentLang];
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    if (currentLang === 'ko') {
        secretInput.placeholder = `조용히 당신의 비밀을 적어주세요...\n${randomPrompt}`;
    } else {
        secretInput.placeholder = `Quietly write your secret here...\n${randomPrompt}`;
    }
}

if (langEnBtn && langKoBtn) {
    langEnBtn.addEventListener('click', () => {
        currentLang = 'en';
        document.body.setAttribute('data-lang', 'en');
        langEnBtn.classList.add('active');
        langKoBtn.classList.remove('active');
        updateLanguageUI();
    });
    
    langKoBtn.addEventListener('click', () => {
        currentLang = 'ko';
        document.body.setAttribute('data-lang', 'ko');
        langKoBtn.classList.add('active');
        langEnBtn.classList.remove('active');
        updateLanguageUI();
    });
}

function init() {
    updateCounter();
    updateLanguageUI();
    
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
            
            // Legacy likes migration
            let reactMap = data.reactions || {};
            if (data.likes !== undefined && !reactMap.heart) {
                reactMap.heart = data.likes;
            }
            
            fetchedSecrets.push({
                id: doc.id,
                text: data.text,
                category: data.category,
                recipient: data.recipient,
                adult: data.adult || false,
                reactions: {
                    heart: reactMap.heart || 0,
                    todac: reactMap.todac || 0,
                    hug: reactMap.hug || 0,
                    sad: reactMap.sad || 0,
                    angry: reactMap.angry || 0
                },
                isFirebase: true
            });
        });

        // Initialize dummy properties safely once
        dummySecrets.forEach((sec, idx) => {
            if (!sec.id) {
                sec.id = 'dummy_' + idx;
                sec.reactions = {
                    heart: Math.floor(Math.random() * 20),
                    hug: Math.floor(Math.random() * 10),
                    sad: Math.floor(Math.random() * 5)
                };
                sec.isFirebase = false;
            }
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
    if (typeof totalDisplayedCounter === 'number') {
        secretCounter.textContent = totalDisplayedCounter.toLocaleString();
    } else {
        secretCounter.textContent = totalDisplayedCounter;
    }
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
                        allSecrets.filter(s => s.adult !== true);

    if (targetSecrets.length === 0) {
        currentDisplayed = [];
        secretsContainer.innerHTML = `
            <div class="secret-card glass" style="justify-content: center; align-items: center; text-align: center; max-height: 200px; margin: auto;">
                <i class="fas fa-ghost" style="font-size: 2.5rem; color: var(--text-dim); margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="color: var(--text-dim); font-style: italic;">
                    <span class="en-only">No adult secrets discovered yet...</span>
                    <span class="ko-only">등록된 성인 비밀이 없습니다...</span>
                </p>
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
        
        let repEn = secret.recipient || "";
        let catEn = secret.category || "";
        let repKo = repEn === "To someone" ? "누군가에게" : (repEn === "To you" ? "당신에게" : repEn);
        let catKo = catEn === "Personal" ? "개인" : (catEn === "Society" ? "사회" : (catEn === "Company" ? "회사" : catEn));
        
        let labelEn = repEn ? `${repEn} • ${catEn}` : catEn;
        let labelKo = repKo ? `${repKo} • ${catKo}` : catKo;
        
        if (secret.adult) {
            labelEn += " (Adult only)";
            labelKo += " (성인 게시물)";
        }
        
        const labelSafe = `<span class="en-only">${labelEn}</span><span class="ko-only">${labelKo}</span>`;
        
        let visualLength = 0;
        for (let i = 0; i < secret.text.length; i++) {
            visualLength += secret.text.charCodeAt(i) > 255 ? 2.2 : 1;
        }

        const linesCount = secret.text.split('\n').length;
        const needsMore = linesCount > 2 || visualLength > 70;
        
        const safeText = secret.text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');

        // Reaction State Setup
        const effectiveId = secret.id || ('temp_' + Math.random().toString(36).substr(2, 9));
        const currentVote = localStorage.getItem('react_' + effectiveId) || (localStorage.getItem('liked_' + effectiveId) ? 'heart' : null);
        
        const reactConfig = [
            { key: 'heart', icon: 'fa-heart', c: 'r-heart' },
            { key: 'hug', icon: 'fa-hands', c: 'r-hug' },
            { key: 'sad', icon: 'fa-sad-tear', c: 'r-sad' }
        ];

        let reactionsHTML = '<div class="reaction-bar">';
        reactConfig.forEach(r => {
            const count = (secret.reactions && secret.reactions[r.key]) ? secret.reactions[r.key] : 0;
            const isActive = (currentVote === r.key);
            const activeClass = isActive ? 'active' : '';
            const displayCount = count > 0 ? count : '';
            
            reactionsHTML += `
                <button class="react-btn ${activeClass} ${r.c}" data-id="${effectiveId}" data-key="${r.key}" data-isfirebase="${secret.isFirebase}">
                    <i class="fas ${r.icon}"></i> 
                    <span class="react-count">${displayCount}</span>
                </button>
            `;
        });
        reactionsHTML += '</div>';

        cardNode.innerHTML = `
            <div class="category-tag">${labelSafe}</div>
            <div class="secret-text">${safeText}</div>
            <div class="card-footer">
                ${reactionsHTML}
                ${needsMore ? '<button class="btn-more"><span class="en-only">more...</span><span class="ko-only">더보기...</span></button>' : '<div></div>'}
            </div>
        `;
        
        secretsContainer.appendChild(cardNode);
    });

    const expandBtns = document.querySelectorAll('.btn-more');
    expandBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const textEl = this.closest('.secret-card').querySelector('.secret-text');
            if (textEl.classList.contains('expanded')) {
                textEl.classList.remove('expanded');
                this.innerHTML = '<span class="en-only">more...</span><span class="ko-only">더보기...</span>';
            } else {
                textEl.classList.add('expanded');
                this.innerHTML = '<span class="en-only">less</span><span class="ko-only">접기</span>';
            }
        });
    });

    const reactBtns = document.querySelectorAll('.react-btn');
    reactBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            const key = this.getAttribute('data-key');
            const isFb = this.getAttribute('data-isfirebase') === 'true';
            
            // One Reaction Per Post Logic
            const legacyLiked = localStorage.getItem('liked_' + id);
            const existingVote = localStorage.getItem('react_' + id);
            
            if (legacyLiked || existingVote) {
                // To keep it simple, we don't allow swapping yet, just notify them.
                if (existingVote !== key) {
                    alert("하나의 글에는 하나의 감정만 남길 수 있습니다.\n(You can only leave one emotion per secret.)");
                }
                return;
            }
            
            // Optimistic Local Save
            localStorage.setItem('react_' + id, key);
            
            // Visual Update
            this.classList.add('active');
            const countSpan = this.querySelector('.react-count');
            const currentNum = parseInt(countSpan.textContent) || 0;
            countSpan.textContent = currentNum + 1;
            
            // Firebase Update
            if (isFb) {
                try {
                    await updateDoc(doc(db, "secrets", id), {
                        [`reactions.${key}`]: increment(1)
                    });
                } catch(e) {
                    console.error("Reaction sync failed:", e);
                }
            } else {
                // Update Local Dummy Array
                const target = dummySecrets.find(s => s.id === id);
                if(target) {
                    if(!target.reactions) target.reactions = {};
                    target.reactions[key] = (target.reactions[key] || 0) + 1;
                }
            }
        });
    });
}

// Modal
let adLoaded = false;
moreBtn.addEventListener('click', () => {
    if (availableUnlocks <= 0) return;
    
    // Consume a ticket
    availableUnlocks--;
    if (availableUnlocks === 0) {
        moreBtn.classList.add('disabled');
    }
    
    adModal.classList.remove('hidden');
    if (!adLoaded) {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            adLoaded = true;
        } catch (e) {
            console.error("AdSense Error: ", e);
        }
    }
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
    
    // Admin interception
    if (text === "170924 관리자") {
        secretInput.value = '';
        openAdminDashboard();
        return;
    }

    // Hidden trigger to explicitly show the adult only toggle
    if (text.toLowerCase() === "show adult only") {
        secretInput.value = '';
        document.querySelector('.filter-adult-control').style.display = 'flex';
        return;
    }
    
    if (!text) return;
    
    const adultKeywords = [
        '섹스', '야동', '자위', '조건만남', '음란', '성관계', '오르가즘', '페티쉬', '모텔', 
        '신음', '정액', '삽입', '보지', '고추', '자지', '성기', '클리토리스', '지스팟', '처녀막',
        'sex', 'porn', 'nude', 'fuck'
    ];
    const isAdultContent = adultKeywords.some(keyword => text.toLowerCase().includes(keyword));
    
    if (isAdultContent && !adultOnlyCheckbox.checked) {
        alert("성적인 표현이나 관련 단어가 포함된 글은 'Adult only'를 체크해야 등록할 수 있습니다.\n(Posts containing adult keywords must have 'Adult only' checked.)");
        return;
    }

    // Violent Crime Filter
    const violentKeywords = ['살인', '강간', '살해', '성폭행', '토막', '암살', '납치', '시체', 'rape', 'murder'];
    const isViolentContent = violentKeywords.some(keyword => text.toLowerCase().includes(keyword));
    
    if (isViolentContent) {
        alert("살인, 성범죄 등 극단적인 범죄와 관련된 이야기는 플랫폼 정책상 절대 등록할 수 없습니다.\n(Stories related to extreme crimes cannot be shared.)");
        return;
    }

    // Spam Filter
    const spamKeywords = ['바카라', '카지노', '토토', '사다리', '대출', '도박', '스포츠토토', 'http://', 'https://', 'www.'];
    const isSpamContent = spamKeywords.some(keyword => text.toLowerCase().includes(keyword));
    
    if (isSpamContent) {
        alert("스팸, 광고성 내용 또는 링크가 포함된 글은 등록할 수 없습니다.\n(Spam, ads, or links are not allowed.)");
        return;
    }

    // Duplicate Check
    const lastPosted = localStorage.getItem('lastPostedSecret');
    if (lastPosted && lastPosted.toLowerCase() === text.toLowerCase()) {
        alert("방금 작성하신 글과 동일한 내용을 반복해서 올릴 수 없습니다.\n(You cannot post the exact same secret repeatedly.)");
        return;
    }
    
    const isGlobalDuplicate = allSecrets.some(secret => secret.text.toLowerCase() === text.toLowerCase());
    if (isGlobalDuplicate) {
        alert("이미 누군가가 작성했거나 방금 등록된 동일한 내용의 비밀입니다.\n(This secret has already been shared recently.)");
        return;
    }

    const lines = text.split('\n');
    if (lines.length > 5) {
        alert("Please limit your secret to 5 lines maximum.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = currentLang === 'ko' ? '<span class="ko-only">속삭이는 중...</span>' : '<span class="en-only">Whispering...</span>';

    const newSecret = {
        text: text,
        recipient: recipientSelect.value,
        category: categorySelect.value,
        adult: adultOnlyCheckbox.checked,
        createdAt: serverTimestamp()
    };
    
    try {
        await addDoc(secretsCollection, newSecret);
        
        // Grant unlock for writing a secret
        availableUnlocks++;
        moreBtn.classList.remove('disabled');
        
        // Save to local storage to prevent immediate duplicate
        localStorage.setItem('lastPostedSecret', text);
        
        // Reset input form
        secretInput.value = '';
        adultOnlyCheckbox.checked = false;
        recipientSelect.value = 'To someone';
        categorySelect.value = 'Personal';
        
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
        submitBtn.innerHTML = '<span class="en-only">Leave Secret</span><span class="ko-only">비밀 남기기</span>';
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

// --- Admin Logic ---
async function openAdminDashboard() {
    adminDashboard.classList.remove('hidden');
    adminLoading.classList.remove('hidden');
    adminContent.classList.add('hidden');
    
    // Set up dummy states
    let total = dummySecrets.length;
    let counts = {
        Personal: 0,
        Society: 0,
        Company: 0
    };
    
    const dateCounts = {};
    const DUMMY_DATE = '2026-04-18';
    dateCounts[DUMMY_DATE] = total; 

    // Categorize dummy secrets safely
    dummySecrets.forEach(s => {
        let cat = s.category;
        if (!['Personal', 'Society', 'Company'].includes(cat)) {
            cat = 'Personal';
        }
        counts[cat] = (counts[cat] || 0) + 1;
    });

    try {
        moderationList.innerHTML = '';
        const snap = await getDocs(secretsCollection);
        
        let fetchedDocs = []; // Array to sort documents newly

        snap.forEach(documentSnap => {
            const data = documentSnap.data();
            total++;
            
            // Category aggregation
            let cat = data.category;
            if (!['Personal', 'Society', 'Company'].includes(cat)) {
                cat = 'Personal'; // fallback for legacy items
            }
            counts[cat] = (counts[cat] || 0) + 1;
            
            // Date aggregation
            let dateStrMeta = DUMMY_DATE;
            let dateObjForSort = new Date('2026-04-18T00:00:00Z');
            
            if (data.createdAt) {
                const dateObj = data.createdAt.toDate();
                dateObjForSort = dateObj;
                const yyyy = dateObj.getFullYear();
                const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                const dd = String(dateObj.getDate()).padStart(2, '0');
                dateStrMeta = `${yyyy}-${mm}-${dd}`;
                dateCounts[dateStrMeta] = (dateCounts[dateStrMeta] || 0) + 1;
            } else {
                dateCounts[DUMMY_DATE] = (dateCounts[DUMMY_DATE] || 0) + 1;
            }
            
            // Push for sorting and rendering
            fetchedDocs.push({
                id: documentSnap.id,
                data: data,
                dateObj: dateObjForSort,
                dateStr: dateStrMeta
            });
        });
        
        // Sort newest first
        fetchedDocs.sort((a, b) => b.dateObj - a.dateObj);
        
        fetchedDocs.forEach(item => {
            const modItem = document.createElement('div');
            modItem.className = 'mod-item';
            if (item.data.adult) modItem.setAttribute('data-adult', 'true');
            
            const isAdultFlag = item.data.adult ? `<span style="color:#ff6b6b; font-weight:bold;">[19+] </span>` : '';
            const safeText = (item.data.text || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            modItem.innerHTML = `
                <div class="mod-meta">
                    <span>${item.data.category || 'Personal'}</span>
                    <span>${item.dateStr}</span>
                </div>
                <div class="mod-text">${isAdultFlag}${safeText}</div>
                <div class="mod-action">
                    <button class="btn-delete" data-id="${item.id}">Delete</button>
                </div>
            `;
            moderationList.appendChild(modItem);
        });
        
        // Bind Delete Events
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idToDelete = e.target.getAttribute('data-id');
                if (confirm("경고: 악성, 명예훼손, 도배 등의 사유로 이 글을 영구 삭제하시겠습니까?\n(Are you sure you want to delete this?)")) {
                    try {
                        await deleteDoc(doc(db, "secrets", idToDelete));
                        // Remove from DOM immediately
                        e.target.closest('.mod-item').remove();
                        // Update basic counter roughly
                        adminTotalPosts.textContent = (parseInt(adminTotalPosts.textContent.replace(/,/g, '')) - 1).toLocaleString();
                    } catch (err) {
                        alert("Deletion failed: " + err.message);
                    }
                }
            });
        });
        
        // Render UI values
        adminTotalPosts.textContent = total.toLocaleString();
        statPersonal.textContent = counts.Personal.toLocaleString();
        statSociety.textContent = counts.Society.toLocaleString();
        statCompany.textContent = counts.Company.toLocaleString();
        
        // Render Chart
        adminDailyChart.innerHTML = '';
        const dates = Object.keys(dateCounts).sort();
        
        let maxCount = 0;
        dates.forEach(d => { if(dateCounts[d] > maxCount) maxCount = dateCounts[d]; });
        if (maxCount === 0) maxCount = 1;
        
        dates.forEach(d => {
            const val = dateCounts[d];
            const heightPerc = Math.max((val / maxCount) * 100, 5); // Minimum 5% visible height
            
            const group = document.createElement('div');
            group.className = 'chart-bar-group';
            
            const labelStr = d.substring(5); // Format: MM-DD
            
            group.innerHTML = `
                <div class="chart-bar" style="height: ${heightPerc}%">
                    <span class="bar-value">${val}</span>
                </div>
                <div class="chart-label">${labelStr}</div>
            `;
            adminDailyChart.appendChild(group);
        });
        
        adminLoading.classList.add('hidden');
        adminContent.classList.remove('hidden');
        
    } catch (e) {
        console.error("Admin fetch error", e);
        adminLoading.innerHTML = `<span style="color:red">Failed to load data: ${e.message}</span>`;
    }
}

exitAdminBtn.addEventListener('click', () => {
    adminDashboard.classList.add('hidden');
});

init();
