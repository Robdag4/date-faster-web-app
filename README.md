# Date Faster Web App

A premium dating app built with Next.js and Supabase that connects users through real experiences including speed dating events, singles mixers, and curated date packages.

## Tech Stack

- **Frontend**: Next.js 14+ with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with phone/SMS verification
- **Styling**: Tailwind CSS
- **Payments**: Stripe
- **Hosting**: Vercel (auto-deploy from main branch)
- **Real-time**: Supabase Realtime for chat

## Key Features

1. **Phone Authentication** - SMS-based verification (replaces Twilio)
2. **User Onboarding** - Profile setup with photos, preferences
3. **Discovery & Matching** - Swipe-based discovery with mutual matching
4. **Date Packages** - Propose venue+package to matches, accept/decline
5. **Payments** - Stripe integration for date packages
6. **Real-time Chat** - Supabase Realtime for messaging
7. **Speed Dating Events** - Admin CRUD, host view with timer/pairings/icebreakers
8. **Singles Mixers** - Two Truths and a Lie game with voting and stars
9. **QR Redemption** - Venue PIN-based redemption system
10. **Admin Dashboard** - User management, events, analytics
11. **Premium Features** - Subscription management
12. **Settings & Privacy** - Block/report, preferences, account management

## Setup

1. **Clone and install dependencies:**
   ```bash
   git clone git@github.com:Robdag4/date-faster-web-app.git
   cd date-faster-web-app
   npm install
   ```

2. **Set up Supabase:**
   - Create a new Supabase project
   - Run the SQL schema in `supabase-schema.sql` via the Supabase SQL editor
   - Enable Phone Auth in Authentication settings
   - Create storage bucket named `photos`
   - Set up Row Level Security policies as needed

3. **Environment variables:**
   ```bash
   cp .env.example .env.local
   # Fill in your Supabase and Stripe credentials
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

## Architecture

### App Router Structure
```
src/app/
├── (auth)/              # Auth-protected routes
│   ├── discover/        # Discovery/swiping
│   ├── matches/         # Match management
│   ├── events/          # Speed dating & mixers
│   ├── admin/           # Admin dashboard
│   └── settings/        # User settings
├── api/                 # API routes
├── onboarding/          # Profile setup
└── page.tsx             # Landing/auth page
```

### Key Components
- `AuthProvider` - Manages authentication state
- `AuthFlow` - Phone + SMS verification
- `AppShell` - Main app navigation
- Real-time chat components
- Event management (speed dating/mixers)

## Database Schema

The app uses PostgreSQL with the following main tables:
- `users` - User profiles and settings
- `matches` - User matches from swipes/events
- `swipes` - Like/pass actions
- `date_packages` - Available date experiences
- `date_requests` - Date proposals between matches
- `payments` - Stripe payment records
- `messages` - Real-time chat messages
- `speed_events` - Speed dating and mixer events
- Event-specific tables for check-ins, rounds, pairings, votes
- Mixer-specific tables for statements, guesses, stars

## Development Phases

### Phase 1: ✅ Complete
- Next.js project setup with Supabase
- Database schema implementation  
- Phone authentication flow
- Basic project structure

### Phase 2: ✅ Complete
- Complete onboarding flow (4 steps with validation)
- Discovery/swiping system with animations
- Match detection and celebration
- Matches page with status tracking
- Profile display and navigation
- Mobile-first responsive design
- Core app functionality ready for users

### Phase 3: In Progress
- Speed dating events (admin + host views)
- Singles mixer events (Two Truths & A Lie game)
- Date packages and payment integration
- Real-time chat with Supabase Realtime

### Phase 4: Planned
- Admin dashboard and user management
- Premium subscription features
- Advanced settings and privacy controls
- QR redemption system for venues
- Analytics and reporting

## Theme & Design

- **Colors**: Cream background (#FFF5F5) with rose accent (#EE3550)
- **Mobile-first** responsive design
- **Smooth animations** with Framer Motion
- **Modern UI** with Tailwind CSS
- **Accessibility** considerations

## Deployment

The app auto-deploys to Vercel from the `main` branch:
1. Push changes to `main`
2. Vercel automatically builds and deploys
3. Environment variables configured in Vercel dashboard
4. Custom domain: `app.datefaster.com`

## Contributing

1. Create feature branch from `main`
2. Make changes with proper TypeScript types
3. Test locally with development database
4. Submit PR for review
5. Merge to `main` for auto-deployment