// Plesk Phusion Passenger CommonJS entry point for ESM/TypeScript server.ts
import('./server.ts').catch((err) => {
  console.error('Failed to start server.ts:', err);
  process.exit(1);
});
