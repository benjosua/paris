# Paris

Paris is a robust meetup API built on [Payload](https://payloadcms.com) and [Next.js](https://nextjs.org). It features an admin panel, strict authentication, a clean API, event organization with groups and tags, and calendar integration via ICS streams.

## Quick Start

To get started with Paris, follow these steps:

1. Clone the repository and navigate to the project root using `cd`.
2. Copy `.env.example` to `.env` and update your environment variables.
3. Run `yarn` and then `yarn dev` (or use Docker Compose; see [Docker](#docker)
   below).
4. Open http://localhost:3000/admin in your web browser to access the admin panel.
5. Create your first admin user using the form on the page.

That's it! Any changes you make in the `./src` directory will be reflected in your
app.

## Docker

Alternatively, you can use Docker to spin up Paris locally. To do so:

1. Follow steps 1-2 from above.
2. Run `docker-compose up`.
3. Access the admin panel at http://localhost:3000/admin and create your first admin
   user.

This approach helps standardize the development environment across your team while
ensuring a robust and secure setup.

## Production

To deploy Paris in production, follow these steps:

1. Run `pnpm run build` to generate a production-ready admin bundle.
2. Run `pnpm run serve` to start Node.js in production mode and serve Payload from
   the generated build directory.

## API Routes

### Events

- `GET /api/events`
- `POST /api/events`
- `GET /api/events/:id`
- `PUT /api/events/:id`
- `DELETE /api/events/:id`

### Groups

- `GET /api/groups`
- `POST /api/groups`
- `GET /api/groups/:id`
- `PUT /api/groups/:id`
- `DELETE /api/groups/:id`

### Tags

- `GET /api/tags`
- `POST /api/tags`
- `GET /api/tags/:id`
- `PUT /api/tags/:id`
- `DELETE /api/tags/:id`

### Users

- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

## Calendar Integration

The `/cal` endpoint generates ICS files for calendar integration. It supports filtering by group, geo, id, or tag.

Usage: `/cal?[group|geo|id|tag]=[value]`

Examples:

- Group events: `/cal?group=meetup-group`
- Geo-based events: `/cal?geo=-122.084051,37.385347`
- Single event: `/cal?id=12345`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on pull requests, issue reporting, and improvements.

## License

This project is licensed under the GNU General Public License v3.0 (GPLv3).

### What this means:

- You are free to use, modify, and distribute this software.
- If you distribute modified versions of this software, you must release the entire source code of your modifications under the GPLv3.
- If you incorporate this software into a larger project, the entire project must be released under the GPLv3.
- You must include the full text of the GPL license in any distribution of this software or derivative works.

### Why we chose GPLv3:

We believe in the principles of free and open-source software. By using the GPLv3, we ensure that this project and any derivatives remain open and accessible to the community.

### For more information:

- [Full text of the GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html)
- [Understanding the GPL](https://www.gnu.org/licenses/quick-guide-gplv3.html)

If you have any questions about how this license applies to your use case, please open an issue for discussion.
