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

## Version 2.1.0 Changes

This version (2.1.0) includes the following enhancements compared to version 2.0.1:

1. **Gemini API Key Customization**: Added support for users to input and validate their own Gemini API keys directly from the UI
2. **Key Validation System**: Implemented real-time API key validation functionality to ensure keys are valid before use
3. **Loading State Management**: Added visual feedback during API key validation with loading states
4. **Error Handling Improvements**: Enhanced error messages and user notifications for invalid API keys
5. **GenAI Network Layer Optimization**: Optimized the Google GenAI library network layer with enhanced global proxy methods
6. **Advanced Proxy Configuration**: Implemented undici global dispatcher for improved proxy handling and network request management

## Version 2.0.1 Changes

This version (2.0.1) includes the following enhancements compared to the original version:

1. **Proxy Support**: Added environment-based proxy configuration to handle network access restrictions
2. **Backend Service Enhancement**: Created dedicated backend server with proxy capabilities
3. **Automatic Proxy Detection**: System now automatically detects and uses HTTP_PROXY/HTTPS_PROXY settings from .env file
4. **External API Request Optimization**: All external API requests, especially to Gemini API, are now routed through the proxy when configured
5. **Dual Server Configuration**: Implemented separate frontend and backend services running on different ports (frontend: 5173, backend: 3001)
6. **Simplified Startup**: Added `npm run dev:all` command to start both frontend and backend services simultaneously

## Technical Enhancements

### GenAI Network Layer Optimization

This update includes significant improvements to the Google GenAI library's network layer:

- **Undici Global Dispatcher**: Implemented undici's `setGlobalDispatcher` with `ProxyAgent` for enhanced HTTP request handling
- **Network Request Interception**: Added comprehensive proxy configuration that intercepts all outgoing requests
- **Fallback Mechanisms**: Implemented multiple fallback strategies for different network environments
- **Enhanced Debugging**: Added detailed logging for proxy configuration and network request monitoring

### Proxy Configuration

The system now supports multiple proxy configuration methods:

1. **Environment Variables**: `HTTP_PROXY`, `HTTPS_PROXY`, `http_proxy`, `https_proxy`
2. **Undici Global Agent**: Automatic proxy detection and configuration
3. **Custom Agent Implementation**: Fallback HTTP/HTTPS agents for compatibility
4. **Google-specific Proxy Settings**: Dedicated proxy handling for Google API requests

To configure proxy, add the following to your `.env` file:
```
HTTP_PROXY=http://your-proxy-server:port
HTTPS_PROXY=http://your-proxy-server:port
```

### Backend Architecture Update

**Important**: The original backend implementation in the `backend/` directory has been deprecated in favor of the new consolidated backend server (`start-backend.cjs`).

**Key Changes:**
- **Legacy Backend**: The `backend/` directory contains the original TypeScript-based backend implementation which is no longer maintained
- **New Backend**: All backend functionality has been consolidated into `start-backend.cjs` for improved proxy support and simplified deployment
- **Unified Service**: The new backend provides all API endpoints including Gemini API proxy, key validation, and health checks in a single Node.js file
- **Enhanced Proxy Support**: The consolidated backend offers superior proxy configuration and network request handling

**Migration Note**: If you were using the original backend, please switch to using `start-backend.cjs` which provides the same functionality with enhanced proxy capabilities and better network layer optimization.
