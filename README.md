<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1CsvkMqNnxdUrmJZYeSXNZDf6T1Yq2qQW

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Version 2.0.1 Changes

This version (2.0.1) includes the following enhancements compared to the original version:

1. **Proxy Support**: Added environment-based proxy configuration to handle network access restrictions
2. **Backend Service Enhancement**: Created dedicated backend server with proxy capabilities
3. **Automatic Proxy Detection**: System now automatically detects and uses HTTP_PROXY/HTTPS_PROXY settings from .env file
4. **External API Request Optimization**: All external API requests, especially to Gemini API, are now routed through the proxy when configured
5. **Dual Server Configuration**: Implemented separate frontend and backend services running on different ports (frontend: 5173, backend: 3001)
6. **Simplified Startup**: Added `npm run dev:all` command to start both frontend and backend services simultaneously
