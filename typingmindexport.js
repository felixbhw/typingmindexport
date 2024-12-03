// ==UserScript==
// @name         TypingMind Export Plugin
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Adds export functionality to TypingMind
// @author       You
// @match        https://*.typingmind.com/*
// @match        http://localhost:3000/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // First inject JSZip
    const jszipScript = document.createElement('script');
    jszipScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    document.head.appendChild(jszipScript);

    // Wait for JSZip to load then inject the export plugin
    jszipScript.onload = function() {
        const exportPlugin = document.createElement('script');
        exportPlugin.textContent = `
            (async () => {
                // Function to open IndexedDB with the 'keyval-store' database
                function openDB() {
                    return new Promise((resolve, reject) => {
                        const dbName = 'keyval-store';
                        const request = indexedDB.open(dbName);

                        request.onsuccess = () => {
                            const db = request.result;
                            resolve(db);
                        };
                        request.onerror = () => {
                            reject(request.error);
                        };
                    });
                }

                // Function to get all chats from the 'keyval' object store
                function getChats(db) {
                    return new Promise((resolve, reject) => {
                        const objectStoreName = 'keyval';
                        const transaction = db.transaction([objectStoreName], 'readonly');
                        const store = transaction.objectStore(objectStoreName);
                        const chats = [];

                        const request = store.openCursor();
                        request.onsuccess = (event) => {
                            const cursor = event.target.result;
                            if (cursor) {
                                const key = cursor.key;
                                const value = cursor.value;

                                if (key.startsWith('CHAT_')) {
                                    chats.push(value);
                                }

                                cursor.continue();
                            } else {
                                resolve(chats);
                            }
                        };
                        request.onerror = () => {
                            reject(request.error);
                        };
                    });
                }

                // Function to export chats
                async function exportChats(allChats = true) {
                    try {
                        const db = await openDB();
                        const chats = await getChats(db);
                        
                        const zip = new JSZip();
                        const currentChat = window.location.pathname.split('/').pop();
                        
                        chats.forEach(chat => {
                            if (allChats || chat.id === currentChat) {
                                const fileName = \`chat_\${chat.id}.json\`;
                                zip.file(fileName, JSON.stringify(chat, null, 2));
                            }
                        });

                        const content = await zip.generateAsync({type: 'blob'});
                        const url = window.URL.createObjectURL(content);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = allChats ? 'all_chats.zip' : \`chat_\${currentChat}.zip\`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                    } catch (error) {
                        console.error('Error exporting chats:', error);
                        alert('Error exporting chats. Check console for details.');
                    }
                }

                // Create and add the export buttons to the sidebar
                function addExportButtons() {
                    const sidebar = document.querySelector('nav');
                    if (!sidebar) return;

                    const buttonContainer = document.createElement('div');
                    buttonContainer.style.padding = '8px';
                    buttonContainer.style.display = 'flex';
                    buttonContainer.style.gap = '8px';

                    const exportAllButton = document.createElement('button');
                    exportAllButton.textContent = 'Export All';
                    exportAllButton.onclick = () => exportChats(true);
                    exportAllButton.className = 'btn btn-neutral';

                    const exportCurrentButton = document.createElement('button');
                    exportCurrentButton.textContent = 'Export Current';
                    exportCurrentButton.onclick = () => exportChats(false);
                    exportCurrentButton.className = 'btn btn-neutral';

                    buttonContainer.appendChild(exportAllButton);
                    buttonContainer.appendChild(exportCurrentButton);
                    sidebar.appendChild(buttonContainer);
                }

                // Add buttons when the sidebar is available
                const checkForSidebar = setInterval(() => {
                    const sidebar = document.querySelector('nav');
                    if (sidebar) {
                        clearInterval(checkForSidebar);
                        addExportButtons();
                    }
                }, 1000);
            })();
        `;
        document.head.appendChild(exportPlugin);
    };
})();