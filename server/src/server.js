import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Nexora Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(`🔗 API Base: http://localhost:${env.PORT}/api`);
    });

    // Graceful shutdown
    const handleShutdown = (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
