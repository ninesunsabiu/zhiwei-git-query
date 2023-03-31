import { OpenAPIRoute, type OpenAPISchema, Path, Query, Str } from '@cloudflare/itty-router-openapi';
import { getSignedRequest } from './Signature';
import type { EnvBinding } from './env';

export class ListRepoBranch extends OpenAPIRoute {
    static schema: OpenAPISchema = {
        tags: ['Branch'],
        summary: 'Get branch list of specific repo',
        parameters: {
            repoId: Path(Str, {
                description: 'repo id'
            }),
            keyword: Query(Str, {
                required: false,
                description: 'filter the result by branch name'
            })
        },
        responses: {
            '200': {
                schema: [Str]
            }
        }
    };

    async handle(_req: unknown, env: EnvBinding, _context: unknown, data: Record<'repoId' | 'keyword', any>) {
        const { repoId, keyword } = data;

        const host = 'devops.cn-hangzhou.aliyuncs.com';
        const pathname = `/repository/${repoId}/branches`;

        const query = {
            organizationId: '624512b53add99e4db45a10d',
            ...(keyword ? { search: keyword } : {})
        };

        return fetch(
            ...getSignedRequest(env.accessKeyId, env.accessSecurity)(pathname, 'GET', {
                headers: {
                    host,
                    action: 'ListRepositoryBranches',
                    version: '2021-06-25'
                },
                param: query
            })
        )
            .then((response) => response.json())
            .then((result) => (result as { result: Array<{ name: string }> }).result.map((it) => it.name));
    }
}
