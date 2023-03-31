import { OpenAPIRouter } from '@cloudflare/itty-router-openapi';
import * as pck from '../package.json';
import { ListRepoBranch } from './ListRepoBranches';

const router = OpenAPIRouter({
  schema: {
    info: {
      title: 'Zhiwei Git query',
      version: pck.version,
    },
  },
});

router.get?.('/api/git/:repoId', ListRepoBranch)

// Redirect root request to the /docs page
router.original.get?.('/', request => Response.redirect(`${request.url}docs`, 302));

// 404 for everything else
router.all?.('*', () => new Response('Not Found.', { status: 404 }));

export default {
  fetch: router.handle,
};
