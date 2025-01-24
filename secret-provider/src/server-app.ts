// Import the tools we need
import Koa from 'koa'; // Our web server framework
import bodyParser from 'koa-bodyparser'; // To read JSON from requests
import secretsRouter from './routes/secrets'; // Our routes for handling secrets
import { closeDatabase } from './database/sqlite-service'; // Function to close database

// Step 1: Create a new web server
const app = new Koa();

// Step 2: Set up our server features
// This helps us read JSON data that clients send us
app.use(bodyParser());

// Step 3: Add our routes (endpoints) to handle secrets
// These are the URLs our server will respond to
app.use(secretsRouter.routes());
app.use(secretsRouter.allowedMethods());

// Step 4: Choose which port our server will use
// We can set it with SECRET_PROVIDER_PORT environment variable, or use 4001 by default
const PORT = process.env.SECRET_PROVIDER_PORT || 4001;

// Step 5: Start our server
const server = app.listen(PORT, () => {
  console.log('Secret Provider Server is running!');
  console.log(`Listening on port ${PORT}`);
});

// Step 6: Handle what happens when we need to shut down the server
// This is important to close everything properly
process.on('SIGTERM', () => {
  console.log('Shutdown signal received...');

  // Close the server properly
  server.close(() => {
    console.log('Closing server connections...');

    // Make sure to close the database connection
    closeDatabase();

    console.log('Server shutdown complete!');
  });
});

// We export the app so we can test it
export default app;
