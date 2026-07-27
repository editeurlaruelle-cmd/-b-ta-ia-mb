document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatContainer = document.getElementById('chatContainer');
    const welcomeSection = document.getElementById('welcomeSection');
    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    const closeSidebarBtn = document.getElementById('closeSidebar');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const reportBugBtn = document.getElementById('reportBugBtn');

    // URL de ton serveur Flask / Ngrok
    const API_URL = 'https://unsupercilious-carma-unsymbolized.ngrok-free.dev/';

    // --- 1. Gestion de la zone de texte et du bouton d'envoi ---
    userInput.addEventListener('input', () => {
        if (userInput.value.trim() !== "") {
            sendBtn.removeAttribute('disabled');
        } else {
            sendBtn.setAttribute('disabled', 'true');
        }

        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
    });

    // --- 2. Fonction principale d'envoi de message ---
    async function sendMessage() {
        const text = userInput.value.trim();
        if (text === "") return;

        if (welcomeSection && welcomeSection.style.display !== 'none') {
            welcomeSection.style.display = 'none';
        }

        // Afficher le message de l'utilisateur
        appendMessage(text, 'user');

        userInput.value = "";
        userInput.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');

        // Appeler l'API
        await callVeyrosAPI(text);
    }

    // --- 3. Ajouter un message dans le conteneur de chat ---
    function appendMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);

        if (sender === 'ai') {
            messageDiv.innerHTML = `<b>Veyros AI :</b> <div class="ai-content">${formaterReponse(text)}</div>`;
        } else {
            messageDiv.textContent = text;
        }

        chatContainer.appendChild(messageDiv);
        scrollToBottom();
        return messageDiv.querySelector('.ai-content') || messageDiv;
    }

    // --- 3.1 Formatage de la réponse (Blocs de code, Gras, Listes) ---
    function formaterReponse(texte) {
        // Blocs de code
        let html = texte.replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const escapedCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const codeId = 'code_' + Math.random().toString(36).substr(2, 9);
            return `<div class="code-box-wrapper" style="background:#090d16; border:1px solid #334155; border-radius:6px; margin:10px 0; overflow:hidden;">
                <div class="code-header" style="background:#162032; padding:6px 12px; display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#94a3b8;">
                    <span>${lang ? lang.toUpperCase() : 'CODE'}</span>
                    <button class="copy-btn" onclick="copierCode('${codeId}')" style="background:#334155; color:white; border:none; padding:3px 8px; border-radius:4px; font-size:11px; cursor:pointer;">Copier</button>
                </div>
                <pre><code id="${codeId}" style="font-family:'Courier New',Courier,monospace; display:block; padding:12px; overflow-x:auto; color:#38bdf8; font-size:14px; margin:0;">${escapedCode}</code></pre>
            </div>`;
        });

        // Texte en gras
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Puces et listes
        html = html.replace(/^[•\-]\s+(.*)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul style="margin: 5px 0 5px 20px; padding-left: 0;">$1</ul>');
        html = html.replace(/<\/ul>\s*<ul[^>]*>/g, '');

        // Retours à la ligne
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    // --- 4. Appel de l'API Flask (Support JSON + Streaming) ---
    async function callVeyrosAPI(promptText) {
        const aiContentDiv = appendMessage('...', 'ai');
        let texteComplet = "";

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: promptText })
            });

            const contentType = response.headers.get("content-type");

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Erreur HTTP ${response.status}: ${errText}`);
            }

            // Cas JSON simple
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                aiContentDiv.innerHTML = formaterReponse(data.response || data.error || "Réponse vide");
            } 
            // Cas Streaming NDJSON
            else if (contentType && (contentType.includes("ndjson") || contentType.includes("stream"))) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                
                aiContentDiv.innerHTML = "";

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    const lignes = chunk.split('\n');
                    
                    for (let ligne of lignes) {
                        if (ligne.trim() !== "") {
                            try {
                                const jsonPart = JSON.parse(ligne);
                                if (jsonPart.response) {
                                    texteComplet += jsonPart.response;
                                    aiContentDiv.innerHTML = formaterReponse(texteComplet);
                                    scrollToBottom();
                                }
                            } catch (e) {
                                // Ignore les lignes partielles
                            }
                        }
                    }
                }
            } else {
                const rawText = await response.text();
                aiContentDiv.innerHTML = formaterReponse(rawText);
            }

        } catch (error) {
            aiContentDiv.innerHTML = `⚠️ Erreur de connexion avec l'API : ${error.message}.`;
        }
    }

    // --- 5. Fonction globale pour copier le code ---
    window.copierCode = function(id) {
        const codeEl = document.getElementById(id);
        if (codeEl) {
            navigator.clipboard.writeText(codeEl.innerText).then(() => {
                alert("✅ Code copié dans le presse-papier !");
            });
        }
    };

    // --- 6. Faire défiler le chat vers le bas ---
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // --- 7. Événements clavier et souris ---
    sendBtn.addEventListener('click', sendMessage);

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // --- 8. Gestion du menu tiroir (Slide-over mobile) ---
    function openMenu() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('active');
        }
    }

    function closeMenu() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        }
    }

    if (toggleSidebarBtn) toggleSidebarBtn.addEventListener('click', openMenu);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeMenu);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMenu);

    // --- 9. Bouton Nouvelle discussion ---
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            closeMenu(); // Ferme le menu mobile si ouvert
            const messages = chatContainer.querySelectorAll('.message');
            messages.forEach(msg => msg.remove());
            
            if (welcomeSection) {
                welcomeSection.style.display = 'flex';
            }
            userInput.value = "";
            userInput.style.height = 'auto';
            sendBtn.setAttribute('disabled', 'true');
        });
    }

    // --- 10. Gestion du signalement de bug ---
    if (reportBugBtn) {
        reportBugBtn.addEventListener('click', async () => {
            closeMenu(); // Ferme le menu mobile
            const bugDescription = prompt("Décris le bug rencontré :");
            if (!bugDescription) return;

            if (welcomeSection && welcomeSection.style.display !== 'none') {
                welcomeSection.style.display = 'none';
            }
            appendMessage(`🐞 Signalement de bug : ${bugDescription}`, 'user');

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'bug_report', content: bugDescription })
                });
                
                if (response.ok) {
                    appendMessage("🛠️ **Merci !** Ton rapport de bug a bien été transmis à l'équipe technique.", 'ai');
                } else {
                    appendMessage("⚠️ Erreur lors de l'envoi du rapport.", 'ai');
                }
            } catch (err) {
                appendMessage("⚠️ Impossible de contacter le serveur pour envoyer le bug.", 'ai');
            }
        });
    }
});