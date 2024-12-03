# TypingMind Extension - Export Chats

Exports chat history from the typingmind application.

# Host as Extension

You can host this code as an extension, and configure your typingmind instance to load it on each page load. If you do this, I recommend storing plugin-js-zip.js and the plugin-export-chats.js in separate files. The code will attempt to load plugin-js-zip.js from the same typingmind instance if jszip can't be found on the page.

# One-Time Use

If you don't have your own instance, or dont want to host this code yourself, you can run it a single time.

To do so:

1. Open your browser's console on the typing mind page. (cmd+shift+i on mac).
2. Copy all of the code in plugin-js-zip.js and paste it into your typingmind instance's console, press enter
3. Copy all of the code in export-chats.js and paste it into your typingmind instance's console, press enter
4. Close the console

# Using the Plugin

1. If the plugin is configured properly, two buttons will appear in the sidebar:
  1. export all
  2. export current
2. Click either button to initiate a download

**Fun fact:** The AI designed the export SVG icon that gets inserted into the typingmind app's sidebar.