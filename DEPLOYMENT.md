# Publish a free ResourceFlow demo

This project can run as one Render web service backed by a MongoDB Atlas database. The frontend and API share one public URL, and MongoDB stores the demo data outside Render's temporary filesystem.

## Before deploying

1. Push the audited project changes to the GitHub fork you want Render to build.
2. Create a free MongoDB Atlas cluster and a dedicated database user. Keep the database password private.
3. In Atlas Network Access, allow the outbound IP ranges shown for the Render service. The ranges are in the service's **Connect → Outbound** panel. Avoid opening database access to every IP address.

## Deploy

1. In Render, create a **Blueprint** and connect the GitHub repository that contains `render.yaml`.
2. When prompted, enter:
   - `MONGODB_URI`: the Atlas application connection string, with the database name `resourceflow`.
   - `SEED_ADMIN_PASSWORD`: a unique password with at least 16 characters. The admin and manager sample accounts use this password.
3. Render builds the frontend, starts the API, and seeds the sample catalog only when the database is empty. The seed operation leaves any existing data untouched.
4. If the first deployment cannot connect to Atlas, add the Render outbound IP ranges to Atlas, then redeploy.
5. When the health check passes, open the `onrender.com` address shown on the Render service. Share that address with your teacher and classmates.

## Demo sign-in

Visitors can register their own student accounts. The seeded student demo is also available:

- Email: `alex.johnson@student.edu`
- Password: `Student123!`

The admin and manager accounts use the private `SEED_ADMIN_PASSWORD` entered in Render. The site does not show staff quick-fill buttons in production. Share the staff password only with people who should have staff access.

## Free-plan notes

Render's free web services go idle after 15 minutes without traffic and can take about a minute to wake on the next visit. Atlas is a separate account and database; keep its connection credentials private. Free plans are suitable for a class demo, not a production service holding real student or institutional data.
