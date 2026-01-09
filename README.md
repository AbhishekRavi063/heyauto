# HeyAuto - Kerala Auto Drivers App

A Next.js application connecting auto drivers with passengers in Kerala.

## Features

- **For Users (No Registration Required)**:
  - Browse active auto drivers by location
  - View driver details (photo, name, phone, auto number)
  - Click-to-call functionality

- **For Drivers**:
  - Register with complete profile (photo, license, vehicle details)
  - Login/Logout
  - Toggle active/inactive status
  - Set active location (state and sub-location)
  - Protected dashboard

## Tech Stack

- **Frontend**: Next.js 14+ (App Router) with JavaScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL) - Free Tier
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (Free Tier - 1GB)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

**Detailed setup guide**: See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

Quick steps:
1. Create a new project at https://supabase.com (free tier)
2. Run the SQL from `supabase/schema.sql` in the SQL Editor
3. Create storage buckets:
   - `driver-photos` (public bucket)
   - `license-images` (private bucket)
4. Copy your project URL and API keys

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
heyauto/
├── app/
│   ├── page.js                    # Home page
│   ├── layout.js                  # Root layout
│   ├── driver/
│   │   ├── auth/
│   │   │   └── page.js            # Driver login/register
│   │   └── dashboard/
│   │       └── page.js            # Driver dashboard
│   └── api/                       # API routes
├── components/                     # React components
├── lib/
│   └── supabase/                  # Supabase client configs
├── supabase/
│   └── schema.sql                 # Database schema
└── middleware.js                   # Next.js middleware
```

## Supabase Free Tier Features Used

All features are within Supabase free tier limits:
- ✅ PostgreSQL Database (500MB)
- ✅ Authentication (unlimited users)
- ✅ Storage (1GB) - for driver photos and license images
- ✅ Realtime subscriptions (200 concurrent connections)
- ✅ API access (unlimited requests)

## Usage

1. **Home Page**: Users can select location and view active drivers
2. **Register**: Drivers click "Register your auto" to create account
3. **Login**: Drivers can login to access dashboard
4. **Dashboard**: Drivers can toggle active/inactive and set location

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## License

MIT
