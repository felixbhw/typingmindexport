(async () => {
  // Function to dynamically load JSZip from /plugin-js-zip.js
  function loadJSZip() {
    return new Promise((resolve, reject) => {
      if (typeof JSZip !== 'undefined') {
        resolve();
        return;
      }
      const existingScript = document.getElementById('jszip-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = '/plugin-js-zip.js';
        script.id = 'jszip-script';
        script.onload = () => {
          resolve();
        };
        script.onerror = () => {
          reject(new Error('Failed to load JSZip library.'));
        };
        document.head.appendChild(script);
      } else {
        resolve();
      }
    });
  }

  // Function to open IndexedDB with the 'keyval-store' database
  function openDB() {
    return new Promise((resolve, reject) => {
      const dbName = 'keyval-store'; // Use 'keyval-store' as the database name
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
      const objectStoreName = 'keyval'; // Use 'keyval' as the object store name

      const transaction = db.transaction([objectStoreName], 'readonly');
      const store = transaction.objectStore(objectStoreName);
      const chats = [];

      // Open a cursor to iterate over all entries
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const key = cursor.key;
          const value = cursor.value;

          // Check if the key corresponds to a chat
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

  // Function to get a single chat by ID from the 'keyval' object store
  function getChatByID(db, chatID) {
    return new Promise((resolve, reject) => {
      const objectStoreName = 'keyval'; // Use 'keyval' as the object store name

      const transaction = db.transaction([objectStoreName], 'readonly');
      const store = transaction.objectStore(objectStoreName);

      const key = `CHAT_${chatID}`;
      const request = store.get(key);

      request.onsuccess = () => {
        const chat = request.result;
        if (chat) {
          resolve(chat);
        } else {
          reject(new Error('Chat not found.'));
        }
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Function to download the ZIP file
  function downloadZip(zip) {
    zip.generateAsync({ type: 'blob' }).then((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Get the current date in local timezone
      const now = new Date();
      const date = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');

      // Get the host name and sanitize it
      const host = window.location.host.replace(/[^a-zA-Z0-9\-_.]/g, '_');

      link.download = `${host}_chats_${date}.zip`;
      document.body.appendChild(link); // Append to body
      link.click();
      document.body.removeChild(link); // Remove from body
      URL.revokeObjectURL(url);
    });
  }

  // Function to download a single markdown file
  function downloadMarkdown(markdownContent, filename) {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    link.download = filename;
    document.body.appendChild(link); // Append to body
    link.click();
    document.body.removeChild(link); // Remove from body
    URL.revokeObjectURL(url);
  }

  // Function to generate markdown content from a chat object
  function chatToMarkdown(chat) {
    // Load folders from localStorage
    const folderListJSON = localStorage.getItem('TM_useFolderList');
    const folders = folderListJSON ? JSON.parse(folderListJSON) : [];
    const folderMap = {}; // Map folderID to folder title
    for (const folder of folders) {
      folderMap[folder.id] = folder.title;
    }

    // Load tags from localStorage
    const tagsJSON = localStorage.getItem('TM_useChatUniqeTags');
    const allTags = tagsJSON ? JSON.parse(tagsJSON) : [];
    const tagMap = {};
    for (const tag of allTags) {
      tagMap[tag.id] = tag.name;
    }

    // Adjust the properties based on your chat data structure
    let chatTitle = chat.chatTitle || chat.title || 'Untitled Chat';
    let messages = chat.messages || chat.conversation || [];
    let createdAt = chat.createdAt || new Date();

    // Ensure createdAt is a Date object
    if (!(createdAt instanceof Date)) {
      createdAt = new Date(createdAt);
    }
    // Get the date in local timezone in YYYY-MM-DD format
    let createdDate = createdAt.getFullYear() + '-' +
      String(createdAt.getMonth() + 1).padStart(2, '0') + '-' +
      String(createdAt.getDate()).padStart(2, '0');

    // Sanitize the chat title to prevent issues with filenames
    let sanitizedTitle = chatTitle.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();

    // Remove quotes and asterisks at the start of the title
    sanitizedTitle = sanitizedTitle.replace(/^[\'\"*]+/, '').trim();

    // Replace remaining invalid characters with underscores
    sanitizedTitle = sanitizedTitle.replace(/[^a-zA-Z0-9\s\-_.()]/g, '');

    // Replace spaces with underscores
    sanitizedTitle = sanitizedTitle.replace(/\s+/g, '_');

    let filename = `${createdDate}-${sanitizedTitle}.md`;

    // Prepare the YAML front matter
    let markdownContent = '---\n';

    markdownContent += `chatID: ${JSON.stringify(chat.chatID || chat.id || '')}\n`;
    markdownContent += `chatTitle: ${JSON.stringify(chat.chatTitle || chat.title || 'Untitled Chat')}\n`;
    markdownContent += `model: ${JSON.stringify(chat.model || '')}\n`;
    markdownContent += `createdAt: ${JSON.stringify(chat.createdAt || '')}\n`;
    markdownContent += `updatedAt: ${JSON.stringify(chat.updatedAt || '')}\n`;

    // Include chatParams (excluding systemMessage)
    let chatParams = { ...(chat.chatParams || {}) };
    const systemMessage = chatParams.systemMessage || '';
    delete chatParams.systemMessage;

    if (Object.keys(chatParams).length > 0) {
      markdownContent += `chatParams:\n`;
      for (const [key, value] of Object.entries(chatParams)) {
        // Indent with two spaces for YAML nested mapping
        markdownContent += `  ${key}: ${JSON.stringify(value)}\n`;
      }
    }

    // Include tokenUsage if available
    if (chat.tokenUsage) {
      markdownContent += `tokenUsage:\n`;
      for (const [key, value] of Object.entries(chat.tokenUsage)) {
        // Indent with two spaces
        markdownContent += `  ${key}: ${JSON.stringify(value)}\n`;
      }
    }

    // Get tags associated with the chat
    let tagNames = [];
    if (Array.isArray(chat.tags)) {
      if (chat.tags.length > 0 && typeof chat.tags[0] === 'object') {
        // 'tags' is an array of tag objects
        tagNames = chat.tags.map(tag => tag.name).filter(Boolean);
      } else {
        // 'tags' is an array of tag IDs
        tagNames = chat.tags.map(tagId => tagMap[tagId]).filter(Boolean);
      }
    }

    // Include tags in the front matter
    if (tagNames.length > 0) {
      markdownContent += `tags:\n`;
      for (const tagName of tagNames) {
        markdownContent += `  - ${JSON.stringify(tagName)}\n`;
      }
    }

    markdownContent += '---\n\n'; // Close YAML front matter

    // Add the title
    markdownContent += `# ${chat.chatTitle || chat.title || 'Untitled Chat'}\n\n`;

    // Define a unique message delimiter
    const messageDelimiter = `\n\n=~=~=\n\n`;

    // Insert the system message as the first message
    let messagesWithSystem = [...messages];
    if (systemMessage) {
      messagesWithSystem.unshift({ role: 'system', content: systemMessage });
    }

    for (const message of messagesWithSystem) {
      if (message.type === 'clear-context') {
        continue;
      }
      const role = message.role.charAt(0).toUpperCase() + message.role.slice(1);

      let contentString = '';

      if (typeof message.content === 'string') {
        // If content is a string, use it as is
        contentString = message.content;
      } else if (Array.isArray(message.content)) {
        // If content is an array, process each block
        for (const block of message.content) {
          if (block.type === 'text') {
            // Include the text content
            contentString += `${block.text}\n\n`;
          } else {
            // Include all object key-value pairs by stringifying the block
            contentString += `${JSON.stringify(block, null, 2)}\n\n`;
          }
        }
      } else if (typeof message.content === 'object' && message.content !== null) {
        // For object content that's not an array, stringify the entire object
        contentString = `${JSON.stringify(message.content, null, 2)}\n\n`;
      } else {
        // For other content types (e.g., null, undefined), convert to string
        contentString = String(message.content);
      }

      markdownContent += `**${role}:**\n\n${contentString}${messageDelimiter}`;
    }

    // Determine folder path based on folderID
    let folderID = chat.folderID || chat.folderId || null;
    let folderName = null;

    if (folderID && folderMap[folderID]) {
      folderName = folderMap[folderID];
      // Sanitize the folder name
      folderName = folderName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
      folderName = folderName.replace(/^[\'\"*]+/, '').trim();
      folderName = folderName.replace(/[^a-zA-Z0-9\s\-_.()]/g, '');
      folderName = folderName.replace(/\s+/g, '_');
    }

    return { markdownContent, filename, folderName };
  }

  // Expose the helper function on window.tmHelpers
  window.tmHelpers = {
    ...(window.tmHelpers || {}),
    chatToMarkdown,
  };

  // Main function to export chats into a ZIP file
  async function exportChatsToZip() {
    try {
      // Load JSZip library
      await loadJSZip();

      const db = await openDB();
      const chats = await getChats(db);

      if (chats.length === 0) {
        alert('No chats found to export.');
        return;
      }

      const zip = new JSZip();

      for (const chat of chats) {
        const { markdownContent, filename, folderName } = chatToMarkdown(chat);

        // Add file to zip, placing it into the appropriate folder if needed
        if (folderName) {
          zip.folder(folderName).file(filename, markdownContent);
        } else {
          zip.file(filename, markdownContent);
        }
      }

      downloadZip(zip);
    } catch (error) {
      console.error('Error exporting chats:', error);
      alert('An error occurred while exporting chats.');
    }
  }

  // Function to export the current chat as a markdown file
  async function exportCurrentChat() {
    try {
      const chatIDFromURL = window.location.hash.match(/#chat=([^&]+)/);
      if (!chatIDFromURL || !chatIDFromURL[1]) {
        alert('No chat selected.');
        return;
      }
      const chatID = chatIDFromURL[1];

      const db = await openDB();
      const chat = await getChatByID(db, chatID);

      const { markdownContent, filename } = chatToMarkdown(chat);

      downloadMarkdown(markdownContent, filename);
    } catch (error) {
      console.error('Error exporting current chat:', error);
      alert('An error occurred while exporting the current chat.');
    }
  }

  // Function to add the Export buttons into the sidebar
  function addExportButton() {
    const checkExist = setInterval(() => {
      // Find the Settings button
      const settingsButton = document.querySelector('button[data-element-id="workspace-tab-settings"]');

      if (settingsButton && settingsButton.parentElement) {
        clearInterval(checkExist);

        // Create the Export All button
        const exportAllButton = document.createElement('button');
        exportAllButton.setAttribute('data-element-id', 'workspace-tab-export-chats');
        exportAllButton.className = settingsButton.className;
        exportAllButton.style.cursor = 'pointer';

        // Create the icon span
        const iconSpan = document.createElement('span');
        const iconSpanInSettings = settingsButton.querySelector('span:first-of-type');
        if (iconSpanInSettings) {
          iconSpan.className = iconSpanInSettings.className;
        } else {
          iconSpan.className = 'block w-[35px] h-[35px] flex items-center justify-center';
        }

        // Inline SVG for symmetrical export icon
        iconSpan.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L12 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5 9L12 2L19 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="3" y="16" width="18" height="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;

        // Create the label span
        const labelSpan = document.createElement('span');
        const labelSpanInSettings = settingsButton.querySelector('span:nth-of-type(2)');
        if (labelSpanInSettings) {
          labelSpan.className = labelSpanInSettings.className;
        } else {
          labelSpan.className = 'text-[11px]';
        }
        labelSpan.textContent = 'Export All';

        // Assemble the button
        exportAllButton.appendChild(iconSpan.cloneNode(true));
        exportAllButton.appendChild(labelSpan);

        // Attach the click event
        exportAllButton.onclick = exportChatsToZip;

        // Create the Export Current button
        const exportCurrentButton = document.createElement('button');
        exportCurrentButton.setAttribute('data-element-id', 'workspace-tab-export-current-chat');
        exportCurrentButton.className = settingsButton.className;
        exportCurrentButton.style.cursor = 'pointer';

        // Clone the icon span
        const iconSpanCurrent = iconSpan.cloneNode(true);

        // Create the label span for current chat
        const labelSpanCurrent = labelSpan.cloneNode(true);
        labelSpanCurrent.textContent = 'Export Current';

        // Assemble the export current button
        exportCurrentButton.appendChild(iconSpanCurrent);
        exportCurrentButton.appendChild(labelSpanCurrent);

        // Attach the click event
        exportCurrentButton.onclick = exportCurrentChat;

        // Insert the buttons after the Settings button
        settingsButton.parentElement.insertBefore(exportAllButton, settingsButton.nextSibling);
        settingsButton.parentElement.insertBefore(exportCurrentButton, exportAllButton.nextSibling);
      }
    }, 500);
  }

  // Start the process
  addExportButton();
})();
