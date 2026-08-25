const YTU_KEYWORDS = ["ytü", "ytu", "yıldız teknik", "yildiz teknik", "yildiz technical", "kondüktör mekteb", "kondüktör"];

const badHandles = new Set(JSON.parse(localStorage.getItem('ytu_bad_handles') || '[]'));

// CSS Kıyamet Motorunu Kuruyoruz
const styleNode = document.createElement('style');
styleNode.id = 'ytu-annihilator';
document.documentElement.appendChild(styleNode);

// Bu fonksiyon çalıştığı an, tarayıcı o kişileri fiziksel olarak ekranda barındıramaz
function triggerDoomsday() {
    let css = `article[data-ytu-nuke="true"] { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; } \n`;

    if (badHandles.size > 0) {
        // Yasaklı kişinin profiline giden linki barındıran HER ŞEYİ yok et
        const selectors = Array.from(badHandles).map(h => 
            `article:has(a[href="/${h}" i]), article:has(a[href^="/${h}/" i])`
        );
        css += selectors.join(',\n') + ` { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; }`;
    }
    styleNode.textContent = css;
}

// Başlangıçta motoru ateşle
triggerDoomsday();

function markBad(handle) {
    if (!handle) return;
    const h = handle.replace('@', '').toLowerCase();
    if (!badHandles.has(h)) {
        badHandles.add(h);
        localStorage.setItem('ytu_bad_handles', JSON.stringify([...badHandles]));
        triggerDoomsday(); // Yeni biri fişlendiğinde CSS'i anında güncelle
        console.log("☢️ KIYAMET: Sicili bozuk kişi buharlaştırıldı ->", h);
    }
}

function isYtu(text) {
    if (!text) return false;
    const lower = text.toLocaleLowerCase('tr-TR');
    return YTU_KEYWORDS.some(k => lower.includes(k));
}

// 1. Ağ Trafiği İstihbaratı
const seenObjs = new WeakSet();
function scanData(obj) {
    if (!obj || typeof obj !== 'object' || seenObjs.has(obj)) return;
    seenObjs.add(obj);

    if (obj.screen_name && obj.description) {
        if (isYtu(obj.description)) markBad(obj.screen_name);
    } else if (obj.legacy && obj.legacy.screen_name && obj.legacy.description) {
        if (isYtu(obj.legacy.description)) markBad(obj.legacy.screen_name);
    }

    if (Array.isArray(obj)) {
        obj.forEach(scanData);
    } else {
        Object.values(obj).forEach(scanData);
    }
}

const origFetch = window.fetch;
window.fetch = async (...args) => {
    const res = await origFetch(...args);
    res.clone().json().then(scanData).catch(()=>{});
    return res;
};

const origParse = JSON.parse;
JSON.parse = function(t, r) {
    const res = origParse(t, r);
    if (typeof t === 'string' && (t.includes('description') || t.includes('ytü') || t.includes('ytu'))) scanData(res);
    return res;
};

// 2. DOM Yedeği (İçinde direkt YTÜ geçen masum görünümlü tweetler veya Hover Cardlar için)
function forceRecheck() {
    document.querySelectorAll('article[data-testid="tweet"]:not([data-ytu-nuke="true"])').forEach(article => {
        if (isYtu(article.innerText)) {
            article.setAttribute('data-ytu-nuke', 'true');
        }
    });

    document.querySelectorAll('[data-testid="UserDescription"]:not([data-scanned="true"])').forEach(bio => {
        bio.setAttribute('data-scanned', 'true');
        if (isYtu(bio.innerText)) {
            let p = bio.parentElement;
            for(let i=0; i<15; i++) {
                if(!p) break;
                const match = (p.innerText||"").match(/@([a-zA-Z0-9_]+)/);
                if (match) {
                    markBad(match[1]);
                    break;
                }
                p = p.parentElement;
            }
        }
    });
}

const observer = new MutationObserver(() => requestAnimationFrame(forceRecheck));

function init() {
    if (document.body) {
        if (window.__INITIAL_STATE__) scanData(window.__INITIAL_STATE__);
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        forceRecheck();
    } else {
        requestAnimationFrame(init);
    }
}
init();