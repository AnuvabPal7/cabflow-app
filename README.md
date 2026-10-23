# CabFlow: Cab Booking (Spring Boot + React)

```
backend/    Spring Boot 3.5 API: JWT auth, rides, matching, WebSocket, Stripe (mock mode), PDF receipts, admin
frontend/   React + Vite + Tailwind UI (the Gemini UI), now wired to the backend
```

## Run it (3 steps)

**1. Database.** Either local Postgres or your Neon project:
```bash
cd backend && docker compose up -d db          # local PostgreSQL on :5432
```
or set these environment variables for the backend (Neon, JDBC format!):
```
DB_URL=jdbc:postgresql://<neon-host>/neondb?sslmode=require
DB_USER=<neon user>
DB_PASSWORD=<neon password>
```

**2. Backend** (JDK 17+, Maven or IntelliJ):
```bash
cd backend && mvn spring-boot:run              # http://localhost:8080/actuator/health
```
Run `mvn verify` first to run the tests. Seeded admin for local dev: `admin@cab.local` / `Admin@12345`.

**3. Frontend** (Node 18+):
```bash
cd frontend && cp .env.example .env && npm install && npm run dev      # http://localhost:3000
```

## Try the whole flow (use 2 or 3 browser windows; use a private window for the second user)
1. **Window A:** create an account as **driver** (vehicle model + number). Click **GO ONLINE** (the location is a simulated GPS dropdown).
2. **Window B:** create an account as **rider**. Pick a cab tier (prices come from the server) and **Book**. Note the 4-digit OTP.
3. **Window A:** the request appears under *Ride Requests Nearby*. **Accept**, then **Arrived**, then enter the rider's OTP to **Start**, then **Complete**.
   While the trip is running the rider sees the cab move live (WebSocket).
4. **Window B:** pay (mock mode, no real charge), rate the driver, open the invoice.
5. Log in as **admin** to see stats, drivers, support tickets (SOS creates one) and promo codes.

Pickup points in the UI are Bangalore landmarks, and the rider and driver must be within 5 km of each other
for a request to reach the driver. Both default to Indiranagar, so this works out of the box.

## Honest status
- **Nothing here has been run end to end.** The backend could not be compiled where it was written (no Maven access);
  the frontend passes `tsc` and `vite build`. Expect a few small fixes on the first run. Send the first error to get help.
- The frontend and backend field names were cross-checked automatically, but not exercised together.
- Not implemented: Google OAuth, refresh tokens, chat and calling between rider and driver, driver payouts,
  real road routing (distance is straight-line x 1.3), real Stripe card entry (Stripe.js), Redis/Kafka.
- The Gemini "Java code explorer" and "resume bullets" screens were removed because they showed code that
  was not the real backend. Write your resume from what this project actually contains (see backend/README.md section 8).
