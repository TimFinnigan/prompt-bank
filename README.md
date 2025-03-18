# Prompt Bank

A Chrome extension that allows you to save and quickly insert prompts on ChatGPT's website.

## Features

- Save, edit, and manage prompts directly from the sidebar
- Insert prompts directly into ChatGPT's input field with one click
- Convenient collapsible sidebar with persistent state
- Clean UI with intuitive controls (hover actions, collapsible form)
- Compact view option to hide prompt descriptions
- Compatible with both chat.openai.com and chatgpt.com domains
- Compatible with the latest ChatGPT interface (using contenteditable div)
- Improved CSS targeting to avoid conflicts with ChatGPT's own UI

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the folder containing this extension
5. The extension icon should appear in your Chrome toolbar

## Usage

All functionality is integrated directly into the sidebar:

### Extension Icon

- Click the extension icon to open ChatGPT if you're not already on the site
- If you're already on ChatGPT, clicking the icon will toggle the sidebar

### Saving Prompts

1. When visiting ChatGPT, a sidebar will appear on the right side of the page
2. Click "Add New Prompt" to expand the form
3. Enter a name for your prompt in the "Prompt Name" field
4. Enter or paste your prompt text in the text area below
5. Click "Save Prompt"

### Inserting Prompts

1. In the "Saved Prompts" list, click on any prompt to insert it directly into the ChatGPT input field

### Editing Prompts

1. In the sidebar, hover over the prompt you want to edit in the "Saved Prompts" list
2. Click the pencil (✎) icon that appears on hover
3. The prompt details will be loaded into the form at the top of the sidebar
4. Make your changes and click "Update Prompt"
5. To cancel editing, click the "Cancel" button

### Deleting Prompts

1. In the sidebar, hover over the prompt you want to delete in the "Saved Prompts" list
2. Click the × icon that appears on hover
3. Confirm the deletion when prompted

### Compact View

1. In the "Saved Prompts" section, check the "Compact View" checkbox to hide prompt descriptions
2. Uncheck it to show descriptions again
3. The setting is saved and persists between page refreshes

### Sidebar Control

- To collapse the sidebar, click the × button at the bottom right
- To expand a collapsed sidebar, click the "PB" button at the bottom right
- The sidebar's collapsed/expanded state is remembered between page loads

## Troubleshooting

If you encounter any issues with the extension, try these solutions:

1. **Sidebar not appearing**
   - Make sure you're on the ChatGPT website (https://chat.openai.com/ or https://chatgpt.com/)
   - Reload the page to ensure the content script is properly loaded
   - Check that the extension has the necessary permissions

2. **Prompts not appearing in sidebar**
   - Reload the ChatGPT page
   - Check if you have any saved prompts by adding a new prompt

3. **Cannot insert prompts**
   - ChatGPT regularly updates its interface. This extension has been updated to work with the contenteditable div interface.
   - Try reloading the page
   - If problems persist, check the browser console for errors

4. **Extension not working at all**
   - Disable and re-enable the extension in Chrome's extension settings
   - Try reinstalling the extension
   
5. **Input text not being inserted correctly**
   - The extension supports both old (textarea) and new (contenteditable div and ProseMirror) ChatGPT interfaces
   - If text is not inserting, it might be due to a ChatGPT interface change
   - Try clicking in the input area first, then click the prompt you want to insert

## Customization

You can modify the styles in `styles.css` to change the appearance of the sidebar.

## License

MIT 