import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
function backendApiPlugin() {
  const setupApiRoutes = (server: any) => {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      // 1. Send Order Notifications
      if (req.url?.startsWith('/api/send-order-notifications') && req.method === 'POST') {
        try {
          let body = '';
          for await (const chunk of req) {
            body += chunk;
          }
          const payload = body ? JSON.parse(body) : {};
          const { handleOrderNotificationRequest } = await import('./api/send-order-notifications');
          const result = await handleOrderNotificationRequest(payload);
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message || 'Notification dispatch error' }));
        }
        return;
      }

      // 2. Admin Staff Registration (Server-side with service-role privileges)
      if (
        (req.url?.startsWith('/api/admin/register-staff') || req.url?.startsWith('/api/register-staff')) &&
        req.method === 'POST'
      ) {
        try {
          let body = '';
          for await (const chunk of req) {
            body += chunk;
          }
          const payload = body ? JSON.parse(body) : {};
          const authHeader = req.headers?.['authorization'] || req.headers?.['Authorization'] || '';
          const { handleRegisterStaffRequest } = await import('./api/register-staff');
          const result = await handleRegisterStaffRequest(payload, authHeader);
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = result.status;
          res.end(JSON.stringify(result.body));
        } catch (err: any) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: err.message || 'Staff registration server error' }));
        }
        return;
      }

      next();
    });
  };

  return {
    name: 'brybos-backend-api',
    configureServer(server: any) {
      setupApiRoutes(server);
    },
    configurePreviewServer(server: any) {
      setupApiRoutes(server);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), backendApiPlugin()],
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
