# Prompt Bank

A Chrome extension that allows you to save and quickly insert prompts on ChatGPT's website.

## Features

- Save frequently used prompts with custom names
- Insert prompts directly into ChatGPT's input field with one click
- View and manage your saved prompts
- Convenient sidebar on ChatGPT's website for quick access
- Compatible with both chat.openai.com and chatgpt.com domains
- Compatible with the latest ChatGPT interface (using contenteditable div)

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the folder containing this extension
5. The extension icon should appear in your Chrome toolbar

## Usage

### Saving Prompts

1. Click on the Prompt Bank extension icon in your toolbar
2. Enter a name for your prompt in the "Prompt Name" field
3. Enter or paste your prompt text in the text area
4. Click "Save Prompt"

### Inserting Prompts

**Method 1: From the extension popup**
1. Click on the Prompt Bank extension icon in your toolbar
2. Click on the "Withdraw" tab
3. Click on any saved prompt to insert it into ChatGPT's input field

**Method 2: From the sidebar**
1. When visiting ChatGPT, a sidebar will appear on the right side of the page
2. Click on any prompt in the sidebar to insert it directly into the input field
3. On mobile or smaller screens, click the "PB" button in the bottom right to show the sidebar

### Deleting Prompts

1. Click on the Prompt Bank extension icon in your toolbar
2. Click on the "Withdraw" tab
3. Click the "Delete" button next to the prompt you want to remove

## Troubleshooting

If you encounter any issues with the extension, try these solutions:

1. **Error: Receiving end does not exist**
   - Make sure you're on the ChatGPT website (https://chat.openai.com/ or https://chatgpt.com/)
   - Reload the ChatGPT page to ensure the content script is properly loaded
   - Check that the extension has the necessary permissions

2. **Prompts not appearing in sidebar**
   - Reload the ChatGPT page
   - Check if you have any saved prompts by clicking on the extension icon

3. **Cannot insert prompts**
   - ChatGPT regularly updates its interface. This extension has been updated to work with the contenteditable div interface (current as of 2023).
   - Try using the Debug tab for detailed diagnostics
   - Try reloading the page
   - If problems persist, check the browser console for errors or check for extension updates

4. **Extension not working at all**
   - Disable and re-enable the extension in Chrome's extension settings
   - Try reinstalling the extension
   
5. **Input text not being inserted correctly**
   - The extension now supports both old (textarea) and new (contenteditable div and ProseMirror) ChatGPT interfaces
   - If text is not inserting, it might be due to a ChatGPT interface change
   - Try clicking in the input area first, then click the prompt you want to insert
   - Use the Debug tab to check for connectivity issues

## Debugging

If you're experiencing issues, the extension includes a Debug tab with tools to help diagnose problems:

1. **Test Insert**: Tests the ability to insert a test message into the ChatGPT input field
2. **Reload ChatGPT**: Reloads the current ChatGPT page
3. **Check Connection**: Checks if the extension can communicate with the ChatGPT page

## Customization

You can modify the styles in `styles.css` to change the appearance of the sidebar.

## Notes

- The icons in the `icons` folder need to be replaced with real icons before publishing.
- This extension is designed specifically for ChatGPT's web interface and may need updates if ChatGPT changes its DOM structure.

## License

MIT 