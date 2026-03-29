import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
import { placesRouter } from './routes/places.routes';
import { friendsRouter } from './routes/friends.routes';
import { searchRouter } from './routes/search.routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app: Application = express();
const PORT = Number(process.env.PORT) || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Syrena Travel API is running' });
});

// Email verification success page
app.get('/verified', (req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verified - Syrena</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1E3A5F 0%, #457B9D 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: #FAFAF8;
            border-radius: 24px;
            padding: 48px 40px;
            text-align: center;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #2A9D8F 0%, #3DAFA1 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }
        .icon svg { width: 40px; height: 40px; fill: white; }
        .logo { font-size: 28px; font-weight: 600; color: #1E3A5F; margin-bottom: 8px; letter-spacing: 2px; }
        h1 { font-size: 24px; color: #1E3A5F; margin-bottom: 12px; font-weight: 600; }
        p { color: #6B7280; font-size: 16px; line-height: 1.6; margin-bottom: 32px; }
        .button {
            display: inline-block;
            background: #1E3A5F;
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
        }
        .footer { margin-top: 32px; color: #9CA3AF; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">
            <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
        </div>
        <div class="logo">SYRENA</div>
        <h1>Email Verified!</h1>
        <p>Your email has been successfully verified. You can now open the Syrena app and sign in to start exploring.</p>
        <a href="syrena://verified" class="button">Open Syrena App</a>
        <div class="footer">
            <p>If the button doesn't work, simply open the app and sign in.</p>
        </div>
    </div>
</body>
</html>`);
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/places', placesRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/search', searchRouter);
app.use('/api/place-details', searchRouter); // Alias for place details

// Error handling middleware
app.use(errorHandler);

// Start server - bind to 0.0.0.0 to allow connections from other devices
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Syrena Travel API Server is running on http://0.0.0.0:${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
});